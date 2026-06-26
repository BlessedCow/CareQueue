# Security Policy

## Supported Use

CareQueue is currently an early stage private development project. It is intended for local testing and workflow experimentation.

It should not be used as a production healthcare system without additional security, privacy, legal, and compliance review.

## Sensitive Data Rules

Do not commit or upload:

- `.env` files
- Encryption keys
- SQLite database files
- Backup files
- Real client names
- Real member IDs
- Real clinical notes
- Real payer authorization records tied to identifiable people
- Any PHI/PII

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

## Encryption Key Handling

The backend uses an encryption key for selected sensitive fields.

Important:

- Do not commit the encryption key.
- Do not paste the encryption key into issues, pull requests, screenshots, chat messages, or documentation.
- Back up the key securely if the data must remain readable.
- Losing the key may make encrypted records unrecoverable.
- Anyone with both the database and the key may be able to decrypt sensitive records.

## Reporting Security Issues

This is currently a private project. Security issues should be handled privately and should not include real PHI/PII in screenshots, logs, examples, or issue descriptions.
