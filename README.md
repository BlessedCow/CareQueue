# CareQueue

CareQueue is a local-first utilization review workflow and authorization dashboard for tracking prior authorization work, review dates, payer decisions, timeline events, and follow-up queues.

It combines a FastAPI backend with a React/Vite/Tailwind frontend. CareQueue is designed for local development, private workflow experimentation, and learning. It is not a production healthcare system and is not HIPAA compliant by itself.

## Important Disclaimer

CareQueue may handle sensitive operational or health-adjacent information during local testing. Do not use real patient data unless you understand and accept the privacy, security, compliance, legal, and organizational responsibilities involved.

Security features in this project reduce risk, but they do not create HIPAA compliance on their own. See `DISCLAIMER.md` and `SECURITY.md`.

## Features

### Authorization workflow

- Track initial, continued stay, and level-of-care authorization work
- Store facility, payer, level of care, member details, authorization dates, review dates, and outcomes
- Track pending, approved, denied, appealed, P2P, no-PA-required, discharged, and completed workflows
- Maintain authorization timeline events
- Support continued stay / LOC workflow transitions
- View authorization records in dashboard, calendar, table, and detail views

### Frontend

- React/Vite/Tailwind interface
- Login screen and session restore
- Role-aware UI controls
- Dashboard KPI cards and workload summaries
- Calendar view for review dates, start dates, end dates, and closed authorization events
- Authorization work queue with filters, sorting, and pagination
- Read-only authorization detail view
- Timeline event management
- Settings page for registered facilities, insurances, portals, and dashboard card visibility
- Dark mode
- Local browser persistence for UI preferences

### Backend

- FastAPI API
- SQLite storage with optional SQLCipher database encryption
- Field-level encryption for selected sensitive fields
- Argon2id password hashing
- Server-side session table with hashed bearer tokens
- Role-based access control
- Audit logging for login/logout and authorization changes
- Encrypted local database backups
- Safe restore script for encrypted backups
- SQLCipher migration, verification, and cutover preparation scripts
- Backend test coverage for repository, API, auth, audit, backups, and SQLCipher behavior

## Current Security Model

CareQueue currently uses layered local security controls:

```text
Field-level encryption:
Sensitive fields are encrypted before being stored.

SQLCipher mode:
The SQLite database file can be encrypted at rest.

Encrypted backups:
Backup copies are encrypted separately.

Authentication:
Users log in with hashed passwords.

Sessions:
Raw session tokens are stored only in the browser. The backend stores token hashes.

Roles:
Admin and UR users can manage records. Read Only users can view records.

Audit logging:
Security and authorization actions are recorded without storing PHI values in audit metadata.
```

The three key types are separate and should not be mixed:

```env
AUTHSTATUS_ENCRYPTION_KEY=field-level Fernet encryption key
AUTHSTATUS_SQLCIPHER_KEY=SQLCipher database key
AUTHSTATUS_BACKUP_ENCRYPTION_KEY=encrypted backup file key
```

## Project Structure

```text
├── backend/
│   ├── app.py                         # Legacy Streamlit/AuthStatus code
│   ├── config.py                      # Legacy backend config
│   ├── emailer.py                     # Legacy email helper
│   ├── schema.py                      # Legacy schema helper
│   ├── storage.py                     # Legacy storage helper
│   ├── test_app.py                    # Legacy test file
│   └── backend/
│       ├── authstatus_api/
│       │   ├── audit/
│       │   ├── backups/
│       │   ├── database_encryption/
│       │   ├── routers/
│       │   ├── security/
│       │   ├── crypto.py
│       │   ├── database.py
│       │   ├── main.py
│       │   ├── repository.py
│       │   ├── schemas.py
│       │   └── settings.py
│       ├── scripts/
│       ├── tests/
│       ├── requirements.txt
│       └── requirements-dev.txt
├── docs/
│   ├── README.md
│   ├── screenshots/
│   └── workflows/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── components/layout/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
    .env.example
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── DISCLAIMER.md
├── NOTES.md
├── README.md
├── ROADMAP.md
├── SECURITY.md
├── LICENSE
└── .gitignore
```

## Backend Setup

From the repository root:

```bash
cd backend/backend
py -3.12 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt
```

Create a root runtime environment file:

```text
.env
```

Use `.env.example` as the template.

Generate keys:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Run that command separately for:

```env
AUTHSTATUS_ENCRYPTION_KEY=
AUTHSTATUS_BACKUP_ENCRYPTION_KEY=
```

For `AUTHSTATUS_SQLCIPHER_KEY`, use a long local passphrase or another securely generated value.

Recommended SQLCipher `.env` configuration:

```env
AUTHSTATUS_ENCRYPTION_KEY=your-field-encryption-key
AUTHSTATUS_SQLCIPHER_KEY=your-sqlcipher-key
AUTHSTATUS_BACKUP_ENCRYPTION_KEY=your-backup-encryption-key

AUTHSTATUS_DATABASE_PATH=backend/data/auth_tracker.sqlcipher.db
AUTHSTATUS_DATABASE_ENCRYPTION=sqlcipher
AUTHSTATUS_ALLOW_UNSAFE_DATABASE_PATH=false

AUTHSTATUS_BACKUP_DIRECTORY=backend/backups
AUTHSTATUS_RESTORE_DIRECTORY=backend/restores
AUTHSTATUS_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

Plaintext SQLite fallback configuration:

```env
AUTHSTATUS_ENCRYPTION_KEY=your-field-encryption-key
AUTHSTATUS_SQLCIPHER_KEY=your-sqlcipher-key
AUTHSTATUS_BACKUP_ENCRYPTION_KEY=your-backup-encryption-key

