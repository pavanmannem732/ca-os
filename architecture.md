ca-os/
├── README.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    — CI pipeline (tests, linting, security scan)
│   │   ├── cd-staging.yml            — Staging deployment
│   │   ├── cd-production.yml         — Production deployment
│   │   └── dependency-update.yml     — Weekly dependency audit
│   └── PULL_REQUEST_TEMPLATE.md
│
├── frontend/                         — Next.js 14 App Router
│   ├── .env.local                    — Local env (gitignored)
│   ├── .env.example                  — Env template
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   ├── app/                          — Next.js App Router
│   │   ├── layout.tsx                — Root layout
│   │   ├── page.tsx                  — Marketing home
│   │   ├── (auth)/                   — Auth pages group
│   │   ├── (dashboard)/              — Protected CA dashboard
│   │   └── (portal)/                 — Client portal
│   ├── components/
│   │   ├── ui/                       — Base design system components
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── compliance/
│   │   ├── staff/
│   │   ├── documents/
│   │   ├── billing/
│   │   ├── ai/
│   │   └── whatsapp/
│   ├── lib/
│   │   ├── api/                      — API client functions (one file per resource)
│   │   ├── hooks/                    — Custom React hooks
│   │   ├── stores/                   — Zustand state stores
│   │   ├── utils/                    — Utility functions
│   │   └── constants/                — Shared constants
│   └── styles/
│
├── backend/                          — FastAPI Python
│   ├── .env                          — Local env (gitignored)
│   ├── .env.example
│   ├── requirements.txt              — All dependencies (prod + dev)
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── railway.toml
│   ├── main.py                       — FastAPI application entry point
│   ├── app/
│   │   ├── core/                     — Cross-cutting infrastructure
│   │   │   ├── config.py             — Pydantic Settings
│   │   │   ├── database.py           — SQLAlchemy async engine
│   │   │   ├── redis.py              — Redis client
│   │   │   ├── security.py           — JWT, permissions
│   │   │   ├── logging.py            — Structured logging
│   │   │   ├── exceptions.py         — Custom exception classes
│   │   │   └── dependencies.py       — FastAPI DI dependencies
│   │   ├── models/                   — SQLAlchemy ORM models
│   │   ├── schemas/                  — Pydantic request/response schemas
│   │   ├── routers/                  — FastAPI route handlers
│   │   ├── services/                 — Business logic layer
│   │   ├── agents/                   — AI agent definitions
│   │   ├── tasks/                    — Celery tasks
│   │   ├── utils/                    — Utility modules
│   │   │   ├── gst_calendar.py       — India GST deadline engine
│   │   │   ├── indian_compliance.py  — Compliance helpers
│   │   │   ├── validators.py         — GSTIN/PAN/mobile validators
│   │   │   ├── s3_utils.py
│   │   │   ├── razorpay_utils.py
│   │   │   └── whatsapp_templates.py
│   │   └── prompts/                  — Versioned AI prompts
│   │       ├── gst_notice_response_v2.3.py
│   │       ├── document_chaser_v1.2.py
│   │       └── [all prompt versions]
│   ├── migrations/                   — Alembic migrations
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   └── tests/
│       ├── conftest.py               — Test fixtures, DB setup
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── infra/                            — Infrastructure as Code
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── modules/
│   └── docker-compose.yml            — Local development
│
└── docs/
    ├── api.md                        — API reference
    ├── architecture.md               — System design decisions
    ├── gst_calendar.md               — All GST deadline rules
    ├── deployment.md                 — Deployment runbook
    └── security.md                   — Security procedures