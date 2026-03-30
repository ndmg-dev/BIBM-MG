# BIBM-MG — Business Intelligence Platform

A full-stack financial analytics platform designed for multi-company DRE (Demonstracao do Resultado do Exercicio) analysis. The system ingests structured Excel spreadsheets, persists them into a cloud database, and renders a dynamic executive dashboard with vertical analysis (AV%), horizontal analysis (AH%), drill-down account history, and report export capabilities.

---

## Architecture Overview

The platform follows a decoupled architecture with two independently deployable services:

```
BIBM-MG/
├── backend/          Python API (FastAPI + Uvicorn)
├── frontend/         Web application (Next.js 15 / React 19)
├── docker-compose.yml
└── README.md
```

**Backend:** Stateless REST API responsible for Excel ingestion, data aggregation, KPI computation, and DRE tree building. Communicates exclusively with Supabase (PostgreSQL) as the persistence layer.

**Frontend:** Server-rendered Next.js application that consumes the backend API. Implements the executive dashboard, filter controls, DRE analytical table with drill-down modals, evolution charts, composition charts, and report export.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Backend framework | FastAPI 0.109 |
| Runtime | Python 3.11 / Uvicorn |
| Database | Supabase (PostgreSQL) |
| Data parsing | Pandas + OpenPyXL |
| Containerization | Docker + Docker Compose |
| Deployment | Coolify (self-hosted PaaS) |
| CI/CD | GitHub Actions |

---

## Features

**Data Ingestion**
- Upload DRE spreadsheets in `.xlsx` format via REST endpoint
- Automatic company creation and period detection
- Import history tracking per upload

**Executive Dashboard**
- Multi-company selection with per-company period filtering
- KPI cards: Gross Revenue, Net Revenue, COGS, Net Profit
- Comparative analysis between any two periods (target vs base)
- Absolute and percentage variance (delta) for each metric

**DRE Analytical Table**
- Full hierarchical DRE tree with expandable account groups
- Vertical analysis (AV%) for both target and base periods
- Horizontal analysis (AH%) highlighting growth and regression in color
- Account drill-down modal with temporal evolution chart (line chart per account)

**Report Export**
- PDF export: generates a print-ready branded HTML report, opens in a new tab for saving via browser print dialog
- Excel/CSV export: flat DRE data with indentation hierarchy, UTF-8 BOM for Excel compatibility

---

## Prerequisites

- Docker and Docker Compose installed
- A Supabase project with the schema applied (`backend/db_schema.sql`)
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

---

## Environment Variables

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<your-service-role-key>
```

### Frontend (`frontend/.env`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Running Locally

### With Docker Compose

```bash
# Clone the repository
git clone https://github.com/ndmg-dev/BIBM-MG.git
cd BIBM-MG

# Configure environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Build and start all services
docker compose up --build
```

The frontend will be available at `http://localhost:3000`.  
The backend API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`.

### Without Docker

**Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/imports/dre` | Upload DRE `.xlsx` file |
| `GET` | `/api/v1/companies` | List all companies |
| `GET` | `/api/v1/periods` | List available periods for a company |
| `GET` | `/api/v1/dre/kpis` | KPI comparison cards |
| `GET` | `/api/v1/dre/tree` | Full hierarchical DRE tree |
| `GET` | `/api/v1/dre/evolution` | Revenue/cost evolution series |
| `GET` | `/api/v1/dre/composition` | Cost composition breakdown |
| `GET` | `/api/v1/dre/account_history` | Historical series for a single account |

---

## Database Schema

Apply the schema to your Supabase project before first use:

```bash
# Via Supabase SQL Editor or psql
psql $DATABASE_URL -f backend/db_schema.sql
```

Row-level security policies are defined in `backend/auth_rls_setup.sql`.

---

## Deployment

The platform is designed to deploy on **Coolify** using the repository-linked Docker Compose strategy.

Each service (`backend`, `frontend`) has its own `Dockerfile` and is built independently. Environment variables are injected at build time via Coolify's environment configuration.

The CI/CD pipeline (`.github/workflows/ci.yml`) validates both services on every push to `main` before deployment proceeds.

---

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   └── routes.py          All API endpoints
│   ├── ingestion/
│   │   └── parser.py          Excel parser (Pandas)
│   ├── models/
│   │   └── schemas.py         Pydantic models
│   ├── services/
│   │   └── kpi_service.py     KPI and aggregation logic
│   └── main.py                FastAPI app entry point
├── db_schema.sql
├── auth_rls_setup.sql
├── requirements.txt
└── Dockerfile

frontend/
├── src/
│   ├── app/
│   │   └── page.tsx           Main dashboard page (Server Component)
│   └── components/
│       ├── DRETable.tsx        DRE hierarchical table with drill-down
│       ├── DrillDownModal.tsx  Account history modal
│       ├── ExportButton.tsx    PDF and CSV export
│       ├── DashboardFilters.tsx Filter bar (company, period, quarter)
│       ├── KPICard.tsx         Metric summary cards
│       ├── EvolutionChart.tsx  Revenue/cost evolution chart
│       └── CompositionChart.tsx Cost composition pie chart
├── package.json
└── Dockerfile
```

---

## License

This project is proprietary software owned by Mendonca Galvao. All rights reserved. See [LICENSE](./LICENSE) for details.
