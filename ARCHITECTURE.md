# Architecture

CareQueue is a local-first utilization review workflow prototype built with a React frontend and a FastAPI backend.

The application is organized around authorization tracking, timeline events, review due dates, payer/facility workflow details, authentication, role-based access control, audit logging, and layered local data protection.

## High-Level Overview

```text
Browser
  ↓
React/Vite frontend
  ↓
Authenticated API requests
  ↓
FastAPI backend
  ↓
Repository/service layer
  ↓
SQLite or SQLCipher database
```

CareQueue currently runs as a local development application. The frontend and backend are started separately.

```text
Frontend:
http://localhost:5173

Backend:
http://127.0.0.1:8000
```

## Repository Layout

```text
CareQueue/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       │   └── layout/
│       ├── hooks/
│       ├── pages/
│       ├── types/
│       └── utils/
├── backend/
│   ├── authstatus_api/
│   │   ├── audit/
│   │   ├── backups/
│   │   ├── database_encryption/
│   │   ├── pdf_intake/
│   │   ├── registered_options/
│   │   ├── routers/
│   │   ├── security/
│   │   ├── crypto.py
│   │   ├── database.py
│   │   ├── errors.py
│   │   ├── main.py
│   │   ├── repository.py
│   │   ├── schemas.py
│   │   └── settings.py
│   ├── scripts/
│   ├── tests/
│   │   ├── pdf_intake/
│   │   ├── registered_options/
│   │   ├── security/
│   │   └── conftest.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml
│   ├── app.py
│   ├── config.py
│   ├── emailer.py
│   ├── schema.py
│   ├── storage.py
│   └── test_app.py
├── README.md
├── CONTRIBUTING.md
├── DISCLAIMER.md
├── SECURITY.md
└── NOTES.md
```

The current FastAPI backend lives in:

```text
backend/authstatus_api/
```

The older local backend files under `backend/` are legacy AuthStatus/Streamlit-era files and are separate from the current FastAPI API.

## Frontend Architecture

The frontend is a React/Vite/Tailwind application.

```text
frontend/src/
├── api/
├── components/
│   └── layout/
├── hooks/
├── pages/
├── types/
└── utils/
```

### `api/`

The `api/` folder contains frontend API clients for communicating with the FastAPI backend.

Key files:

```text
frontend/src/api/client.ts
frontend/src/api/security.ts
frontend/src/api/authStatus.ts
frontend/src/api/authEvents.ts
```

Responsibilities:

- Store and attach bearer tokens
- Send authenticated requests
- Call security/login/session endpoints
- Call authorization endpoints
- Call authorization timeline event endpoints

### `pages/`

The `pages/` folder contains top-level routed application screens.

Current page areas include:

```text
DashboardPage
AuthorizationsPage
CalendarRoutePage
SettingsPage
```

Responsibilities:

- Compose page-level UI
- Coordinate hooks and components
- Render dashboard, authorization, calendar, and settings workflows

### `components/`

The `components/` folder contains reusable UI and workflow components.

Examples:

```text
AddAuthorizationForm
AuthTimelineSection
AuthorizationReadOnlyView
CalendarPage
Charts
DataTable
Filters
KPICards
LoginPage
UpcomingWorkflowCard
```

Responsibilities:

- Render forms, tables, cards, filters, charts, and timeline sections
- Provide authorization create/edit workflows
- Provide read-only views
- Support role-aware UI behavior

### `components/layout/`

The layout folder contains application shell structure.

```text
AppShell
```

Responsibilities:

- Render main app layout
- Show navigation
- Show current user context
- Provide logout access

### `hooks/`

The `hooks/` folder contains frontend state and workflow logic.

Examples:

```text
useAuthorizationEvents
useAuthorizationFilters
useAuthorizationForm
useAuthorizationMutations
useAuthorizationSelection
useDashboardCardSettings
useRegisteredOptions
useWorkflowViewMode
```

Responsibilities:

- Manage form state
- Manage authorization selection
- Manage authorization mutations
- Manage registered settings/options
- Manage dashboard card preferences
- Manage timeline event loading and updates

### `types/`

The `types/` folder contains shared frontend TypeScript types.

Examples:

```text
auth.ts
navigation.ts
```

### `utils/`

The `utils/` folder contains frontend helper logic.

Examples:

```text
authEvents.ts
authSchedule.ts
cn.ts
```

Responsibilities:

- Authorization event formatting helpers
- Schedule/review date helpers
- CSS class name composition helper

## Backend Architecture

The FastAPI backend is located at:

```text
backend/authstatus_api/
```

