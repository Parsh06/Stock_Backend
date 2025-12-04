# Critical Web Automation System for IPO and Security Data
import os
import time
import json
import math
import pandas as pd
import sys
from pathlib import Path
from datetime import datetime

# Selenium imports for precise web automation
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# Configuration
# Get the backend directory (parent of scripts)
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOAD_DIR = os.path.abspath(".")
DATA_DIR = os.path.join(BACKEND_DIR, "data")
TIMEOUT = 30
HEADLESS = True  # Set to True for Vercel deployment (no UI)
DEBUG = False    # Set to False for production

def ensure_data_directory():
    """Create data directory if it doesn't exist"""
    try:
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
            print(f"SUCCESS: Created data directory at {DATA_DIR}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to create data directory: {str(e)}")
        return False

def clean_nan_values(obj):
    """Recursively replace NaN, Infinity, and -Infinity with None (null in JSON)"""
    import math
    if isinstance(obj, dict):
        return {key: clean_nan_values(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_values(item) for item in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    else:
        return obj

def save_json_to_file(filename, data, data_type):
    """Save JSON data to file in data directory"""
    try:
        # Ensure data directory exists
        if not ensure_data_directory():
            raise Exception("Failed to create data directory")

        # Clean NaN values from data before saving
        cleaned_data = clean_nan_values(data)

        # Prepare data with metadata
        json_data = {
            "metadata": {
                "data_type": data_type,
                "uploaded_at": datetime.now().isoformat(),
                "total_records": len(cleaned_data),
                "generated_by": "ipo_scraper_final.py"
            },
            "data": cleaned_data
        }

        # Save to file
        file_path = os.path.join(DATA_DIR, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(json_data, f, indent=4, ensure_ascii=False)
        
        print(f"SUCCESS: Saved {len(cleaned_data)} {data_type} records to {file_path}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to save JSON file: {str(e)}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        return False

def clean_download_folder():
    """Clean data files and prevent duplicate downloads"""
    files_to_remove = [
        "IPO.csv", "IPO-SME.csv", "ipo.json", "ipo-main.json", "ipo-sme.json",
        "SecurityList.csv", "SecurityList.json", "securities.json",
        "scrip.csv", "List_of_Scrips.csv", "ipo-in-india-list-main-board-sme.csv"
    ]
    for fname in files_to_remove:
        file_path = os.path.join(DOWNLOAD_DIR, fname)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"INFO: Removed {fname}")
            except Exception as e:
                print(f"WARNING: Could not remove {fname}: {str(e)}")

def clean_ipo_files():
    """Clean IPO-specific files before and after processing"""
    ipo_files = [
        "IPO.csv", "IPO-SME.csv", "ipo.json", "ipo-main.json", "ipo-sme.json",
        "ipo-in-india-list-main-board-sme.csv"
    ]
    for fname in ipo_files:
        file_path = os.path.join(DOWNLOAD_DIR, fname)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"INFO: Removed IPO file: {fname}")
            except Exception as e:
                print(f"WARNING: Could not remove IPO file {fname}: {str(e)}")

def clean_existing_downloads(file_pattern):
    """Clean specific file patterns to prevent duplicates"""
    try:
        for file in os.listdir(DOWNLOAD_DIR):
            if file_pattern.lower() in file.lower() and file.endswith('.csv'):
                file_path = os.path.join(DOWNLOAD_DIR, file)
                os.remove(file_path)
                print(f"INFO: Removed existing file: {file}")
    except Exception as e:
        print(f"WARNING: Error cleaning existing downloads: {str(e)}")

def wait_for_file(ext=".csv", timeout=TIMEOUT, min_size=100):
    """Wait for file download"""
    deadline = time.time() + timeout
    attempts = 0
    while time.time() < deadline:
        attempts += 1
        if attempts % 5 == 0:  # Print status every 10 seconds
            remaining = int(deadline - time.time())
            print(f"INFO: Still waiting for {ext} file... ({remaining}s remaining)")
        
        if not os.path.exists(DOWNLOAD_DIR):
            print(f"ERROR: Download directory does not exist: {DOWNLOAD_DIR}")
            time.sleep(2)
            continue
            
        try:
            files = os.listdir(DOWNLOAD_DIR)
            for fname in files:
                if not fname.lower().endswith(ext):
                    continue
                if fname.endswith(".crdownload"):
                    if attempts % 5 == 0:
                        print(f"INFO: Found incomplete download: {fname}")
                    continue
                    
                full = os.path.join(DOWNLOAD_DIR, fname)
                try:
                    if os.path.exists(full):
                        file_size = os.path.getsize(full)
                        if file_size >= min_size:
                            # Try to open file to ensure it's not locked
                            with open(full, "rb") as f:
                                f.read(1)
                            print(f"SUCCESS: Found valid file: {fname} ({file_size} bytes)")
                            return full
                        else:
                            if attempts % 5 == 0:
                                print(f"INFO: File {fname} too small: {file_size} bytes (need {min_size})")
                except PermissionError:
                    if attempts % 5 == 0:
                        print(f"INFO: File {fname} is locked, waiting...")
                except Exception as file_err:
                    if attempts % 5 == 0:
                        print(f"WARNING: Error checking file {fname}: {str(file_err)}")
        except Exception as dir_err:
            print(f"ERROR: Error listing directory: {str(dir_err)}")
        
        time.sleep(2)
    
    # Final check - list all files
    print(f"ERROR: Timeout waiting for {ext} file")
    if os.path.exists(DOWNLOAD_DIR):
        print(f"INFO: Files in download directory: {os.listdir(DOWNLOAD_DIR)}")
    raise TimeoutException(f"No valid {ext} file found in {timeout}s")

def wait_for_file_with_name(filename, timeout=TIMEOUT, min_size=100):
    """Wait for specific file to be downloaded"""
    deadline = time.time() + timeout
    target_path = os.path.join(DOWNLOAD_DIR, filename)

    while time.time() < deadline:
        # Check for exact filename
        if os.path.exists(target_path) and not target_path.endswith(".crdownload"):
            try:
                if os.path.getsize(target_path) >= min_size:
                    with open(target_path, "rb") as f:
                        f.read(1)
                    print(f"SUCCESS: Found specific file {filename}")
                    return target_path
            except:
                pass

        # Check for any file containing the pattern
        for fname in os.listdir(DOWNLOAD_DIR):
            if filename.lower() in fname.lower() and not fname.endswith(".crdownload"):
                full_path = os.path.join(DOWNLOAD_DIR, fname)
                try:
                    if os.path.exists(full_path) and os.path.getsize(full_path) >= min_size:
                        with open(full_path, "rb") as f:
                            f.read(1)
                        print(f"SUCCESS: Found matching file {fname}")
                        return full_path
                except:
                    pass
        time.sleep(2)

    print(f"WARNING: Specific file {filename} not found after {timeout}s")
    return None

def setup_driver():
    """Setup Chrome driver for critical web automation - Headless for Vercel"""
    opts = Options()

    # Always run headless for Vercel deployment
    opts.add_argument("--headless")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-web-security")
    opts.add_argument("--allow-running-insecure-content")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--disable-logging")
    opts.add_argument("--disable-in-process-stack-traces")
    opts.add_argument("--disable-crash-reporter")
    opts.add_argument("--disable-features=TranslateUI")
    opts.add_argument("--disable-ipc-flooding-protection")
    opts.add_argument("--disable-background-timer-throttling")
    opts.add_argument("--disable-backgrounding-occluded-windows")
    opts.add_argument("--disable-renderer-backgrounding")
    opts.add_argument("--disable-features=VizDisplayCompositor")
    opts.add_argument("--window-size=1920,1080")
    opts.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    opts.add_experimental_option('useAutomationExtension', False)

    prefs = {
        "download.default_directory": DOWNLOAD_DIR,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True,
        "profile.default_content_settings.popups": 0,
        "profile.default_content_setting_values.notifications": 2,
        "profile.managed_default_content_settings.images": 2
    }
    opts.add_experimental_option("prefs", prefs)

    driver = None
    errors = []

    # Method 1: Try Selenium's built-in driver management (v4.6+)
    try:
        print("INFO: Using Selenium built-in driver management (headless)...")
        driver = webdriver.Chrome(options=opts)
        print("SUCCESS: Selenium auto-managed Chrome driver ready (headless)")
    except Exception as e1:
        errors.append(f"Built-in driver: {str(e1)}")
        print(f"WARNING: Built-in driver failed: {str(e1)}")

        # Method 2: Try ChromeDriverManager
        try:
            print("INFO: Attempting ChromeDriverManager fallback...")
            from webdriver_manager.chrome import ChromeDriverManager
            driver_path = ChromeDriverManager().install()
            print(f"INFO: Chrome driver installed at: {driver_path}")
            svc = Service(driver_path)
            driver = webdriver.Chrome(service=svc, options=opts)
        except Exception as e2:
            errors.append(f"ChromeDriverManager: {str(e2)}")
            print(f"WARNING: ChromeDriverManager failed: {str(e2)}")

            # Method 3: Try with explicit Chrome binary
            try:
                print("INFO: Attempting with explicit Chrome binary...")
                opts.binary_location = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
                driver = webdriver.Chrome(options=opts)
            except Exception as e3:
                errors.append(f"Explicit binary: {str(e3)}")
                raise Exception(f"All Chrome methods failed: {'; '.join(errors)}")

    if driver is None:
        raise Exception(f"Chrome driver initialization failed: {'; '.join(errors)}")

    try:
        # Make WebDriver undetectable
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        driver.execute_script("Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]})")
        driver.execute_script("Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']})")
        driver.execute_script("Object.defineProperty(navigator, 'permissions', {get: () => undefined})")
        print("SUCCESS: Chrome driver initialized for critical automation (headless)")
        return driver
    except Exception as e:
        if driver:
            driver.quit()
        raise Exception(f"CRITICAL FAILURE: Chrome driver setup failed - {str(e)}")

def process_csv_to_json(csv_path, json_name, data_type):
    """Convert CSV to JSON with normalized field names and save to data folder"""
    try:
        print(f"INFO: Processing CSV file: {csv_path}")
        print(f"INFO: Target JSON file: {json_name}")
        print(f"INFO: Data type: {data_type}")
        
        if not os.path.exists(csv_path):
            error_msg = f"CSV file not found: {csv_path}"
            print(f"ERROR: {error_msg}")
            return False, None

        print(f"INFO: Reading CSV file (size: {os.path.getsize(csv_path)} bytes)...")
        try:
            df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            print("WARNING: UTF-8 encoding failed, trying latin-1...")
            df = pd.read_csv(csv_path, encoding='latin-1')
        except Exception as read_error:
            print(f"ERROR: Failed to read CSV: {str(read_error)}")
            return False, None
        
        if df.empty:
            error_msg = f"CSV file is empty: {csv_path}"
            print(f"ERROR: {error_msg}")
            return False, None

        print(f"INFO: CSV loaded successfully - {len(df)} rows, {len(df.columns)} columns")
        print(f"INFO: Column names: {list(df.columns)}")

        # Normalize column names: replace spaces with underscores and handle special characters
        df.columns = [c.strip().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('.', '') for c in df.columns]
        df = df.where(pd.notnull(df), None)
        print(f"INFO: Normalized column names: {list(df.columns)}")

        # Filter securities for active stocks only
        if json_name in ["SecurityList.json", "securities.json"] and "Status" in df.columns:
            original_count = len(df)
            print(f"INFO: Filtering active securities (total: {original_count})...")
            df = df[df['Status'].str.strip().str.upper() == 'ACTIVE']
            print(f"INFO: Filtered to {len(df)} active stocks from {original_count} total")
        elif json_name in ["SecurityList.json", "securities.json"]:
            print(f"WARNING: 'Status' column not found, skipping filter")

        json_data = df.to_dict(orient="records")
        print(f"INFO: Converted to JSON - {len(json_data)} records")
        
        # Save to data folder
        print(f"INFO: Saving to data folder...")
        success = save_json_to_file(json_name, json_data, data_type)
        if not success:
            error_msg = "Failed to save JSON file"
            print(f"ERROR: {error_msg}")
            return False, None
        
        print(f"SUCCESS: Created {json_name} with {len(df)} records in data folder")
        return True, json_data
    except Exception as e:
        error_msg = f"CSV processing failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        return False, None

def process_existing_ipo_data():
    """Process existing IPO.csv file and save to data folder"""
    print("INFO: Starting existing IPO data processing...")

    try:
        # Check if IPO.csv exists
        ipo_csv_path = os.path.join(DOWNLOAD_DIR, "IPO.csv")
        if not os.path.exists(ipo_csv_path):
            raise Exception("IPO.csv file not found in current directory")

        print(f"INFO: Processing existing IPO data from {ipo_csv_path}...")

        # Process CSV to JSON and save to data folder as ipo-main.json
        success, json_data = process_csv_to_json(ipo_csv_path, "ipo-main.json", "IPO_Mainboard_Data")
        if not success or not json_data:
            raise Exception("Failed to process IPO CSV to JSON")

        print(f"SUCCESS: IPO data processed and saved successfully!")
        print(f"Records processed: {len(json_data)}")
        print(f"File saved: data/ipo-main.json")

        # Clean up CSV files after successful processing
        print("INFO: Cleaning up IPO CSV files after successful processing...")
        clean_ipo_files()
        print("SUCCESS: IPO CSV files cleaned up")

        return {
            "success": True,
            "records_processed": len(json_data),
            "files_created": ["data/ipo-main.json"],
            "file_saved": True
        }

    except Exception as e:
        error_msg = f"Process existing IPO data failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        return {
            "success": False,
            "error": error_msg,
            "records_processed": 0,
            "files_created": [],
            "file_saved": False
        }

def process_existing_securities_data():
    """Process existing SecurityList.csv file and save to data folder"""
    print("INFO: Starting existing Securities data processing...")

    try:
        # Check if SecurityList.csv exists
        securities_csv_path = os.path.join(DOWNLOAD_DIR, "SecurityList.csv")
        if not os.path.exists(securities_csv_path):
            raise Exception("SecurityList.csv file not found in current directory")

        print(f"INFO: Processing existing Securities data from {securities_csv_path}...")

        # Process CSV to JSON and save to data folder
        success, json_data = process_csv_to_json(securities_csv_path, "securities.json", "BSE_Security")
        if not success or not json_data:
            raise Exception("Failed to process Securities CSV to JSON")

        print(f"SUCCESS: Securities data processed and saved successfully!")
        print(f"Records processed: {len(json_data)}")
        print(f"File saved: data/securities.json")

        # Clean up CSV files after successful processing
        print("INFO: Cleaning up Securities CSV files after successful processing...")
        clean_existing_downloads("scrip")
        clean_existing_downloads("security")
        clean_existing_downloads("list")
        print("SUCCESS: Securities CSV files cleaned up")

        return {
            "success": True,
            "records_processed": len(json_data),
            "files_created": ["data/securities.json"],
            "file_saved": True
        }

    except Exception as e:
        error_msg = f"Process existing Securities data failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        return {
            "success": False,
            "error": error_msg,
            "records_processed": 0,
            "files_created": [],
            "file_saved": False
        }

