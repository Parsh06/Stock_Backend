# Simple Python script without Unicode characters for Windows compatibility
import os
import time
import json
import pandas as pd
import sys
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager

# Firebase imports
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Configuration
DOWNLOAD_DIR = os.path.abspath(".")
TIMEOUT = 30
HEADLESS = True
DEBUG = False

def get_firebase_config():
    """Get Firebase configuration from environment variables"""
    return {
        "type": "service_account",
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.getenv("FIREBASE_CLIENT_ID"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.getenv('FIREBASE_CLIENT_EMAIL')}",
        "universe_domain": "googleapis.com"
    }

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        if not firebase_admin._apps:
            try:
                service_account_info = get_firebase_config()
                required_vars = ["FIREBASE_PROJECT_ID", "FIREBASE_PRIVATE_KEY", "FIREBASE_CLIENT_EMAIL"]
                missing_vars = [var for var in required_vars if not os.getenv(var)]

                if missing_vars:
                    raise Exception(f"Missing required environment variables: {', '.join(missing_vars)}")

                cred = credentials.Certificate(service_account_info)
                firebase_admin.initialize_app(cred, {'projectId': service_account_info['project_id']})

            except Exception as cred_error:
                print(f"WARNING: Firebase credential error: {str(cred_error)}")
                return None

        db = firestore.client()
        print("SUCCESS: Firebase initialized successfully")
        return db
    except Exception as e:
        print(f"ERROR: Firebase initialization failed: {str(e)}")
        return None

def upload_to_firestore(db, collection_name, data, data_type):
    """Upload JSON data to Firestore collection"""
    if db is None:
        print(f"WARNING: Skipping Firestore upload for {collection_name}")
        return False

    try:
        print(f"INFO: Uploading {data_type} data to collection '{collection_name}'...")
        collection_ref = db.collection(collection_name)

        # Clear existing data
        docs = collection_ref.stream()
        batch = db.batch()
        delete_count = 0
        for doc in docs:
            batch.delete(doc.reference)
            delete_count += 1
        if delete_count > 0:
            batch.commit()
            print(f"INFO: Deleted {delete_count} existing documents")

        # Upload new data
        batch_size = 200 if collection_name == "SecurityList" else 500
        total_records = len(data)
        uploaded_count = 0

        for i in range(0, total_records, batch_size):
            batch = db.batch()
            batch_data = data[i:i + batch_size]
            for idx, record in enumerate(batch_data):
                doc_id = f"{collection_name}_{i + idx + 1}"
                doc_ref = collection_ref.document(doc_id)
                record_with_metadata = {
                    **record,
                    'uploaded_at': datetime.now(),
                    'data_type': data_type,
                    'record_id': i + idx + 1
                }
                batch.set(doc_ref, record_with_metadata)
            batch.commit()
            uploaded_count += len(batch_data)
            print(f"PROGRESS: Uploaded {uploaded_count}/{total_records} records")

        print(f"SUCCESS: Uploaded {uploaded_count} {data_type} records")
        return True
    except Exception as e:
        print(f"ERROR: Firestore upload failed: {str(e)}")
        return False

def clean_download_folder():
    """Clean data files"""
    files_to_remove = ["IPO.csv", "ipo.json", "SecurityList.csv", "SecurityList.json"]
    for fname in files_to_remove:
        file_path = os.path.join(DOWNLOAD_DIR, fname)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"INFO: Removed {fname}")
            except Exception as e:
                print(f"WARNING: Could not remove {fname}: {str(e)}")

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

def setup_driver():
    """Setup Chrome driver"""
    opts = Options()
    if HEADLESS and not DEBUG:
        opts.add_argument("--headless")

    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")

    prefs = {
        "download.default_directory": DOWNLOAD_DIR,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True
    }
    opts.add_experimental_option("prefs", prefs)

    try:
        svc = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=svc, options=opts)
        print("INFO: Chrome driver initialized")
        return driver
    except Exception as e:
        print(f"ERROR: Failed to initialize Chrome driver: {str(e)}")
        raise

def process_csv_to_json(csv_path, json_name):
    """Convert CSV to JSON"""
    try:
        if not os.path.exists(csv_path):
            print(f"ERROR: CSV file not found: {csv_path}")
            return False, None

        df = pd.read_csv(csv_path)
        if df.empty:
            print(f"ERROR: CSV file is empty: {csv_path}")
            return False, None

        df.columns = [c.strip() for c in df.columns]
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