```text
backend/
├── authstatus_api/
│   ├── audit/
│   ├── backups/
│   ├── database_encryption/
│   ├── pdf_intake/
│   ├── registered_options/
│   ├── routers/
│   ├── security/
│   ├── crypto.py
│   ├── database.py
│   ├── errors.py
│   ├── main.py
│   ├── repository.py
│   ├── schemas.py
│   └── settings.py
├── scripts/
├── tests/
├── requirements.txt
├── requirements-dev.txt
└── pyproject.toml
```

### `main.py`

Creates and configures the FastAPI application.

Responsibilities:

- Build the FastAPI app
- Register middleware
- Register routers
- Expose health endpoint behavior

### `settings.py`

Centralizes backend configuration.

Responsibilities:

- Read environment settings
- Configure database path
- Configure CORS origins
- Configure encryption keys
- Configure database encryption mode
- Configure backup and restore directories

Important environment values include:

```env
AUTHSTATUS_ENCRYPTION_KEY=
AUTHSTATUS_SQLCIPHER_KEY=
AUTHSTATUS_BACKUP_ENCRYPTION_KEY=
AUTHSTATUS_DATABASE_PATH=
AUTHSTATUS_DATABASE_ENCRYPTION=
AUTHSTATUS_BACKUP_DIRECTORY=
AUTHSTATUS_RESTORE_DIRECTORY=
AUTHSTATUS_CORS_ORIGINS=
```

### `database.py`

Manages database initialization and connections.

Responsibilities:

- Resolve safe database paths
- Create required tables
- Return SQLite or SQLCipher connections
- Enforce database mode behavior
- Initialize schema for authorizations, timeline events, users, sessions, and audit events

Database mode is controlled by:

```env
AUTHSTATUS_DATABASE_ENCRYPTION=plaintext
```

or:

```env
AUTHSTATUS_DATABASE_ENCRYPTION=sqlcipher
```

### `repository.py`

Contains core authorization and timeline persistence logic.

Responsibilities:

- Create authorization records
- Read authorization records
- Update authorization records
- Delete authorization records
- Manage authorization timeline events
- Convert database rows into API-safe response objects
- Decrypt encrypted fields before returning records to authorized users

### `schemas.py`

Contains backend Pydantic schemas for authorization API data.

Responsibilities:

- Define request models
- Define response models
- Validate API payload shape
- Keep API contracts explicit

## Backend Routers

Routers are located at:

```text
backend/authstatus_api/routers/
```

### `auths.py`

Authorization and timeline event routes.

Responsibilities:

- List authorization records
- Create authorization records
- Read one authorization record
- Update authorization records
- Delete authorization records
- List timeline events
- Create timeline events
- Update timeline events
- Delete timeline events

### `analytics.py`

Dashboard analytics routes.

Responsibilities:

- Provide dashboard summary metrics
- Support frontend KPI/dashboard views

### `security.py`

Authentication/session routes.

Responsibilities:

- Log users in
- Log users out
- Return current user session information

## Security Architecture

Security-related backend code is located at:

```text
backend/authstatus_api/security/
```

```text
security/
├── csrf.py
├── dependencies.py
├── password_hashing.py
├── repository.py
├── schemas.py
├── sessions.py
└── temporary_passwords.py
```

### Authentication

Users log in through the security API.

```text
POST /api/security/login
GET  /api/security/me
POST /api/security/logout
```

Passwords are hashed with Argon2id before storage.

### Sessions

Raw session tokens are returned to the frontend and stored in the browser.

The backend stores only hashed session tokens.

Authenticated frontend requests include a bearer token.

```text
Authorization: Bearer <token>
```

### Roles