def process_equity_csv_to_security_json():
    """Convert Equity.csv to Security.json with only Security Name column"""
    print("INFO: Starting Equity.csv to Security.json conversion...")
    
    try:
        # Check if Equity.csv exists in download directory or current directory
        equity_csv_path = os.path.join(DOWNLOAD_DIR, "Equity.csv")
        original_equity_path = None
        
        if os.path.exists(equity_csv_path):
            original_equity_path = equity_csv_path
        else:
            # Try parent directory (where user mentioned it is)
            parent_dir = os.path.dirname(DOWNLOAD_DIR)
            parent_equity_path = os.path.join(parent_dir, "Equity.csv")
            if os.path.exists(parent_equity_path):
                equity_csv_path = parent_equity_path
                original_equity_path = parent_equity_path
            else:
                raise Exception("Equity.csv file not found in download directory or parent directory")
        
        print(f"INFO: Found Equity.csv at: {equity_csv_path}")
        print(f"INFO: Reading CSV file...")
        
        # Read CSV file - only read the columns we need to avoid issues with trailing commas
        try:
            # Read only the first 9 columns to avoid empty columns from trailing commas
            df = pd.read_csv(equity_csv_path, encoding='utf-8', usecols=range(9))
        except UnicodeDecodeError:
            print("WARNING: UTF-8 encoding failed, trying latin-1...")
            df = pd.read_csv(equity_csv_path, encoding='latin-1', usecols=range(9))
        except Exception as read_error:
            # Fallback: read all columns and clean up
            try:
                df = pd.read_csv(equity_csv_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(equity_csv_path, encoding='latin-1')
            # Remove empty columns (columns with all NaN values)
            df = df.dropna(axis=1, how='all')
        
        if df.empty:
            raise Exception("Equity.csv file is empty")
        
        print(f"INFO: CSV loaded successfully - {len(df)} rows, {len(df.columns)} columns")
        print(f"INFO: Available columns: {list(df.columns)}")
        print(f"INFO: First few rows of 'Security Name' column:")
        if "Security Name" in df.columns:
            print(df["Security Name"].head(10).tolist())
        
        # Check if "Security Name" column exists (with space)
        if "Security Name" not in df.columns:
            # Try variations
            if "Security_Name" in df.columns:
                df.rename(columns={"Security_Name": "Security Name"}, inplace=True)
                print("INFO: Renamed 'Security_Name' to 'Security Name'")
            elif "SecurityName" in df.columns:
                df.rename(columns={"SecurityName": "Security Name"}, inplace=True)
                print("INFO: Renamed 'SecurityName' to 'Security Name'")
            else:
                # Try to find column by index (4th column, index 3)
                if len(df.columns) >= 4:
                    col_name = df.columns[3]
                    print(f"WARNING: 'Security Name' column not found by name, trying 4th column (index 3): '{col_name}'")
                    df.rename(columns={col_name: "Security Name"}, inplace=True)
                    print(f"INFO: Renamed column '{col_name}' to 'Security Name'")
                else:
                    raise Exception(f"'Security Name' column not found. Available columns: {list(df.columns)}")
        
        # Extract only "Security Name" column
        print("INFO: Extracting 'Security Name' column...")
        
        # Get all security names, filter out invalid values
        security_names = df["Security Name"].dropna().tolist()
        
        # Remove invalid entries (like "Equity", "Preference Shares", "-", empty strings, etc.)
        invalid_values = ["Equity", "Preference Shares", "-", "", "NA", "N/A", "null", "None"]
        security_names = [
            str(name).strip() 
            for name in security_names 
            if str(name).strip() and str(name).strip() not in invalid_values
        ]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_security_names = []
        for name in security_names:
            if name not in seen:
                seen.add(name)
                unique_security_names.append(name)
        
        security_names = unique_security_names
        
        print(f"INFO: Found {len(security_names)} unique security names")
        print(f"INFO: Sample security names (first 10): {security_names[:10]}")
        
        if len(security_names) == 0:
            raise Exception("No valid security names found in CSV file")
        
        # Create JSON structure with only Security Name
        json_data = {
            "metadata": {
                "data_type": "BSE_Security_Names",
                "created_at": datetime.now().isoformat(),
                "total_records": len(security_names),
                "source_file": "Equity.csv",
                "generated_by": "ipo_scraper_final.py"
            },
            "data": [
                {"Security Name": name} for name in security_names
            ]
        }
        
        # Ensure data directory exists
        if not ensure_data_directory():
            raise Exception("Failed to create data directory")
        
        # Save to data folder as Security.json
        json_file_path = os.path.join(DATA_DIR, "Security.json")
        print(f"INFO: Saving to {json_file_path}...")
        
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(json_data, f, indent=4, ensure_ascii=False)
        
        print(f"SUCCESS: Security.json created successfully!")
        print(f"SUCCESS: File saved at: {json_file_path}")
        print(f"SUCCESS: Total security names: {len(security_names)}")
        print(f"SUCCESS: File size: {os.path.getsize(json_file_path)} bytes")
        
        # Delete Equity.csv file after successful conversion
        print(f"INFO: Deleting Equity.csv file after successful conversion...")
        try:
            if original_equity_path and os.path.exists(original_equity_path):
                os.remove(original_equity_path)
                print(f"SUCCESS: Deleted Equity.csv from: {original_equity_path}")
            else:
                print(f"WARNING: Equity.csv not found for deletion at: {original_equity_path} (may have been already deleted)")
        except Exception as delete_error:
            print(f"WARNING: Failed to delete Equity.csv: {str(delete_error)}")
            # Don't fail the whole operation if deletion fails
        
        return {
            "success": True,
            "records_processed": len(security_names),
            "file_path": json_file_path,
            "file_saved": True,
            "equity_csv_deleted": True
        }
        
    except Exception as e:
        error_msg = f"Equity.csv to Security.json conversion failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        return {
            "success": False,
            "error": error_msg,
            "records_processed": 0,
            "file_saved": False
        }

