# Critical Web Automation System for IPO and Security Data
import os
import time
import json
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

# MongoDB imports
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Configuration
DOWNLOAD_DIR = os.path.abspath(".")
TIMEOUT = 30
HEADLESS = True  # Set to True for Vercel deployment (no UI)
DEBUG = False    # Set to False for production

def get_mongodb_connection():
    """Get MongoDB connection to StockBroker database"""
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        if not mongodb_uri:
            raise Exception("MONGODB_URI environment variable not found")

        # Connect to StockBroker database specifically
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client['StockBroker']  # Use StockBroker database
        print("SUCCESS: MongoDB connected successfully to StockBroker database")
        return db
    except Exception as e:
        print(f"ERROR: MongoDB connection failed: {str(e)}")
        return None

def upload_to_mongodb(db, collection_name, data, data_type):
    """Upload JSON data to MongoDB collection"""
    if db is None:
        print(f"WARNING: Skipping MongoDB upload for {collection_name}")
        return False

    try:
        print(f"INFO: Uploading {data_type} data to collection '{collection_name}'...")
        collection = db[collection_name]

        # Clear existing data
        delete_result = collection.delete_many({})
        print(f"INFO: Deleted {delete_result.deleted_count} existing documents")

        # Prepare data with metadata
        upload_data = []
        for idx, record in enumerate(data):
            record_with_metadata = {
                **record,
                'uploaded_at': datetime.now(),
                'data_type': data_type,
                'record_id': idx + 1
            }
            upload_data.append(record_with_metadata)

        # Upload new data in batches
        batch_size = 1000
        total_records = len(upload_data)
        uploaded_count = 0

        for i in range(0, total_records, batch_size):
            batch_data = upload_data[i:i + batch_size]
            result = collection.insert_many(batch_data)
            uploaded_count += len(result.inserted_ids)
            print(f"PROGRESS: Uploaded {uploaded_count}/{total_records} records")

        print(f"SUCCESS: Uploaded {uploaded_count} {data_type} records to MongoDB")
        return True
    except Exception as e:
        print(f"ERROR: MongoDB upload failed: {str(e)}")
        return False

def clean_download_folder():
    """Clean data files and prevent duplicate downloads"""
    files_to_remove = [
        "IPO.csv", "ipo.json", "SecurityList.csv", "SecurityList.json",
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
        "IPO.csv", "ipo.json", "ipo-in-india-list-main-board-sme.csv"
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
    while time.time() < deadline:
        for fname in os.listdir(DOWNLOAD_DIR):
            if not fname.lower().endswith(ext) or fname.endswith(".crdownload"):
                continue
            full = os.path.join(DOWNLOAD_DIR, fname)
            try:
                if os.path.exists(full) and os.path.getsize(full) >= min_size:
                    with open(full, "rb") as f:
                        f.read(1)
                    return full
            except:
                pass
        time.sleep(2)
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

def process_csv_to_json(csv_path, json_name):
    """Convert CSV to JSON with normalized field names"""
    try:
        if not os.path.exists(csv_path):
            print(f"ERROR: CSV file not found: {csv_path}")
            return False, None

        df = pd.read_csv(csv_path)
        if df.empty:
            print(f"ERROR: CSV file is empty: {csv_path}")
            return False, None

        # Normalize column names: replace spaces with underscores and handle special characters
        df.columns = [c.strip().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('.', '') for c in df.columns]
        df = df.where(pd.notnull(df), None)

        # Filter SecurityList for active stocks only
        if json_name == "SecurityList.json" and "Status" in df.columns:
            original_count = len(df)
            df = df[df['Status'].str.strip().str.upper() == 'ACTIVE']
            print(f"INFO: Filtered to {len(df)} active stocks from {original_count} total")

        json_data = df.to_dict(orient="records")
        out = os.path.join(DOWNLOAD_DIR, json_name)
        with open(out, "w", encoding="utf-8") as jf:
            json.dump(json_data, jf, indent=4, ensure_ascii=False)
        print(f"SUCCESS: Created {json_name} with {len(df)} records")
        return True, json_data
    except Exception as e:
        print(f"ERROR: CSV processing failed: {str(e)}")
        return False, None

def process_existing_ipo_data():
    """Process existing IPO.csv file and upload to MongoDB"""
    print("INFO: Starting existing IPO data processing...")

    try:
        # Connect to MongoDB
        db = get_mongodb_connection()
        if db is None:
            raise Exception("MongoDB connection failed")

        # Check if IPO.csv exists
        ipo_csv_path = os.path.join(DOWNLOAD_DIR, "IPO.csv")
        if not os.path.exists(ipo_csv_path):
            raise Exception("IPO.csv file not found in current directory")

        print(f"INFO: Processing existing IPO data from {ipo_csv_path}...")

        # Process CSV to JSON
        success, json_data = process_csv_to_json(ipo_csv_path, "ipo.json")
        if not success or not json_data:
            raise Exception("Failed to process IPO CSV to JSON")

        # Upload to MongoDB - Ipo collection (overwrite existing)
        upload_success = upload_to_mongodb(db, "Ipo", json_data, "IPO_Data")
        if not upload_success:
            raise Exception("Failed to upload IPO data to MongoDB")

        print(f"SUCCESS: IPO data processed and uploaded successfully!")
        print(f"Records processed: {len(json_data)}")
        print(f"Files created: ipo.json")
        print(f"MongoDB collection: Ipo")

        # Clean up files after successful upload
        print("INFO: Cleaning up IPO files after successful upload...")
        clean_ipo_files()
        print("SUCCESS: IPO files cleaned up")

        return {
            "success": True,
            "records_processed": len(json_data),
            "files_created": ["ipo.json"],
            "database_updated": True
        }

    except Exception as e:
        error_msg = f"Process existing IPO data failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "records_processed": 0,
            "files_created": [],
            "database_updated": False
        }

