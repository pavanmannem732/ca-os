# CA-OS: AI Operating System for Indian CA Firms

The definitive practice management intelligence layer for Chartered Accountant firms in India.

## Project Structure

This project is organized as a monorepo:

- `frontend/`: Next.js 14 App Router application.
- `backend/`: FastAPI Python application.
- `infra/`: Infrastructure as Code (Terraform) and local development (Docker Compose).
- `docs/`: Product and API documentation.

## Getting Started

### Backend Setup
1. Navigate to `backend/`
2. Create virtual environment: `python -m venv .venv`
3. Activate: `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (Unix)
4. Install dependencies: `pip install -r requirements.txt`
5. Run dev server: `fastapi dev main.py`

### Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

## Documentation
Refer to the `docs/` directory for the full SRD and architecture decisions.
