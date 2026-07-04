# CareQueue

CareQueue is a local-first utilization review workflow and authorization dashboard. It combines a FastAPI backend for tracking authorization records with a React frontend for visualizing authorization activity, workload, review dates, LCDs, and follow-up workflow.

CareQueue is designed for local development, learning, and private workflow experimentation. It is not intended to be used as a production healthcare system without additional privacy, security, compliance, legal, and organizational review.

## What CareQueue Does

CareQueue helps track utilization review authorization work such as:

- Initial and concurrent authorization records
- Authorization status, requested days, approved days, and payer decisions
- Review due dates and authorization end dates / LCDs
- Authorization timeline events
- Pending, denied, appealed, P2P, no-PA, and approved workflows
- Facility, payer, level of care, and work queue filtering
- Calendar-based review planning
- Dashboard-level workload and trend visibility

## Current Features

### Backend

- FastAPI backend API
- Local SQLite storage
- Field-level encryption for selected sensitive fields
- Authorization record create, read, update, and delete endpoints
- Authorization timeline event endpoints
- Analytics summary endpoint
- Development encryption key endpoint
- Backend tests for encryption, repository behavior, and API routes

### Frontend

- React/Vite/Tailwind frontend
- Dashboard with KPI cards, charts, recent authorizations, and upcoming workflow
- Calendar page for auth start dates, review due dates, auth end dates / LCDs, and completed auth dates
- Authorization work queue with filters and CRUD actions
- Read-only authorization detail view
- Authorization edit form
- Concurrent authorization workflow
- Authorization timeline events with add, edit, delete, and quick actions
- Settings page for registered facilities, insurances, web portals, and dashboard card visibility
- Persisted local browser settings for dashboard cards and registered options
- Dark mode layout
- Modular frontend structure with page components and shared hooks

## Project Structure

```text
CareQueue/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── emailer.py
│   ├── schema.py
│   ├── storage.py
│   ├── test_app.py
│   ├── backend/
│   │   ├── authstatus_api/
│   │   │   ├── routers/
│   │   │   ├── crypto.py
│   │   │   ├── database.py
│   │   │   ├── main.py
│   │   │   ├── repository.py
│   │   │   ├── schemas.py
│   │   │   └── settings.py
│   │   ├── tests/
│   │   ├── requirements.txt
│   │   ├── requirements-dev.txt
│   │   └── .env.example
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── components/layout/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── README.md
├── DISCLAIMER.md
├── SECURITY.md
├── LICENSE
└── .gitignore
```

## Current API Endpoints

```text
GET    /api/health
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

## Local Backend Setup

From the backend API folder:

```bash
cd backend/backend
py -3.12 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```

Create a local `.env` file:

```text
backend/backend/.env
```

Use `.env.example` as the template.

Generate an encryption key by starting the backend and visiting:

```text
http://127.0.0.1:8000/api/dev/encryption-key
```

Then place the generated value in `.env`:

```env
AUTHSTATUS_ENCRYPTION_KEY=paste-generated-key-here
AUTHSTATUS_DATABASE_PATH=../data/auth_tracker.db
AUTHSTATUS_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start the backend:

```bash
uvicorn authstatus_api.main:app --reload
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

## Local Frontend Setup

From the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Create a local `.env` file:

```text
frontend/.env
```

Use `.env.example` as the template:

```env
VITE_AUTHSTATUS_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

The app usually runs at:

```text
http://localhost:5173
```

## Testing

Backend tests:

```bash
cd backend/backend
.venv\Scripts\activate
pytest -q
ruff check . --fix
```

Frontend build check:

```bash
cd frontend
npm run build
```

## Privacy and Data Handling

CareQueue is intended to run locally. The backend encrypts selected sensitive fields before storing them in SQLite. However, field level encryption alone does not make the project HIPAA compliant.

See `DISCLAIMER.md` and `SECURITY.md` before using this project with real information.

## Repository Status

CareQueue is an early stage local first prototype. It is currently intended for private development and workflow experimentation.

## License

MIT License
See `LICENSE.md` for more information.