def fetch_bse_securities(driver):
    """Critical automation: Fetch Security List from BSE website"""
    print("INFO: Starting BSE Securities automation...")

    try:
        # Clean any existing securities downloads first
        clean_existing_downloads("scrip")
        clean_existing_downloads("security")
        clean_existing_downloads("list")

        print("INFO: Navigating to BSE securities page...")
        driver.get("https://www.bseindia.com/corporates/List_Scrips.html")
        wait = WebDriverWait(driver, TIMEOUT)

        print("INFO: Waiting for page to load...")
        time.sleep(5)

        print("INFO: Selecting Equity T+1 segment...")
        # Select Equity T+1 segment
        segment_script = """
            var segment = document.getElementById('ddlsegment');
            if (!segment) throw new Error('Segment dropdown not found');

            var found = false;
            for(var i = 0; i < segment.options.length; i++) {
                if(segment.options[i].text === 'Equity T+1') {
                    segment.selectedIndex = i;
                    segment.dispatchEvent(new Event('change'));
                    found = true;
                    break;
                }
            }
            if (!found) throw new Error('Equity T+1 option not found');
            return 'SUCCESS: Equity T+1 selected';
        """

        result = driver.execute_script(segment_script)
        print(result)
        time.sleep(3)

        print("INFO: Clicking submit button...")
        # Submit form
        btn_submit = wait.until(EC.element_to_be_clickable((By.ID, "btnSubmit")))
        driver.execute_script("arguments[0].click();", btn_submit)
        print("SUCCESS: Submit button clicked")
        time.sleep(5)

        print("INFO: Waiting for results and download link...")
        # Wait for download link
        download_link = wait.until(EC.element_to_be_clickable((By.ID, "lnkDownload")))
        print("SUCCESS: Download link found")

        print("INFO: Initiating Securities download...")
        driver.execute_script("arguments[0].click();", download_link)
        print("SUCCESS: Securities download initiated")

        # Wait for CSV file download
        csv_file = wait_for_file(".csv", timeout=60, min_size=1000)
        target_path = os.path.join(DOWNLOAD_DIR, "SecurityList.csv")

        # Move downloaded file to target location
        os.rename(csv_file, target_path)
        print(f"SUCCESS: Securities CSV downloaded and moved to {target_path}")

        # Process CSV to JSON
        success, json_data = process_csv_to_json(target_path, "SecurityList.json")
        if not success or not json_data:
            raise Exception("Failed to process Securities CSV to JSON")

        print(f"SUCCESS: Processed {len(json_data)} securities from BSE")
        return json_data

    except TimeoutException as e:
        raise Exception(f"CRITICAL FAILURE: BSE Securities automation timeout - {str(e)}")
    except NoSuchElementException as e:
        raise Exception(f"CRITICAL FAILURE: BSE Securities element not found - {str(e)}")
    except Exception as e:
        raise Exception(f"CRITICAL FAILURE: BSE Securities automation failed - {str(e)}")

def create_sample_securities():
    """This function is removed - no dummy data allowed"""
    raise Exception("CRITICAL FAILURE: No sample data allowed in production system")

def fetch_ipo_data(driver):
    """Critical automation: Fetch IPO data from Chittorgarh website"""
    print("INFO: Starting IPO data automation...")

    try:
        # Clean any existing IPO downloads first
        clean_ipo_files()

        print("INFO: Navigating to Chittorgarh IPO page...")
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
        print("SUCCESS: IPO Export button clicked")

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
        print(f"SUCCESS: IPO CSV downloaded and moved to {target_path}")

        # Process CSV to JSON
        success, json_data = process_csv_to_json(target_path, "ipo.json")
        if not success or not json_data:
            raise Exception("Failed to process IPO CSV to JSON")

        print(f"SUCCESS: Processed {len(json_data)} IPO records from Chittorgarh")
        return json_data

    except TimeoutException as e:
        raise Exception(f"CRITICAL FAILURE: IPO automation timeout - {str(e)}")
    except NoSuchElementException as e:
        raise Exception(f"CRITICAL FAILURE: IPO element not found - {str(e)}")
    except Exception as e:
        raise Exception(f"CRITICAL FAILURE: IPO automation failed - {str(e)}")

