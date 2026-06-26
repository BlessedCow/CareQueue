# Contributing

CareQueue is currently a private early stage project.

## Development Guidelines

Before making changes:

1. Do not add real PHI/PII to the repository.
2. Do not commit `.env` files.
3. Do not commit database files or backups.
4. Keep backend and frontend changes organized by module.
5. Prefer small, testable changes.

## Backend Checks

Run:

```bash
pytest -q
ruff check . --fix
```

## Frontend Checks

Run:

```bash
npm run build
```

## Code Style

- Keep sensitive data out of logs and test fixtures.
- Use fake/demo data only.
- Keep API logic separate from UI components.
- Keep encryption/decryption behavior covered by tests.
- Avoid committing generated folders such as `.venv`, `node_modules`, and `dist`.

## Commit Messages

Use clear commit messages, such as:

```text
Add encrypted auth record update endpoint
Connect dashboard to auth API
Add analytics summary endpoint
```