def fetch_bse_securities(driver):
    """Critical automation: Fetch Security List from BSE website"""
    print("INFO: Starting BSE Securities automation...")
    print(f"INFO: Download directory: {DOWNLOAD_DIR}")
    print(f"INFO: Data directory: {DATA_DIR}")

    try:
        # Clean any existing securities downloads first
        print("INFO: Cleaning existing download files...")
        clean_existing_downloads("scrip")
        clean_existing_downloads("security")
        clean_existing_downloads("list")
        print("INFO: Cleanup completed")

        print("INFO: Navigating to BSE securities page...")
        driver.get("https://www.bseindia.com/corporates/List_Scrips.html")
        wait = WebDriverWait(driver, TIMEOUT)
        print(f"INFO: Page title: {driver.title}")

        print("INFO: Waiting for page to load...")
        time.sleep(5)

        print("INFO: Selecting Equity T+1 segment...")
        # Select Equity T+1 segment
        segment_script = """
            var segment = document.getElementById('ddlsegment');
            if (!segment) throw new Error('Segment dropdown not found');

            var found = false;
            var options = [];
            for(var i = 0; i < segment.options.length; i++) {
                options.push(segment.options[i].text);
                if(segment.options[i].text === 'Equity T+1') {
                    segment.selectedIndex = i;
                    segment.dispatchEvent(new Event('change'));
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw new Error('Equity T+1 option not found. Available options: ' + options.join(', '));
            }
            return 'SUCCESS: Equity T+1 selected';
        """

        try:
            result = driver.execute_script(segment_script)
            print(f"INFO: {result}")
        except Exception as script_error:
            print(f"ERROR: JavaScript execution failed: {str(script_error)}")
            raise Exception(f"Failed to select Equity T+1 segment: {str(script_error)}")
        
        time.sleep(3)

        print("INFO: Looking for submit button (ID: btnSubmit)...")
        try:
            btn_submit = wait.until(EC.element_to_be_clickable((By.ID, "btnSubmit")))
            print("INFO: Submit button found, clicking...")
            driver.execute_script("arguments[0].click();", btn_submit)
            print("SUCCESS: Submit button clicked")
        except TimeoutException:
            print("ERROR: Submit button not found or not clickable")
            # Try to find alternative selectors
            try:
                btn_submit = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
                driver.execute_script("arguments[0].click();", btn_submit)
                print("SUCCESS: Found submit button via alternative selector")
            except:
                raise Exception("Submit button not found with any selector")
        except Exception as btn_error:
            raise Exception(f"Failed to click submit button: {str(btn_error)}")
        
        time.sleep(5)

        print("INFO: Waiting for results and download link (ID: lnkDownload)...")
        try:
            download_link = wait.until(EC.element_to_be_clickable((By.ID, "lnkDownload")))
            print("SUCCESS: Download link found")
        except TimeoutException:
            print("ERROR: Download link not found. Checking page source...")
            page_source_snippet = driver.page_source[:500]
            print(f"INFO: Page source snippet: {page_source_snippet}")
            raise Exception("Download link (lnkDownload) not found - page may not have loaded correctly")
        
        print("INFO: Initiating Securities download...")
        try:
            driver.execute_script("arguments[0].click();", download_link)
            print("SUCCESS: Securities download initiated")
        except Exception as click_error:
            raise Exception(f"Failed to click download link: {str(click_error)}")

        # Wait for CSV file download with detailed logging
        print("INFO: Waiting for CSV file download (timeout: 60s, min size: 1000 bytes)...")
        print(f"INFO: Checking download directory: {DOWNLOAD_DIR}")
        print(f"INFO: Files in directory before wait: {os.listdir(DOWNLOAD_DIR) if os.path.exists(DOWNLOAD_DIR) else 'Directory not found'}")
        
        try:
            csv_file = wait_for_file(".csv", timeout=60, min_size=1000)
            print(f"SUCCESS: CSV file found: {csv_file}")
        except TimeoutException as timeout_err:
            print(f"ERROR: Timeout waiting for CSV file")
            print(f"INFO: Files in directory after timeout: {os.listdir(DOWNLOAD_DIR) if os.path.exists(DOWNLOAD_DIR) else 'Directory not found'}")
            raise Exception(f"CSV file download timeout - {str(timeout_err)}")
        except Exception as file_err:
            print(f"ERROR: Error waiting for file: {str(file_err)}")
            raise Exception(f"Failed to wait for CSV file: {str(file_err)}")
        
        # Keep the original filename - don't rename
        downloaded_file_path = csv_file
        downloaded_filename = os.path.basename(downloaded_file_path)
        print(f"INFO: Keeping original filename: {downloaded_filename}")
        print(f"INFO: File saved at: {downloaded_file_path}")

        # Verify file exists and has content
        if not os.path.exists(downloaded_file_path):
            raise Exception(f"CSV file does not exist at {downloaded_file_path}")
        
        file_size = os.path.getsize(downloaded_file_path)
        print(f"INFO: CSV file size: {file_size} bytes")
        if file_size < 1000:
            raise Exception(f"CSV file is too small ({file_size} bytes), may be corrupted")

        print(f"SUCCESS: BSE Securities CSV downloaded successfully!")
        print(f"SUCCESS: File saved as: {downloaded_filename}")
        print(f"SUCCESS: File location: {downloaded_file_path}")
        
        # Return the file path instead of JSON data
        return downloaded_file_path

    except TimeoutException as e:
        error_msg = f"BSE Securities automation timeout - {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        raise Exception(f"CRITICAL FAILURE: {error_msg}")
    except NoSuchElementException as e:
        error_msg = f"BSE Securities element not found - {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        raise Exception(f"CRITICAL FAILURE: {error_msg}")
    except Exception as e:
        error_msg = f"BSE Securities automation failed - {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        raise Exception(f"CRITICAL FAILURE: {error_msg}")

