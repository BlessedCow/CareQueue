# Local Auth Status Tracker (`AuthStatus`)

A secure, offline oriented workflow automation tool designed for medical billing and facility coordinators to track insurance authorizations, manage submissions, and generate daily status reports. 

Built with **Python**, **Streamlit**, and **SQLite**, this application operates with a strict local-only architecture, ensuring zero data telemetry, cloud database leaks, or external API exposures of sensitive operational workflows.

---

## Key Features

* **Interactive Auth Calendar:** Visually track authorization start and completion deadlines across a dynamically filterable calendar grid.
* **Submission Method Tracking:** Custom workflows for handling **Web Portals** (e.g., Availity, Cohere, Lucet), multi-line **Fax entries**, and scheduled **Live Calls** (Dedicated Care Manager or Generic lines).
* **Automated Data Validation:** Real-time phone and fax validation patterns ensuring strings are formatted identically (`XXX-XXX-XXXX`) to eliminate errors prior to database entry.
* **Morning Workflow Reports:** One-click generation of text-based status summaries tailored for daily shift changes and administrative handoffs.
* **Corporate Email Integration:** Direct local bridge to classic/new Outlook desktop via COM interfaces (`pywin32`) to generate and send pre-formatted email updates instantly, featuring robust SMTP backup integration.
* **Zero-Cloud Security Model:** Operates entirely out of an isolated SQLite file with automated localized JSON backups for individual application portability.

---

## Project Architecture

```
AuthStatus/
├── app.py                   # Core Streamlit UI components, tabs, and interactive views
├── config.py                # Application lifecycle configurations and environment mapping
├── emailer.py               # Outlook COM hooks, fallback SMTP wrappers, and report string builders
├── schema.py                # SQLite initialization protocols and database delta logic
├── storage.py               # Abstracted CRUD layer handling SQLite records and localized JSON backups
├── test_app.py              # Automated test suites validating phone formatting, dates, and logic
├── pyproject.toml           # Project code quality compliance and linting configuration (Ruff)
├── facilities_template.json # Customizable master template for your selectable facility options
└── data/                    # Git ignored localized application runtime data (Generated Automatically)
    ├── auth_tracker.db          # Active production SQLite database (Local Only)
    ├── auth_tracker_backup.json # Automated portable user data backup state
    └── facilities.json          # Active selectable dropdown options for facilities
```

## Setup & Installation
Prerequisite Checklist
Python 3.11 or higher installed on your system.

Classic or New Outlook Desktop Client (Optional: required for automated native draft building)

1. Clone or Download the Source Code:
- Download the repository files to your local machine and navigate into the project directory: `cd AuthStatus`

2. Configure Your Local Environment Variables
- Create a file named `.env` in the root folder of your project to keep your operational email addresses and credentials decoupled from the codebase:
```
# Core Configuration
MORNING_EMAIL_TO=your-email@company.com

# Optional SMTP Backup Settings
SMTP_BACKUP_ENABLED=False #True if using SMTP backup
AUTHSTATUS_SMTP_USERNAME=
AUTHSTATUS_SMTP_PASSWORD=
```

3. Customize Your Facilities List
- Before launching the application for the first time, open the template file in the root directory:
`facilities_template.json` 
Add your specific, custom facility names into this list. The very first time you run the application, it will automatically detect your entries and securely copy this file into your localized workspace directory as `data/facilities.json` so your drop-down menus load perfectly.

4. Install Dependencies
- Install all required platform and UI framework dependencies:
`pip install streamlit pywin32 pandas python-dotenv`

5. Launch the Application
- Start the Streamlit environment locally:
`streamlit run app.py`

## Quality Assurance & Testing
This project utilizes automated testing to validate input sanitization routines and report generation structures. Run your preferred test suite framework (such as `pytest`) directly inside the root directory:
`pytest test_app.py`

## Security Statement
This software is designed to comply with isolated local environment standards. No data telemetry, analytics, tracking tokens, or system diagnostic information is sent out to third-party endpoints. All state information remains bounded to your local workstation's filesystem.
