# Notes

## Current Architecture

```text
React/Vite frontend dashboard
↓
FastAPI backend API
↓
Local SQLite storage
↓
Optional SQLCipher database-file encryption
```

CareQueue is currently a local-first utilization review workflow prototype with authentication, role-aware UI controls, field-level encryption, encrypted backups, audit logging, and optional SQLCipher database encryption.

## Completed Major Milestones

- Added FastAPI backend API
- Added React/Vite frontend dashboard
- Added Authorizations page
- Added Settings page
- Added Calendar page
- Added frontend create/edit forms
- Added authorization timeline events
- Added continued stay / level-of-care workflow support
- Added dashboard analytics summary endpoint
- Added pagination and filtering improvements
- Added patient identity fields
- Added field-level encryption for selected sensitive fields
- Added Argon2id password hashing
- Added login, logout, and session restore
- Added role-based access controls
- Added audit logging for security and authorization actions
- Added encrypted backup and safe restore scripts
- Added safer database path handling
- Added optional SQLCipher database encryption
- Added SQLCipher migration, verification, and cutover scripts

## Near-Term Roadmap

- Improve PHI-safe backend error handling
- Add user management tooling for Admin users
- Add audit log review tooling
- Add backup and restore documentation
- Add SQLCipher setup documentation
- Add frontend empty/error states where needed
- Improve form validation and user-facing validation messages
- Continue cleaning up legacy backend folder nesting
- Continue improving README, SECURITY, and setup documentation

## Security Notes

CareQueue currently uses layered local security controls:

```text
Field-level encryption protects selected sensitive values.
SQLCipher can protect the database file at rest.
Encrypted backups protect exported backup copies.
Authentication and sessions control app access.
Roles limit frontend and backend actions.
Audit logs record key security and authorization changes.
```

These features reduce risk, but they do not make the project HIPAA compliant on their own.

## Data Safety Reminder

Use fake or clearly anonymized demo data only unless the project has appropriate approval, safeguards, compliance review, and organizational authorization.

Do not commit `.env` files, database files, SQLCipher databases, encrypted backups, restored databases, screenshots with private information, or any real PHI/PII.