def fetch_ipo_data(driver, db=None):
    """Fetch IPO data from Chittorgarh"""
    print("INFO: Fetching IPO data...")
    try:
        driver.get("https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/all/")
        wait = WebDriverWait(driver, 15)
        wait.until(EC.presence_of_element_located((By.ID, "export_btn")))
        time.sleep(3)

        # Remove overlays
        driver.execute_script("""
            document.querySelectorAll('.modal, .popup, .overlay, .advertisement, .ad-banner')
                    .forEach(el => el.remove());
        """)

        btn = driver.find_element(By.ID, "export_btn")
        driver.execute_script("arguments[0].click();", btn)
        print("INFO: Export button clicked")

        csv_file = wait_for_file(".csv", timeout=45, min_size=500)
        target = os.path.join(DOWNLOAD_DIR, "IPO.csv")
        os.replace(csv_file, target)
        print("SUCCESS: IPO CSV downloaded")

        success, json_data = process_csv_to_json(target, "ipo.json")
        if success and json_data:
            upload_to_firestore(db, "Ipo", json_data, "IPO")
            return True
        return False
    except Exception as e:
        print(f"ERROR: IPO fetch failed: {str(e)}")
        return False

def fetch_security_list(driver, db=None):
    """Fetch Security List from BSE"""
    print("INFO: Fetching Security List...")
    try:
        driver.get("https://www.bseindia.com/corporates/List_Scrips.html")
        wait = WebDriverWait(driver, 15)
        time.sleep(5)

        # Select Equity T+1
        driver.execute_script("""
            var segment = document.getElementById('ddlsegment');
            for(var i = 0; i < segment.options.length; i++) {
                if(segment.options[i].text === 'Equity T+1') {
                    segment.selectedIndex = i;
                    segment.dispatchEvent(new Event('change'));
                    break;
                }
            }
        """)
        time.sleep(3)

        # Submit
        btn_submit = wait.until(EC.presence_of_element_located((By.ID, "btnSubmit")))
        driver.execute_script("arguments[0].click();", btn_submit)
        print("INFO: Submit clicked")
        time.sleep(5)

        # Download
        download_link = wait.until(EC.presence_of_element_located((By.ID, "lnkDownload")))
        driver.execute_script("arguments[0].click();", download_link)
        print("INFO: Download started")

        csv_file = wait_for_file(".csv", timeout=60, min_size=1000)
        target = os.path.join(DOWNLOAD_DIR, "SecurityList.csv")
        os.replace(csv_file, target)
        print("SUCCESS: SecurityList CSV downloaded")

        success, json_data = process_csv_to_json(target, "SecurityList.json")
        if success and json_data:
            upload_to_firestore(db, "SecurityList", json_data, "SecurityList")
            return True
        return False
    except Exception as e:
        print(f"ERROR: SecurityList fetch failed: {str(e)}")
        return False

def main():
    """Main function"""
    try:
        print("INFO: Starting IPO Security Data Scraper")
        clean_download_folder()
        db = initialize_firebase()
        driver = setup_driver()

        success_count = 0
        results = {
            "success": False,
            "tasks_completed": 0,
            "total_tasks": 2,
            "errors": [],
            "files_created": [],
            "firebase_upload": db is not None
        }

        try:
            if fetch_ipo_data(driver, db):
                success_count += 1
                results["files_created"].extend(["IPO.csv", "ipo.json"])
            else:
                results["errors"].append("Failed to fetch IPO data")

            if fetch_security_list(driver, db):
                success_count += 1
                results["files_created"].extend(["SecurityList.csv", "SecurityList.json"])
            else:
                results["errors"].append("Failed to fetch Security List data")
        finally:
            driver.quit()

        results["tasks_completed"] = success_count
        results["success"] = success_count > 0

        print(f"INFO: Completed {success_count}/2 tasks")
        for fname in ["IPO.csv", "ipo.json", "SecurityList.csv", "SecurityList.json"]:
            if os.path.exists(os.path.join(DOWNLOAD_DIR, fname)):
                size = os.path.getsize(os.path.join(DOWNLOAD_DIR, fname))
                print(f"SUCCESS: {fname} ({size} bytes)")

        if db:
            print("SUCCESS: Data uploaded to Firebase")
        else:
            print("WARNING: Firebase upload skipped")

        return json.dumps(results, indent=2)
    except Exception as e:
        error_result = {
            "success": False,
            "tasks_completed": 0,
            "total_tasks": 2,
            "errors": [f"Script failed: {str(e)}"],
            "files_created": [],
            "firebase_upload": False
        }
        print(f"ERROR: Script failed: {str(e)}")
        return json.dumps(error_result, indent=2)

if __name__ == "__main__":
    result = main()
    print(result)