AUTHSTATUS_DATABASE_PATH=backend/data/auth_tracker.db
AUTHSTATUS_DATABASE_ENCRYPTION=plaintext
AUTHSTATUS_ALLOW_UNSAFE_DATABASE_PATH=false

AUTHSTATUS_BACKUP_DIRECTORY=backend/backups
AUTHSTATUS_RESTORE_DIRECTORY=backend/restores
AUTHSTATUS_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

Only one database mode should be active at a time.

Start the backend:

```bash
uvicorn authstatus_api.main:create_app --factory --host 127.0.0.1 --port 8000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

## Frontend Setup

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses this default backend API URL if no Vite environment override is provided:

```text
http://127.0.0.1:8000
```

The frontend usually runs at:

```text
http://localhost:5173
```

## Creating the First User

There is no public signup screen. Create users locally from the backend script.

From the repository root:

```bash
python backend/backend/scripts/create_user.py --username admin@example.com --role Admin
```

Available roles:

```text
Admin
UR
Read Only
```

Role behavior:

```text
Admin:
Can view, create, edit, and delete authorization records and timeline events.

UR:
Can view, create, edit, and delete authorization records and timeline events.

Read Only:
Can view records but does not see create, edit, or delete controls.
```

## Documentation

Additional project documentation is available in the repository root and under `docs/`.

- `ARCHITECTURE.md` explains the frontend, backend, database, security, audit, backup, and script structure.
- `ROADMAP.md` outlines planned improvements and future development direction.
- `SECURITY.md` describes local security controls, sensitive file handling, key handling, audit logging, and reporting guidance.
- `DISCLAIMER.md` explains project limitations, PHI/PII warnings, and non-production status.
- `CONTRIBUTING.md` explains contribution expectations, testing, privacy rules, and pull request guidance.
- `docs/` is reserved for additional documentation, sanitized screenshots, workflow notes, setup references, and future implementation guides.

## API Endpoints

```text
GET    /api/health

POST   /api/security/login
POST   /api/security/logout
GET    /api/security/me

GET    /api/auths
POST   /api/auths
GET    /api/auths/{auth_id}
PATCH  /api/auths/{auth_id}
DELETE /api/auths/{auth_id}

GET    /api/auths/{auth_id}/events
POST   /api/auths/{auth_id}/events
PATCH  /api/auths/{auth_id}/events/{event_id}
DELETE /api/auths/{auth_id}/events/{event_id}

GET    /api/analytics/summary

GET    /api/dev/encryption-key
```

Most API routes require a bearer token.

## Encrypted Backups

Create an encrypted backup of the active database:

```bash
python backend/backend/scripts/create_encrypted_backup.py
```

Backups are written to:

```text
backend/backups/
```

Backup files end in:

```text
.db.enc
```

Restore an encrypted backup to a safe restore location:

```bash
python backend/backend/scripts/restore_encrypted_backup.py backend/backups/<backup-file>.db.enc
```

Restores are written to:

```text
backend/restores/
```

The restore script does not overwrite the active database.

## SQLCipher Workflow

CareQueue supports optional SQLCipher database-file encryption.

Prepare a safe SQLCipher cutover:

```bash
python backend/backend/scripts/prepare_sqlcipher_cutover.py --force
```

This will:

```text
1. Create an encrypted backup of the plaintext database
2. Create a SQLCipher encrypted database copy
3. Verify required CareQueue tables
4. Print the .env values needed to switch to SQLCipher mode
5. Avoid deleting the plaintext database
```

The SQLCipher database is usually created at:

```text
backend/data/auth_tracker.sqlcipher.db
```

Verify a SQLCipher database manually:

```bash
python backend/backend/scripts/verify_sqlcipher_database.py
```

Create only the SQLCipher copy manually:

```bash
python backend/backend/scripts/migrate_to_sqlcipher.py
```

Recommended local switch to SQLCipher mode:

```env
AUTHSTATUS_DATABASE_PATH=../data/auth_tracker.sqlcipher.db
AUTHSTATUS_DATABASE_ENCRYPTION=sqlcipher
AUTHSTATUS_SQLCIPHER_KEY=your-sqlcipher-key
```

Keep the plaintext database until SQLCipher mode has been tested through normal app use.

## Testing

Backend tests from the repository root:

```bash
pytest backend/backend/tests -q
```

Ruff from the repository root:

```bash
python -m ruff check . --fix
```

Frontend build check:

```bash
cd frontend
npm run build
```

## Files That Should Not Be Committed

## Files That Should Not Be Committed

The following files and directories are local runtime data, generated artifacts, or sensitive configuration and should remain ignored:

```text
backend/backend/.env
backend/data/
backend/backups/
backend/restores/
*.db
*.sqlite
*.sqlite3
*.db.enc
*.restored.db
frontend/node_modules/
backend/backend/.venv/
```

Before committing, check the staged and unstaged files:

```bash
git status --short
```

Do not commit database files, encrypted backups, restore files, `.env`, virtual environments, or `node_modules`.

## Development Notes

- The current FastAPI backend lives in `backend/backend/authstatus_api`.
- Some older files under `backend/` are legacy AuthStatus/Streamlit files.
- Backend tests should be run against `backend/backend/tests`.
- The app is currently local-first and should not be deployed publicly without additional production hardening.
