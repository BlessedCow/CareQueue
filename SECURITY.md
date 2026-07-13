# Security Policy

## Supported Use

CareQueue is currently an early-stage, local-first development project. It is intended for private local testing, workflow experimentation, and continued development.

It should not be used as a production healthcare system without additional security, privacy, legal, organizational, and compliance review.

Security features in this repository may reduce certain risks, but they do not make the project HIPAA compliant on their own.

## Sensitive Data Rules

Do not commit, upload, publish, or share:

- `.env` files
- Encryption keys
- API keys
- Credentials
- SQLite database files
- SQLCipher database files
- Encrypted backup files
- Restored database files
- Export files
- Log files containing sensitive information
- Screenshots containing private information
- Real client or patient names
- Real member IDs
- Real group numbers
- Real dates of birth
- Real clinical notes
- Real payer authorization records tied to identifiable people
- Any PHI/PII

Use fake or clearly anonymized data for tests, screenshots, examples, issues, and documentation.

## Local Secrets

Local secrets should be stored in environment files that are ignored by Git:

```text
backend/backend/.env
frontend/.env
```

Commit only example files:

```text
backend/backend/.env.example
frontend/.env.example
```

Before committing, check staged and unstaged files:

```bash
git status --short
```

Do not commit database files, encrypted backups, restored databases, environment files, virtual environments, or dependency folders.

## Current Local Security Controls

CareQueue currently includes several local security controls:

- Field-level encryption for selected sensitive fields
- Optional SQLCipher encryption for the SQLite database file
- Encrypted local database backups
- Argon2id password hashing
- Server-side session records with hashed bearer tokens
- Role-based access controls
- Audit logging for login/logout and authorization changes
- Safer database path handling to reduce accidental unsafe database placement

These controls are intended to reduce local development risk. They do not replace production security architecture, formal compliance review, secure deployment practices, organizational policies, or legal review.

## Encryption Key Handling

CareQueue uses separate keys for separate protection layers:

```env
AUTHSTATUS_ENCRYPTION_KEY=field-level encryption key
AUTHSTATUS_SQLCIPHER_KEY=SQLCipher database key
AUTHSTATUS_BACKUP_ENCRYPTION_KEY=encrypted backup file key
```

Important:

- Do not commit encryption keys.
- Do not paste encryption keys into issues, pull requests, screenshots, chat messages, or documentation.
- Store keys securely outside the repository.
- Back up keys securely if encrypted data must remain readable.
- Losing `AUTHSTATUS_ENCRYPTION_KEY` may make encrypted field values unreadable.
- Losing `AUTHSTATUS_SQLCIPHER_KEY` may make the SQLCipher database unreadable.
- Losing `AUTHSTATUS_BACKUP_ENCRYPTION_KEY` may make encrypted backup files unreadable.
- Anyone with both a protected file and the matching key may be able to decrypt the protected data.

## Database and Backup Safety

The following files and directories should remain local and ignored by Git:

```text
backend/data/
backend/backups/
backend/restores/
*.db
*.sqlite
*.sqlite3
*.db.enc
*.restored.db
```

Keep plaintext and SQLCipher database files out of Git.

Keep encrypted backup files out of Git. Even encrypted backups may contain sensitive data and should be handled as sensitive files.

Restore scripts should write restored databases to a safe restore location and should not overwrite the active database automatically.

## Audit Logging

CareQueue includes audit logging for selected security and authorization actions.

Audit metadata should not store PHI values. Audit records should describe what changed without storing sensitive before/after values.

When adding new audit events, avoid logging:

- Client or patient names
- Member IDs
- Group numbers
- Dates of birth
- Authorization numbers tied to identifiable people
- Clinical notes
- Free-text notes that may contain PHI/PII

Prefer logging record IDs, event types, action names, and changed field names.

## Authentication and Roles

CareQueue has local application authentication.

Current role model:

```text
Admin:
Can view, create, edit, and delete authorization records and timeline events.

UR:
Can view, create, edit, and delete authorization records and timeline events.

Read Only:
Can view records but should not create, edit, or delete records.
```

Role checks should be enforced in the backend, not only hidden in the frontend.

## Reporting Security Issues

Do not open a public issue for security concerns involving exposed secrets, private data, PHI/PII, or suspected vulnerabilities.

Report security concerns privately to the repository owner when possible.

Do not include real PHI/PII in screenshots, logs, examples, issue descriptions, pull requests, or security reports.

## Production Warning

CareQueue is not production-ready.

Before any production or organizational use, the project would need additional review and controls, including but not limited to:

- Deployment security review
- HTTPS/TLS enforcement
- Production-grade secret management
- Access review procedures
- Backup retention and recovery policies
- Incident response procedures
- Logging and monitoring review
- Compliance review
- Legal review
- Organizational approval
- Business associate agreements, where required