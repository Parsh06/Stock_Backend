const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const axios = require('axios');

/**
 * GET /backend/scraper
 * Run Python scraper and return output
 * On Vercel: Uses Python serverless function
 * On local: Spawns Python process directly
 */
router.get('/scraper', async (req, res) => {
  try {
    console.log(
      "🐍 Scraper requested via GET at:",
      new Date().toISOString()
    );

    // Check if we're on Vercel
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    
    if (isVercel) {
      console.log("🌐 Detected Vercel environment - using Python serverless function");
      
      // On Vercel, call the Python serverless function
      const vercelUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'https://stock-backend-mu.vercel.app';
      
      const pythonFunctionUrl = `${vercelUrl}/api/scraper`;
      
      console.log(`📡 Calling Python function at: ${pythonFunctionUrl}`);
      
      try {
        const response = await axios.get(pythonFunctionUrl, {
          timeout: 60000, // 60 seconds timeout
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        
        if (response.status === 200) {
          return res.status(200).json({
            success: true,
            message: "Scraper executed successfully via Python serverless function",
            ...data,
            timestamp: new Date().toISOString(),
          });
        } else {
          return res.status(response.status).json({
            success: false,
            error: data.error || "Scraper execution failed",
            message: data.message || "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      } catch (axiosError) {
        console.error("❌ Error calling Python function:", axiosError.message);
        
        // Handle timeout specifically
        if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
          return res.status(408).json({
            success: false,
            error: "Scraper timeout",
            message: "The scraper execution exceeded the timeout limit",
            note: "Vercel functions have timeout limits (10s free tier, 60s pro tier). The scraper may need more time.",
            timestamp: new Date().toISOString(),
          });
        }
        
        return res.status(500).json({
          success: false,
          error: "Failed to call Python serverless function",
          message: axiosError.message,
          note: "The scraper may have timed out due to Vercel's function timeout limits (10s free, 60s pro)",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Local development: spawn Python process directly
    console.log("💻 Local environment detected - spawning Python process");
    console.log("🚀 Starting Python scraper script...");

    // Set timeout for the entire operation (10 minutes)
    const SCRIPT_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

    const startTime = Date.now();

    // Run Python script
    const pythonScript = path.join(__dirname, '..', 'scripts', 'scraper.py');

    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      console.error("❌ Python script not found:", pythonScript);
      return res.status(500).json({
        error: "Script not found",
        message: "Scraper script is missing from server",
        timestamp: new Date().toISOString(),
      });
    }

    // Try different Python commands
    const pythonCommands = ["python", "python3", "py"];
    let pythonProcess = null;
    let processStarted = false;

    for (const pythonCmd of pythonCommands) {
      try {
        pythonProcess = spawn(pythonCmd, [pythonScript], {
          cwd: path.join(__dirname, '..'),
          env: {
            ...process.env,
          },
        });

        console.log(`✅ Python process started with command: ${pythonCmd}`);
        processStarted = true;
        break;
      } catch (error) {
        console.log(`⚠️  Failed to start with ${pythonCmd}: ${error.message}`);
        continue;
      }
    }

    if (!processStarted || !pythonProcess) {
      console.error("❌ Could not start Python process with any command");
      return res.status(500).json({
        error: "Python runtime not available",
        message:
          "Could not execute Python script. Please ensure Python is installed.",
        timestamp: new Date().toISOString(),
      });
    }

    let stdout = "";
    let stderr = "";
    let isCompleted = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        console.error("❌ Python script timeout after 10 minutes");
        pythonProcess.kill("SIGTERM");
        if (!res.headersSent) {
          res.status(408).json({
            error: "Script timeout",
            message: "The scraping operation took too long and was terminated",
            timeout: "10 minutes",
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, SCRIPT_TIMEOUT);

    // Collect output
    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`🐍 Python: ${output.trim()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      const error = data.toString();
      stderr += error;
      console.error(`🐍 Python Error: ${error.trim()}`);
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      clearTimeout(timeoutId);
      isCompleted = true;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `🐍 Python script completed in ${duration}s with exit code: ${code}`
      );

      if (res.headersSent) {
        console.log("⚠️  Response already sent, skipping duplicate response");
        return;
      }

      try {
        if (code === 0) {
          // Try to parse the result from stdout
          let scriptResult = null;
          try {
            // Look for JSON in the last part of stdout
            const lines = stdout.trim().split("\n");
            const lastLine = lines[lines.length - 1];

            if (lastLine.startsWith("{")) {
              scriptResult = JSON.parse(lastLine);
            } else {
              // Fallback: create a basic result
              scriptResult = {
                success: true,
                message: "Script completed successfully",
              };
            }
          } catch (parseError) {
            console.warn("⚠️  Could not parse script result, using default");
            scriptResult = {
              success: true,
              message: "Script completed successfully",
            };
          }

          console.log("✅ Scraper completed successfully");
          res.status(200).json({
            success: true,
            message: "Scraper executed successfully",
            duration: `${duration}s`,
            exitCode: code,
            output: stdout.trim(),
            scriptResult: scriptResult,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error("❌ Python script failed with code:", code);
          res.status(500).json({
            success: false,
            error: "Script execution failed",
            message: "The Python scraper script encountered an error",
            exitCode: code,
            duration: `${duration}s`,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            timestamp: new Date().toISOString(),
          });
        }
      } catch (responseError) {
        console.error("❌ Error sending response:", responseError);
      }
    });

    pythonProcess.on("error", (error) => {
      clearTimeout(timeoutId);
      isCompleted = true;

      console.error("❌ Python process error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Script execution error",
          message: "Failed to execute Python scraper script",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  } catch (error) {
    console.error("❌ Error in scraper endpoint:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to initialize scraping process",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
});

module.exports = router;