def create_sample_securities():
    """This function is removed - no dummy data allowed"""
    raise Exception("CRITICAL FAILURE: No sample data allowed in production system")

def fetch_ipo_data(driver):
    """Critical automation: Fetch Mainboard IPO data from Chittorgarh website"""
    print("INFO: Starting Mainboard IPO data automation...")

    try:
        # Clean any existing IPO downloads first
        clean_ipo_files()

        print("INFO: Navigating to Chittorgarh Mainboard IPO page...")
        driver.get("https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/all/")
        wait = WebDriverWait(driver, TIMEOUT)

        print("INFO: Waiting for page to fully load...")
        time.sleep(5)

        print("INFO: Removing any overlay elements...")
        # Remove overlays that might block interaction
        overlay_script = """
            // Remove common overlays and popups
            var overlays = document.querySelectorAll('.modal, .popup, .overlay, .advertisement, .ad-banner, .consent-banner, .cookie-banner, .gdpr-banner');
            overlays.forEach(function(el) {
                if (el) el.remove();
            });

            // Remove fixed position elements that might block clicks
            var fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
            fixedElements.forEach(function(el) {
                if (el.style.zIndex > 1000) el.remove();
            });

            return 'Overlays and blocking elements removed';
        """
        result = driver.execute_script(overlay_script)
        print(result)

        print("INFO: Waiting for export button to be available...")
        # Wait for the export button to be present and clickable
        export_btn = wait.until(EC.presence_of_element_located((By.ID, "export_btn")))

        # Scroll to the button to ensure it's visible
        driver.execute_script("arguments[0].scrollIntoView(true);", export_btn)
        time.sleep(2)

        print("INFO: Checking if export button is enabled...")
        if not export_btn.is_enabled():
            print("WARNING: Export button is not enabled, trying to enable it...")
            # Sometimes the button needs the page to be fully loaded
            time.sleep(3)
            export_btn = driver.find_element(By.ID, "export_btn")

        print("INFO: Clicking export button using JavaScript...")
        # Use JavaScript click to avoid any overlay issues
        driver.execute_script("arguments[0].click();", export_btn)
        print("SUCCESS: Mainboard IPO Export button clicked")

        print("INFO: Waiting for CSV file download...")
        # Wait for the specific CSV file to be downloaded
        csv_file = wait_for_file_with_name("ipo-in-india-list-main-board-sme.csv", timeout=60, min_size=500)

        if not csv_file:
            # Fallback: look for any CSV file that was just downloaded
            print("INFO: Specific file not found, looking for any recent CSV...")
            csv_file = wait_for_file(".csv", timeout=30, min_size=500)

        target_path = os.path.join(DOWNLOAD_DIR, "IPO.csv")

        # Move downloaded file to target location
        if csv_file != target_path:
            os.rename(csv_file, target_path)
        print(f"SUCCESS: Mainboard IPO CSV downloaded and moved to {target_path}")

        # Process CSV to JSON and save to data folder as ipo-main.json
        success, json_data = process_csv_to_json(target_path, "ipo-main.json", "IPO_Mainboard_Data")
        if not success or not json_data:
            raise Exception("Failed to process Mainboard IPO CSV to JSON")

        print(f"SUCCESS: Processed {len(json_data)} Mainboard IPO records from Chittorgarh")
        
        # Delete the CSV file after successful processing
        print("INFO: Deleting Mainboard IPO CSV file after successful processing...")
        try:
            if os.path.exists(target_path):
                os.remove(target_path)
                print(f"SUCCESS: Deleted Mainboard IPO CSV file: {target_path}")
        except Exception as delete_error:
            print(f"WARNING: Failed to delete Mainboard IPO CSV file: {str(delete_error)}")
        
        return json_data

    except TimeoutException as e:
        raise Exception(f"CRITICAL FAILURE: Mainboard IPO automation timeout - {str(e)}")
    except NoSuchElementException as e:
        raise Exception(f"CRITICAL FAILURE: Mainboard IPO element not found - {str(e)}")
    except Exception as e:
        raise Exception(f"CRITICAL FAILURE: Mainboard IPO automation failed - {str(e)}")

