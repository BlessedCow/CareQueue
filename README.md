# CareQueue

CareQueue is a local-first utilization review workflow and authorization dashboard. It combines a Python backend for tracking authorization records with a React frontend for visualizing authorization activity, workload, and review patterns.

The project is designed for local development and private workflow experimentation. It is not intended to be used as a production healthcare system without additional privacy, security, compliance, and organizational review.

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
│   │   ├── tests/
│   │   ├── requirements.txt
│   │   ├── requirements-dev.txt
│   │   └── .env.example
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── README.md
├── DISCLAIMER.md
├── SECURITY.md
└── .gitignore
```

## Current Features

### Backend

- FastAPI backend API
- Local SQLite storage
- Field level encryption for selected PHI/PII-like fields
- Authorization record CRUD endpoints
- PATCH/update support
- Analytics summary endpoint
- Backend test coverage for encryption, repository behavior, and API routes

### Frontend

- React/Vite dashboard
- Authorization data fetched from the backend API
- KPI cards
- Charts
- Filter controls
- Authorization table
- Dark mode dashboard layout

## Current API Endpoints

```text
GET    /api/health
GET    /api/auths
POST   /api/auths
GET    /api/auths/{id}
PATCH  /api/auths/{id}
DELETE /api/auths/{id}
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
