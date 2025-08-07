@echo off
echo 🚀 Stock Data Update Automation
echo ================================

echo.
echo 🐍 Step 1: Running Python scraper...
python ipo_scraper_final.py
if %errorlevel% neq 0 (
    echo ❌ Python scraper failed with exit code %errorlevel%
    pause
    exit /b %errorlevel%
)

echo.
echo 📤 Step 2: Uploading data to Vercel...
node upload_data.js
if %errorlevel% neq 0 (
    echo ❌ Data upload failed with exit code %errorlevel%
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Stock data update completed successfully!
echo 📊 Data is now available on your Vercel API
pause