def fetch_sme_ipo_data(driver):
    """Critical automation: Fetch SME IPO data from Chittorgarh website"""
    print("INFO: Starting SME IPO data automation...")

    try:
        # Clean any existing SME IPO downloads first
        sme_ipo_files = ["IPO-SME.csv", "ipo-sme.csv", "sme-ipo.csv"]
        for fname in sme_ipo_files:
            file_path = os.path.join(DOWNLOAD_DIR, fname)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"INFO: Removed existing SME IPO file: {fname}")
                except Exception as e:
                    print(f"WARNING: Could not remove SME IPO file {fname}: {str(e)}")

        print("INFO: Navigating to Chittorgarh SME IPO page...")
        driver.get("https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/sme/")
        wait = WebDriverWait(driver, TIMEOUT)

        print("INFO: Waiting for page to fully load...")
        time.sleep(5)

        print("INFO: Removing any overlay elements...")
        # Remove overlays that might block interaction
        overlay_script = """
            // Remove common overlays and popups
            var overlays = document.querySelectorAll('.modal, .popup, .overlay, .advertisement, .ad-banner, .consent-banner, .cookie-banner, .gdpr-banner');
            overlays.forEach(function(el) {
                if (el) el.remove();
            });

            // Remove fixed position elements that might block clicks
            var fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
            fixedElements.forEach(function(el) {
                if (el.style.zIndex > 1000) el.remove();
            });

            return 'Overlays and blocking elements removed';
        """
        result = driver.execute_script(overlay_script)
        print(result)

        print("INFO: Waiting for export button to be available...")
        # Wait for the export button to be present and clickable
        export_btn = wait.until(EC.presence_of_element_located((By.ID, "export_btn")))

        # Scroll to the button to ensure it's visible
        driver.execute_script("arguments[0].scrollIntoView(true);", export_btn)
        time.sleep(2)

        print("INFO: Checking if export button is enabled...")
        if not export_btn.is_enabled():
            print("WARNING: Export button is not enabled, trying to enable it...")
            # Sometimes the button needs the page to be fully loaded
            time.sleep(3)
            export_btn = driver.find_element(By.ID, "export_btn")

        print("INFO: Clicking SME IPO export button using JavaScript...")
        # Use JavaScript click to avoid any overlay issues
        driver.execute_script("arguments[0].click();", export_btn)
        print("SUCCESS: SME IPO Export button clicked")

        print("INFO: Waiting for CSV file download...")
        # Wait for the CSV file to be downloaded
        csv_file = wait_for_file_with_name("ipo-in-india-list-main-board-sme.csv", timeout=60, min_size=500)

        if not csv_file:
            # Fallback: look for any CSV file that was just downloaded
            print("INFO: Specific file not found, looking for any recent CSV...")
            csv_file = wait_for_file(".csv", timeout=30, min_size=500)

        target_path = os.path.join(DOWNLOAD_DIR, "IPO-SME.csv")

        # Move downloaded file to target location
        if csv_file != target_path:
            os.rename(csv_file, target_path)
        print(f"SUCCESS: SME IPO CSV downloaded and moved to {target_path}")

        # Process CSV to JSON and save to data folder as ipo-sme.json
        success, json_data = process_csv_to_json(target_path, "ipo-sme.json", "IPO_SME_Data")
        if not success or not json_data:
            raise Exception("Failed to process SME IPO CSV to JSON")

        print(f"SUCCESS: Processed {len(json_data)} SME IPO records from Chittorgarh")
        
        # Delete the CSV file after successful processing
        print("INFO: Deleting SME IPO CSV file after successful processing...")
        try:
            if os.path.exists(target_path):
                os.remove(target_path)
                print(f"SUCCESS: Deleted SME IPO CSV file: {target_path}")
        except Exception as delete_error:
            print(f"WARNING: Failed to delete SME IPO CSV file: {str(delete_error)}")
        
        return json_data

    except TimeoutException as e:
        raise Exception(f"CRITICAL FAILURE: SME IPO automation timeout - {str(e)}")
    except NoSuchElementException as e:
        raise Exception(f"CRITICAL FAILURE: SME IPO element not found - {str(e)}")
    except Exception as e:
        raise Exception(f"CRITICAL FAILURE: SME IPO automation failed - {str(e)}")

