"""
Vercel Python Serverless Function for Running Scraper
This function wraps the scraper.py script to run on Vercel's Python runtime
"""
import os
import sys
import json
import subprocess
from pathlib import Path
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    """
    Vercel Python serverless function handler
    Note: Vercel functions have timeout limits (10s free, 60s pro)
    Web scraping may exceed these limits
    """
    
    def do_GET(self):
        try:
            # Get the path to the scraper script
            # On Vercel, files are in /var/task
            current_dir = Path(__file__).parent
            backend_dir = current_dir.parent / "backend"
            
            # If backend doesn't exist in parent, try current directory
            if not backend_dir.exists():
                backend_dir = current_dir / "backend"
            
            scraper_script = backend_dir / "scripts" / "scraper.py"
            
            # Try Vercel's file system paths
            if not scraper_script.exists():
                alt_paths = [
                    Path("/var/task/backend/scripts/scraper.py"),
                    Path("/var/task/scripts/scraper.py"),
                    Path(os.getcwd()) / "backend" / "scripts" / "scraper.py",
                ]
                
                for alt_path in alt_paths:
                    if alt_path.exists():
                        scraper_script = alt_path
                        backend_dir = alt_path.parent.parent
                        break
            
            if not scraper_script.exists():
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {
                    'success': False,
                    'error': 'Scraper script not found',
                    'message': f'Scraper script not found. Searched: {scraper_script}',
                    'cwd': os.getcwd(),
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return
            
            # Run the Python scraper script
            # Note: This may timeout on Vercel free tier (10s limit)
            process = subprocess.Popen(
                [sys.executable, str(scraper_script)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=str(backend_dir)
            )
            
            stdout, stderr = process.communicate(timeout=50)  # 50 second timeout for Pro tier
            
            if process.returncode == 0:
                # Try to parse JSON result from stdout
                try:
                    # Look for JSON in the output
                    lines = stdout.strip().split('\n')
                    json_line = None
                    for line in reversed(lines):
                        if line.strip().startswith('{'):
                            json_line = line.strip()
                            break
                    
                    if json_line:
                        result = json.loads(json_line)
                    else:
                        result = {'message': 'Scraper completed', 'output': stdout[:500]}
                except:
                    result = {'message': 'Scraper completed', 'output': stdout[:500]}
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {
                    'success': True,
                    'message': 'Scraper executed successfully',
                    'result': result,
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {
                    'success': False,
                    'error': 'Scraper execution failed',
                    'message': stderr[:500] if stderr else 'Unknown error',
                    'stdout': stdout[:500] if stdout else '',
                    'stderr': stderr[:500] if stderr else '',
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
        except subprocess.TimeoutExpired:
            self.send_response(408)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'success': False,
                'error': 'Scraper timeout',
                'message': 'Scraper execution exceeded timeout limit. This may be due to Vercel function timeout limits (10s free, 60s pro).',
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            import traceback
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'success': False,
                'error': 'Scraper execution failed',
                'message': str(e),
                'traceback': traceback.format_exc()[:500],
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