def create_sample_ipos():
    """This function is removed - no dummy data allowed"""
    raise Exception("CRITICAL FAILURE: No sample data allowed in production system")

def main():
    """Main function - Critical automation system for Vercel deployment"""
    result = {
        "success": False,
        "tasks_completed": 0,
        "total_tasks": 2,
        "errors": [],
        "files_created": [],
        "database_upload": False,
        "database_type": "MongoDB",
        "securities_updated": False,
        "ipo_updated": False
    }

    # Check command line arguments for different modes
    mode = "full"  # Default mode
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()

    driver = None

    try:
        print("INFO: Starting CRITICAL IPO Security Data Automation System (Headless)")
        print(f"INFO: Running in mode: {mode}")

        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()

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
                result["database_upload"] = True
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

        # Full automation mode (default)
        # Clean download folder
        clean_download_folder()

        # Connect to MongoDB - CRITICAL
        db = get_mongodb_connection()
        if db is None:
            raise Exception("CRITICAL FAILURE: MongoDB connection failed - cannot proceed")

        # Initialize Chrome driver - CRITICAL (Headless for Vercel)
        print("INFO: Initializing Chrome driver for headless automation...")
        driver = setup_driver()
        print("SUCCESS: Chrome driver ready for CRITICAL headless automation")

        # TASK 1: BSE Securities Automation
        print("\n" + "="*60)
        print("CRITICAL TASK 1: BSE Securities Automation")
        print("="*60)

        try:
            securities_data = fetch_bse_securities(driver)

            # Upload to MongoDB - Securities collection (overwrite existing)
            upload_success = upload_to_mongodb(db, "Securities", securities_data, "BSE_Security")
            if upload_success:
                result["tasks_completed"] += 1
                result["securities_updated"] = True
                result["files_created"].extend(["SecurityList.csv", "SecurityList.json"])
                print("SUCCESS: BSE Securities data updated in MongoDB")
            else:
                raise Exception("MongoDB upload failed for Securities collection")

        except Exception as e:
            error_msg = f"BSE Securities automation failed: {str(e)}"
            result["errors"].append(error_msg)
            print(f"ERROR: {error_msg}")

        # TASK 2: IPO Data Automation
        print("\n" + "="*60)
        print("CRITICAL TASK 2: IPO Data Automation")
        print("="*60)

        try:
            ipo_data = fetch_ipo_data(driver)

            # Upload to MongoDB - Ipo collection (overwrite existing)
            upload_success = upload_to_mongodb(db, "Ipo", ipo_data, "IPO_Data")
            if upload_success:
                result["tasks_completed"] += 1
                result["ipo_updated"] = True
                result["files_created"].extend(["IPO.csv", "ipo.json"])
                print("SUCCESS: IPO Data updated in MongoDB")

                # Clean up IPO files after successful upload
                print("INFO: Cleaning up IPO files after successful upload...")
                clean_ipo_files()
                print("SUCCESS: IPO files cleaned up")
            else:
                raise Exception("MongoDB upload failed for Ipo collection")

        except Exception as e:
            error_msg = f"IPO Data automation failed: {str(e)}"
            result["errors"].append(error_msg)
            print(f"ERROR: {error_msg}")

        # Final validation
        if result["tasks_completed"] == result["total_tasks"]:
            result["success"] = True
            result["database_upload"] = True
            print("\n" + "="*60)
            print("SUCCESS: ALL CRITICAL TASKS COMPLETED SUCCESSFULLY!")
            print("="*60)
            print("✓ BSE Securities: Automated, Downloaded, Processed, Updated in MongoDB")
            print("✓ IPO Data: Automated, Downloaded, Processed, Updated in MongoDB")
            print("✓ MongoDB: All collections overwritten with fresh data")
            print("✓ Vercel: Headless operation completed successfully")
            print("✓ Files: All temporary files cleaned up")
        else:
            error_summary = f"CRITICAL FAILURE: Only {result['tasks_completed']}/{result['total_tasks']} tasks completed"
            result["errors"].append(error_summary)
            print(f"\n{error_summary}")
            for error in result["errors"]:
                print(f"ERROR DETAIL: {error}")

        # Final cleanup - ensure no files remain
        print("INFO: Performing final cleanup...")
        clean_download_folder()
        print("SUCCESS: Final cleanup completed")

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