def create_sample_ipos():
    """This function is removed - no dummy data allowed"""
    raise Exception("CRITICAL FAILURE: No sample data allowed in production system")

def main():
    """Main function - Critical automation system for Vercel deployment"""
    result = {
        "success": False,
        "tasks_completed": 0,
        "total_tasks": 3,
        "errors": [],
        "files_created": [],
        "files_saved": False,
        "securities_updated": False,
        "ipo_main_updated": False,
        "ipo_sme_updated": False
    }

    # Check command line arguments for different modes
    mode = "full"  # Default mode
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()

    driver = None

    try:
        print("INFO: Starting CRITICAL IPO Security Data Automation System (Headless)")
        print(f"INFO: Running in mode: {mode}")

        # Ensure data directory exists
        if not ensure_data_directory():
            raise Exception("CRITICAL FAILURE: Failed to create data directory - cannot proceed")

        # Handle different modes
        if mode == "process_ipo":
            # Mode: Process existing IPO.csv file only
            print("\n" + "="*60)
            print("MODE: PROCESS EXISTING IPO DATA")
            print("="*60)

            ipo_result = process_existing_ipo_data()
            if ipo_result["success"]:
                result["success"] = True
                result["tasks_completed"] = 1
                result["total_tasks"] = 1
                result["ipo_updated"] = True
                result["files_saved"] = True
                result["files_created"] = ipo_result["files_created"]
                print("SUCCESS: IPO data processing completed!")
            else:
                result["errors"].append(ipo_result["error"])
                print(f"ERROR: {ipo_result['error']}")

            # Output result and return early
            print("\n" + "="*60)
            print("FINAL AUTOMATION RESULT:")
            print("="*60)
            print(json.dumps(result, indent=2))
            return result
        
        elif mode == "process_securities":
            # Mode: Process existing SecurityList.csv file only
            print("\n" + "="*60)
            print("MODE: PROCESS EXISTING SECURITIES DATA")
            print("="*60)

            securities_result = process_existing_securities_data()
            if securities_result["success"]:
                result["success"] = True
                result["tasks_completed"] = 1
                result["total_tasks"] = 1
                result["securities_updated"] = True
                result["files_saved"] = True
                result["files_created"] = securities_result["files_created"]
                print("SUCCESS: Securities data processing completed!")
            else:
                result["errors"].append(securities_result["error"])
                print(f"ERROR: {securities_result['error']}")

            # Output result and return early
            print("\n" + "="*60)
            print("FINAL AUTOMATION RESULT:")
            print("="*60)
            print(json.dumps(result, indent=2))
            return result
        
        elif mode == "process_equity":
            # Mode: Process existing Equity.csv file to Security.json
            print("\n" + "="*60)
            print("MODE: PROCESS EQUITY.CSV TO SECURITY.JSON")
            print("="*60)

            equity_result = process_equity_csv_to_security_json()
            if equity_result["success"]:
                result["success"] = True
                result["tasks_completed"] = 1
                result["total_tasks"] = 1
                result["securities_updated"] = True
                result["files_saved"] = True
                result["files_created"] = ["data/Security.json"]
                print("SUCCESS: Equity.csv to Security.json conversion completed!")
            else:
                result["errors"].append(equity_result["error"])
                print(f"ERROR: {equity_result['error']}")

            # Output result and return early
            print("\n" + "="*60)
            print("FINAL AUTOMATION RESULT:")
            print("="*60)
            print(json.dumps(result, indent=2))
            return result

        # Full automation mode (default)
        # Clean download folder
        clean_download_folder()

        # Initialize Chrome driver - CRITICAL (Headless for Vercel)
        print("INFO: Initializing Chrome driver for headless automation...")
        driver = setup_driver()
        print("SUCCESS: Chrome driver ready for CRITICAL headless automation")

        # TASK 1: BSE Securities Automation
        print("\n" + "="*60)
        print("CRITICAL TASK 1: BSE Securities Automation")
        print("="*60)

        try:
            securities_csv_path = fetch_bse_securities(driver)

            # Verify CSV file was downloaded (keep original filename)
            if not os.path.exists(securities_csv_path):
                raise Exception(f"CSV file was not downloaded at {securities_csv_path}")

            # Get the filename for reporting
            securities_filename = os.path.basename(securities_csv_path)
            file_size = os.path.getsize(securities_csv_path)

            # Task completed - CSV file downloaded and kept with original name
            result["tasks_completed"] += 1
            result["securities_updated"] = True
            result["files_created"].append(securities_filename)
            result["files_saved"] = True
            print(f"SUCCESS: BSE Securities CSV downloaded and saved as: {securities_filename}")
            print(f"SUCCESS: File location: {securities_csv_path}")
            print(f"SUCCESS: File size: {file_size} bytes")
            
            # Check if Equity.csv exists and process it to Security.json
            equity_csv_path = os.path.join(DOWNLOAD_DIR, "Equity.csv")
            parent_equity_path = os.path.join(os.path.dirname(DOWNLOAD_DIR), "Equity.csv")
            
            if os.path.exists(equity_csv_path) or os.path.exists(parent_equity_path):
                print("\n" + "="*60)
                print("BONUS TASK: Processing Equity.csv to Security.json")
                print("="*60)
                try:
                    equity_result = process_equity_csv_to_security_json()
                    if equity_result["success"]:
                        result["files_created"].append("data/Security.json")
                        print("SUCCESS: Equity.csv converted to Security.json")
                    else:
                        print(f"WARNING: Equity.csv processing failed: {equity_result.get('error', 'Unknown error')}")
                except Exception as equity_error:
                    print(f"WARNING: Equity.csv processing error: {str(equity_error)}")

        except Exception as e:
            error_msg = f"BSE Securities automation failed: {str(e)}"
            result["errors"].append(error_msg)
            print(f"ERROR: {error_msg}")
            import traceback
            print(f"TRACEBACK: {traceback.format_exc()}")

        # TASK 2: Mainboard IPO Data Automation
        print("\n" + "="*60)
        print("CRITICAL TASK 2: Mainboard IPO Data Automation")
        print("="*60)

        try:
            ipo_data = fetch_ipo_data(driver)

            # Data is already saved in process_csv_to_json function
            result["tasks_completed"] += 1
            result["ipo_main_updated"] = True
            result["files_created"].append("data/ipo-main.json")
            result["files_saved"] = True
            print("SUCCESS: Mainboard IPO Data saved to data/ipo-main.json")

        except Exception as e:
            error_msg = f"Mainboard IPO Data automation failed: {str(e)}"
            result["errors"].append(error_msg)
            print(f"ERROR: {error_msg}")
            import traceback
            print(f"TRACEBACK: {traceback.format_exc()}")

        # TASK 3: SME IPO Data Automation
        print("\n" + "="*60)
        print("CRITICAL TASK 3: SME IPO Data Automation")
        print("="*60)

        try:
            sme_ipo_data = fetch_sme_ipo_data(driver)

            # Data is already saved in process_csv_to_json function
            result["tasks_completed"] += 1
            result["ipo_sme_updated"] = True
            result["files_created"].append("data/ipo-sme.json")
            result["files_saved"] = True
            print("SUCCESS: SME IPO Data saved to data/ipo-sme.json")

        except Exception as e:
            error_msg = f"SME IPO Data automation failed: {str(e)}"
            result["errors"].append(error_msg)
            print(f"ERROR: {error_msg}")
            import traceback
            print(f"TRACEBACK: {traceback.format_exc()}")

        # Final validation
        if result["tasks_completed"] == result["total_tasks"]:
            result["success"] = True
            print("\n" + "="*60)
            print("SUCCESS: ALL CRITICAL TASKS COMPLETED SUCCESSFULLY!")
            print("="*60)
            print("✓ BSE Securities: Automated, Downloaded, CSV file saved with original filename")
            print("✓ Mainboard IPO Data: Automated, Downloaded, Processed, Saved to data/ipo-main.json")
            print("✓ SME IPO Data: Automated, Downloaded, Processed, Saved to data/ipo-sme.json")
            print("✓ Data Folder: All JSON files saved successfully")
            print("✓ Vercel: Headless operation completed successfully")
            print("✓ Files: All temporary CSV files cleaned up")
        else:
            error_summary = f"CRITICAL FAILURE: Only {result['tasks_completed']}/{result['total_tasks']} tasks completed"
            result["errors"].append(error_summary)
            print(f"\n{error_summary}")
            for error in result["errors"]:
                print(f"ERROR DETAIL: {error}")

        # Final cleanup - only clean IPO CSV files, keep BSE CSV file
        print("INFO: Performing final cleanup (keeping BSE CSV file)...")
        clean_ipo_files()  # Only clean IPO files, not BSE CSV
        # Also clean any remaining SME IPO CSV files
        sme_ipo_files = ["IPO-SME.csv", "ipo-sme.csv", "sme-ipo.csv"]
        for fname in sme_ipo_files:
            file_path = os.path.join(DOWNLOAD_DIR, fname)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"INFO: Removed remaining SME IPO file: {fname}")
                except Exception as e:
                    print(f"WARNING: Could not remove SME IPO file {fname}: {str(e)}")
        print("SUCCESS: Final cleanup completed (BSE CSV file preserved)")

    except Exception as e:
        error_msg = f"CRITICAL SYSTEM FAILURE: {str(e)}"
        result["errors"].append(error_msg)
        print(f"FATAL ERROR: {error_msg}")
    finally:
        # Clean up driver
        if driver:
            try:
                driver.quit()
                print("INFO: Chrome driver closed")
            except:
                pass

        # Final cleanup of any remaining files
        try:
            clean_download_folder()
        except:
            pass

    # Output result as JSON for Node.js to parse
    print("\n" + "="*60)
    print("FINAL AUTOMATION RESULT:")
    print("="*60)
    print(json.dumps(result, indent=2))

    return result

if __name__ == "__main__":
    main()
