import os
import json
import shutil
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = DATA_DIR / "auth_tracker.db"
JSON_BACKUP_PATH = DATA_DIR / "auth_tracker_backup.json"
WEB_PORTALS_PATH = DATA_DIR / "web_portals.json"
FACILITIES_FILE = DATA_DIR / "facilities.json"
FACILITY_TEMPLATE_FILE = Path("facilities_template.json")

if not FACILITIES_FILE.exists():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if FACILITY_TEMPLATE_FILE.exists():
        shutil.copy(FACILITY_TEMPLATE_FILE, FACILITIES_FILE)

with open(FACILITIES_FILE, "r", encoding="utf-8") as f:
    FACILITY_OPTIONS = json.load(f)

DEFAULT_WEB_PORTALS = ["Advantek", "Cohere", "Lucet", "Other"]

LOC_OPTIONS = ["DTX", "RTC", "PHP", "IOP", "OP"]
AUTH_TYPE_OPTIONS = ["Intake", "Concurrent", "Step Down", "Step Up"]
STATUS_OPTIONS = [
    "In Progress",
    "Submitted",
    "Approved",
    "Denied",
    "P2P Offered",
    "P2P Scheduled",
    "Appeal Needed",
    "No PA Required",
    "Discharged",
    "Closed",
]

SUBMISSION_OPTIONS = ["Web Portal", "Availity", "Fax", "Live Call"]
LIVE_CALL_OPTIONS = ["Dedicated CM", "Generic Auth Line"]

MORNING_EMAIL_TO = os.getenv("MORNING_EMAIL_TO", "")
MORNING_EMAIL_SUBJECT = "8 AM Morning Auth Workflow Report"

SMTP_BACKUP_ENABLED = False
SMTP_HOST = "smtp.office365.com"
SMTP_PORT = 587
SMTP_USERNAME_ENV = "AUTHSTATUS_SMTP_USERNAME"
SMTP_PASSWORD_ENV = "AUTHSTATUS_SMTP_PASSWORD"