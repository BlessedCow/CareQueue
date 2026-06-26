# Notes

## Near-Term Roadmap

- Add dynamic facility filter
- Add Authorizations page
- Add Settings page
- Add Calendar page
- Add frontend create/edit forms
- Add backend analytics endpoints for trends
- Add safer database migration handling
- Clean up backend folder nesting
- Improve README setup instructions after restructuring

## Current Architecture

```text
FastAPI backend
↓
Encrypted local SQLite storage
↓
React/Vite frontend dashboard
```

## Data Safety Reminder

Use fake/demo data only unless the project has appropriate approval, safeguards, and compliance review.