CareQueue currently supports:

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
Can view records but should not create, edit, or delete records.
```

Role checks should be enforced in the backend. The frontend also hides unavailable actions for read-only users.

## Data Protection Architecture

CareQueue uses layered local data protection.

```text
Field-level encryption
↓
Database file encryption
↓
Encrypted backups
```

These layers protect different things and use separate keys.

### Field-Level Encryption

Implemented in:

```text
backend/authstatus_api/crypto.py
```

Configured with:

```env
AUTHSTATUS_ENCRYPTION_KEY=
```

This protects selected sensitive field values before they are stored in the database.

The same key is required to decrypt existing encrypted field values.

### SQLCipher Database Encryption

Implemented in:

```text
backend/authstatus_api/database_encryption/
```

Configured with:

```env
AUTHSTATUS_DATABASE_ENCRYPTION=sqlcipher
AUTHSTATUS_SQLCIPHER_KEY=
```

SQLCipher protects the SQLite database file at rest.

The plaintext fallback mode is:

```env
AUTHSTATUS_DATABASE_ENCRYPTION=plaintext
```

### Encrypted Backups

Implemented in:

```text
backend/authstatus_api/backups/service.py
```

Configured with:

```env
AUTHSTATUS_BACKUP_ENCRYPTION_KEY=
AUTHSTATUS_BACKUP_DIRECTORY=../backups
AUTHSTATUS_RESTORE_DIRECTORY=../restores
```

Encrypted backups are written as:

```text
*.db.enc
```

Restore operations write to a safe restore directory and should not overwrite the active database automatically.

## Audit Logging

Audit logging is implemented in:

```text
backend/authstatus_api/audit/service.py
```

Audit records are stored in the database.

Audit logging currently covers selected actions such as:

```text
security.login
security.login_failed
security.logout
auth.create
auth.update
auth.delete
auth_event.create
auth_event.update
auth_event.delete
```

Audit metadata should avoid storing PHI/PII values.

Preferred audit metadata:

```text
record IDs
action names
changed field names
event types
```

Avoid logging:

```text
patient/client names
member IDs
group numbers
dates of birth
authorization numbers tied to identifiable people
clinical notes
free-text PHI/PII
```

## Database Architecture

CareQueue uses local SQLite-compatible storage.

Core tables include:

```text
auths
auth_events
users
sessions
audit_events
```

### `auths`

Stores authorization records and workflow fields.

Examples of data represented:

```text
facility
payer
level of care
authorization type
status
start date
end date
review due date
member details
submission details
decision details
notes
```

Selected sensitive values are encrypted before storage.

### `auth_events`

Stores authorization timeline events.

Examples of event data:

```text
event type
status
start date
end date
review due date
decision date
notes
```

### `users`

Stores local application users.

Passwords are stored as Argon2id hashes.

### `sessions`

Stores server-side session records.

Raw bearer tokens are not stored. Token hashes are stored instead.

### `audit_events`

Stores audit records for selected security and authorization actions.

Audit metadata should not contain sensitive field values.

## API Flow

Typical login flow:

```text
User submits credentials
↓
Frontend calls POST /api/security/login
↓
Backend verifies password
↓
Backend creates session
↓
Frontend stores bearer token
↓
Frontend calls authenticated API routes
```

Typical authorization list flow:

```text
Frontend calls GET /api/auths with bearer token
↓
Backend verifies session
↓
Backend checks permissions
↓
Repository reads auth rows
↓
Sensitive fields are decrypted
↓
Response is returned to frontend
```

Typical authorization create/update flow:

```text
Frontend submits form data
↓
Backend validates request schema
↓
Backend checks write permission
↓
Sensitive fields are encrypted
↓
Repository writes database changes
↓
Audit event is recorded
↓
Updated data is returned or reloaded
```

## Scripts

Maintenance scripts live in:

```text
backend/scripts/
```

Current scripts include:

```text
create_user.py
seed_dev_auths.py
create_encrypted_backup.py
restore_encrypted_backup.py
migrate_to_sqlcipher.py
verify_sqlcipher_database.py
prepare_sqlcipher_cutover.py
```

### User Creation

```text
create_user.py
```

Creates local users because there is no public signup screen.

### Demo Data

```text
seed_dev_auths.py
```

Seeds development authorization records. Demo data should be fake or clearly anonymized.

### Backup and Restore

```text
create_encrypted_backup.py
restore_encrypted_backup.py
```

Creates encrypted backups and restores backup copies into a safe restore directory.

### SQLCipher

```text
migrate_to_sqlcipher.py
verify_sqlcipher_database.py
prepare_sqlcipher_cutover.py
```

Supports database migration, verification, and safer cutover preparation.

## Runtime Data

Local runtime files should not be committed.

Examples:

```text
backend/.env
backend/data/
backend/backups/
backend/restores/
*.db
*.sqlite
*.sqlite3
*.db.enc
*.restored.db
```

## Testing Architecture

Backend tests are located at:

```text
backend/tests/
```

Run backend tests from the repository root:

```bash
pytest backend/tests -q
```

Run Ruff from the repository root:

```bash
python -m ruff check . --fix
```

Frontend build check:

```bash
cd frontend
npm run build
```

## Current Limitations

CareQueue is local-first and not production-ready.

Current limitations include:

- No hosted deployment architecture
- No production secret manager
- No HTTPS/TLS deployment configuration
- No external identity provider integration
- No admin user management UI
- No audit log review UI
- Limited operational backup/restore documentation
- Legacy backend folder nesting still exists
- Compliance review has not been performed

## Design Principles

CareQueue should prioritize:

- Local-first development safety
- Clear workflow tracking
- Small focused changes
- Explicit data handling
- PHI/PII minimization
- Backend-enforced permissions
- Audit metadata without sensitive values
- Straightforward architecture over unnecessary abstraction
- Test coverage for behavior changes