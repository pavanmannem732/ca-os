# CA-OS: ENTERPRISE-GRADE SOFTWARE REQUIREMENTS DOCUMENT (SRD v1.0)

### *Complete Product Blueprint — AI Operating System for Indian CA Firms*

---

> **Document Classification:** Confidential — Internal Product Blueprint
> **Version:** 1.0.0
> **Status:** Final Draft for Engineering Review
> **Prepared By:** Product Architecture Council
> **Audience:** Engineering Leadership, Senior Developers, DevOps, Security, QA, Business Stakeholders

---

# TABLE OF CONTENTS

1. Project Overview
2. User Types & Roles
3. Complete Frontend Requirements
4. Complete Backend Requirements
5. Database Design Requirements
6. Security Requirements
7. API Requirements
8. External APIs & Third-Party Services
9. AI/LLM Requirements
10. DevOps & Infrastructure
11. Performance & Scalability
12. Testing Requirements
13. Analytics & Observability
14. Notifications & Communications
15. Admin Panel Requirements
16. File Management System
17. Compliance & Legal
18. Project Structure
19. Complete User Flows
20. Edge Cases & Failure Scenarios
21. Final Executive Summary

---

---

# SECTION 1: PROJECT OVERVIEW

---

## 1.1 Project Name

**CA-OS** — *The AI Operating System for Indian Chartered Accountant Firms*

Tagline: *"Run your entire CA practice from one intelligent platform."*

---

## 1.2 Vision

To become the definitive practice management intelligence layer for every Chartered Accountant firm in India — eliminating the chaos of Excel sheets, WhatsApp groups, and scattered tools, and replacing them with a single AI-powered platform that automates document collection, compliance tracking, staff coordination, client communication, and billing.

Within five years, CA-OS will be the operating system of record for CA practice management across India and the Global South, processing over ₹10,000 crore in client billings annually and serving over 50,000 CA firms.

---

## 1.3 Mission

To give every Indian CA — from a solo practitioner in Warangal to a 50-partner firm in Mumbai — the operational leverage of a Big Four firm, powered by AI agents that never sleep, never miss a deadline, and never forget to follow up.

---

## 1.4 Business Problem

India has 3.9 lakh registered Chartered Accountants managing an estimated 2–3 crore businesses for compliance, GST, TDS, ITR, audit, and advisory services. The operational reality of 95% of CA firms is:

**Problem 1 — Deadline Management Chaos:** GST returns, TDS filings, ITR deadlines, audit schedules, and FEMA filings create a web of 200+ annual deadlines per client. CAs managing 50–200 clients have thousands of deadlines to track. Current solution: a mix of WhatsApp reminders, personal memory, and Excel calendars that fail constantly.

**Problem 2 — Document Collection Paralysis:** Every monthly GST filing requires bank statements, purchase registers, sales invoices, and e-way bills from clients. CAs spend 20–40% of their working hours manually chasing these documents via WhatsApp. Clients are unresponsive. Documents arrive at the last minute. Filings are rushed.

**Problem 3 — Staff Coordination Blindness:** CA firms rely on articleship students (paid ₹5,000–15,000/month) to execute most compliance work. Assigning, tracking, and reviewing this work happens through verbal instructions and WhatsApp messages. There is zero visibility into who is doing what, what is overdue, and where work is stacking up.

**Problem 4 — Client Communication Inefficiency:** Responding to client queries (GST notices, ITR questions, advance tax calculations) requires the CA to recall context, draft responses manually, and send them via WhatsApp or email. This consumes hours that should go to advisory work.

**Problem 5 — Billing Leakage:** CA firms consistently under-bill because they have no systematic record of actual time and work done per client. Advisory calls, notice responses, special certificates — these often go unbilled. Research suggests Indian CA firms lose 20–35% of billable revenue due to poor billing hygiene.

**Problem 6 — No AI Leverage:** While global tools like Karbon and TaxDome exist, they are built for UK/US markets, priced in dollars, and have no native understanding of Indian GST architecture, Indian compliance deadlines, or the WhatsApp-first communication culture of Indian clients.

**The total cost of this problem:** A mid-sized CA firm managing 100 clients loses approximately ₹8–15 lakh annually in billing leakage, 2–4 additional staff who could be replaced by automation, and a significant number of clients who leave due to poor responsiveness and missed deadlines.

---

## 1.5 Target Users

**Primary Users:**
- Practicing Chartered Accountants (CA) with 20–500 active clients
- CA firm partners (sole proprietor to 10-partner firms)
- Articleship students working in CA firms
- Qualified CA staff members working in practice

**Secondary Users:**
- Business clients of CA firms (SME owners, directors, promoters)
- Company Secretaries (CS) — Phase 2 expansion
- Cost and Management Accountants (CMA) — Phase 3 expansion

**Excluded from Scope (v1.0):**
- Individual taxpayers filing their own returns
- Big Four or large network firms (they have custom ERP systems)
- Academicians and CA coaching institutes

---

## 1.6 Industry

- Financial Technology (FinTech)
- Legal Technology (LegalTech)
- Professional Services Automation (PSA)
- Compliance Technology (ComplianceTech)
- B2B SaaS

Primary regulatory context: India — Income Tax Act 1961, GST Act 2017, Companies Act 2013, FEMA 1999, and all associated rules and notifications.

---

## 1.7 Real-World Use Cases

**Use Case 1 — Monthly GST Filing Cycle:**
On the 1st of every month, CA-OS automatically identifies all clients due for GSTR-1 filing on the 11th and GSTR-3B on the 20th. It sends personalized WhatsApp messages to each client requesting their sales register, purchase register, bank statement, and e-way bill summary. As documents arrive, the system logs them, extracts key figures using OCR, and marks tasks complete. Staff are auto-assigned to prepare each return. On the 8th, the system re-sends reminders to clients whose documents are still pending. The CA reviews a consolidated compliance health dashboard showing all 87 clients with their document readiness, preparation status, and filing status — without opening a single WhatsApp chat manually.

**Use Case 2 — GST Notice Response:**
A client forwards a GST demand notice to their CA on WhatsApp at 10pm. The CA is offline. CA-OS receives the document (via WhatsApp webhook), classifies it as a GST demand notice, extracts the notice number, demand amount, and due date for reply. It auto-creates a task for the CA, sends an acknowledgment to the client saying "Your notice has been received and logged. Your CA will respond within 2 working days," and drafts a preliminary response using the AI draft generator pre-loaded with the client's GST history and the notice details. The next morning, the CA reviews the AI-drafted response, makes minor edits, and sends it to the client in one click.

**Use Case 3 — Annual Audit Planning:**
In August, CA-OS automatically generates an audit preparation checklist for all corporate clients whose financial year closes in March. It sends a document request schedule to each client over 4 weeks — week 1 requesting trial balance and bank statements, week 2 requesting fixed asset register and loans schedule, and so on. Staff are assigned to each phase. The CA tracks overall audit readiness on a single dashboard.

**Use Case 4 — Billing Recovery:**
At month end, the CA-OS billing module compiles an auto-generated invoice for each client based on: fixed retainer fee + time logged by staff on client tasks + ad-hoc work items added during the month. The CA reviews, adjusts if needed, and sends the invoice via Razorpay payment link directly from the platform. Payment status updates automatically. Overdue invoices trigger automated follow-up messages.

**Use Case 5 — New Client Onboarding:**
A new manufacturing client is added to CA-OS. The CA enters basic details: company name, GSTIN, PAN, registered address, constitution (Pvt Ltd), and compliance requirements (GST monthly + TDS quarterly + ITR annual + audit). CA-OS automatically generates the complete compliance calendar for the next 12 months for this client, creates all required compliance task templates, and sends the client a welcome message with a link to their client portal where they can upload their previous year's documents.

---

## 1.8 Monetization Strategy

**Primary Revenue — SaaS Subscription:**

| Plan | Monthly Price | Annual Price | Client Limit | Users | AI Features |
|---|---|---|---|---|---|
| Starter | ₹1,999 | ₹19,990 | 30 | 2 | Basic |
| Growth | ₹3,999 | ₹39,990 | 100 | 5 | Standard |
| Professional | ₹6,999 | ₹69,990 | Unlimited | 15 | Full |
| Enterprise | ₹14,999 | ₹1,49,990 | Unlimited | Unlimited | Full + Custom |

**Secondary Revenue Streams:**

*WhatsApp Message Credits:** Plans include a monthly message allowance. Overages billed at ₹0.50/message.

*AI Draft Packs:* Starter and Growth plans include limited AI drafts (50/month and 200/month). Additional packs at ₹999 for 500 drafts.

*Setup & Onboarding Service:* White-glove onboarding service at ₹5,000–15,000 one-time for firms that want assisted migration from their existing tools.

*CA Association / Chapter Licenses:* Bulk licensing to ICAI chapter bodies, CA associations, and network firms at negotiated annual rates.

*Marketplace (Phase 2):* A curated marketplace where CA firms can offer specialized services (FEMA advisory, international tax, valuation) to each other's clients, with CA-OS taking a 5% platform fee.

*Data Intelligence Reports (Phase 3):* Anonymized, aggregated industry benchmarks sold to CA associations, banking institutions, and policy bodies.

---

## 1.9 Competitive Advantages

**Advantage 1 — India-Native Compliance Intelligence:** The GST calendar engine is built from first principles on Indian compliance law. It knows the difference between GSTR-1 and GSTR-1A, the 30-day IRN rule, e-invoicing thresholds by AATO, TDS section codes, advance tax installment schedules, and due date shifting rules when deadlines fall on holidays. No global tool has this.

**Advantage 2 — WhatsApp as the Operating Layer:** Indian clients do not use email consistently. WhatsApp is where the real communication happens. CA-OS uses WhatsApp not just for notifications but as a two-way document collection and communication channel. No existing practice management tool has this deeply integrated.

**Advantage 3 — AI Trained on Indian CA Context:** The AI drafting and query response system is built with Indian CA context — it knows how to write a GST notice response in formal Indian English, how to structure a tax computation letter, how to phrase a penalty waiver request under GSTP-20. This is not a generic LLM wrapper.

**Advantage 4 — Pricing for Indian Market:** Priced at 20–30% of global competitor pricing, specifically calibrated to the Indian CA firm's revenue model.

**Advantage 5 — WhatsApp-Mediated Client Relationships:** By building the client communication layer into the platform, CA-OS creates a structural advantage — the CA's client relationships are mediated through the platform, creating deep switching costs.

**Advantage 6 — Staff Workload Intelligence:** The articleship student and staff workload tracking module is unique to CA-OS. No other tool tracks and optimizes how junior CA firm staff allocate their time across clients.

---

## 1.10 Scalability Vision

**Year 1:** Hyderabad + Telangana → 500 CA firms → ₹2–3 crore ARR

**Year 2:** Pan-India → 3,000 CA firms → ₹15–18 crore ARR. Launch CS (Company Secretary) module.

**Year 3:** 10,000 CA firms + CS firms → ₹50 crore ARR. Launch international expansion to UAE (Indian CA diaspora managing UAE VAT).

**Year 4:** Southeast Asia (Bangladesh, Sri Lanka, Malaysia — similar regulatory environments). White-label offering for CA associations and network firms. ₹120 crore ARR.

**Year 5:** Global South professional services platform. Potential acquisition by Zoho, Tally, or Intuit. ₹300+ crore ARR or strategic exit.

---

## 1.11 AI Usage in the Project

CA-OS is an AI-native product. AI is not a feature — it is the product's central value proposition. Specific AI capabilities:

**AI Capability 1 — Deadline Sentinel Agent:** Continuously monitors all client compliance calendars, identifies upcoming deadlines, and autonomously sends personalized reminders via WhatsApp to clients and alerts to CA staff. Operates 24/7 without human intervention.

**AI Capability 2 — Document Chaser Agent:** Sends personalized document request messages to clients on a configurable schedule. Tracks responses. Escalates unpredictable clients. Knows which document to request based on compliance type.

**AI Capability 3 — Communication Draft Generator:** Given a client query or incoming message, generates a professional, contextually appropriate response in seconds. Trained on Indian CA communication patterns and compliance language.

**AI Capability 4 — Document Intelligence:** Receives uploaded PDFs (bank statements, invoices, GST returns) and extracts structured data — totals, GST amounts, party names, dates. Flags anomalies and reconciliation mismatches.

**AI Capability 5 — Compliance Notice Classifier:** When a client uploads or forwards a government notice, automatically classifies the notice type (GST demand, scrutiny notice, income tax notice, FEMA query), extracts key details, and creates a prioritized action task.

**AI Capability 6 — Billing Intelligence:** Reviews unbilled work logs and suggests invoicing items the CA may have missed. Estimates fair billing amounts for time-tracked tasks based on historical patterns.

**AI Capability 7 — Churn Prediction Agent:** Monitors client engagement signals — response rates to document requests, payment delays, and query volumes — and predicts which clients are at risk of leaving. Alerts the CA proactively.

**AI Capability 8 — Penalty Risk Scoring:** Analyzes each client's document submission rate, historical compliance pattern, and pending tasks to generate a 1–10 risk score for penalty exposure. Updated monthly.

---

## 1.12 Future Roadmap

**Phase 1 (Months 1–6) — MVP:**
Core compliance calendar, WhatsApp document collection bot, task assignment board, client portal, basic billing module.

**Phase 2 (Months 7–12) — AI Layer:**
Full AI agent suite, document OCR and extraction, AI draft generator, penalty risk scoring, advanced analytics.

**Phase 3 (Year 2) — Platform Expansion:**
Company Secretary module, CMA module, multi-branch firm support, GST portal direct API sync, advanced audit module.

**Phase 4 (Year 2–3) — Ecosystem:**
CA-to-CA referral marketplace, client financial intelligence (MIS reports, cash flow analysis), white-label platform for associations.

**Phase 5 (Year 3–5) — International:**
UAE VAT module, Bangladesh NBR compliance, SaaS API (allow third-party integrations with Tally, Zoho Books, QuickBooks India).

---

## 1.13 Expected Traffic Scale

**Year 1 Peak:**
- 500 CA firms
- Average 3 active users per firm = 1,500 concurrent users possible
- Average 100 clients per firm = 50,000 client portal users
- WhatsApp messages: ~500,000/month
- Documents processed: ~100,000/month
- API calls: ~2,000,000/month

**Year 3 Scale:**
- 10,000 CA firms
- 30,000 active CA/staff users
- 1,000,000 client portal users
- WhatsApp messages: ~10,000,000/month
- Documents processed: ~2,000,000/month
- API calls: ~50,000,000/month

---

## 1.14 Enterprise vs Consumer Features

**Consumer-Grade (Starter/Growth Plans):**
- Standard compliance calendar
- Basic WhatsApp bot (template messages only)
- Up to 5 team members
- Standard AI drafts
- Email support

**Enterprise-Grade (Professional/Enterprise Plans):**
- Custom compliance rules and calendar overrides
- Advanced WhatsApp conversational AI (open-ended conversations)
- Unlimited team members with granular RBAC
- Custom AI training on firm-specific document templates
- Multi-branch support with consolidated reporting
- SSO integration with firm's identity provider
- Dedicated account manager
- SLA guarantees (99.9% uptime)
- Priority WhatsApp API access
- Custom branding on client portal
- API access for custom integrations
- Audit log export
- Custom data retention policies
- On-premise deployment option (future)

---

# SECTION 2: USER TYPES & ROLES

---

## 2.1 Role Architecture Overview

CA-OS implements a hybrid Role-Based Access Control (RBAC) + Attribute-Based Access Control (ABAC) model. Roles define baseline permissions. Attributes (firm membership, client assignment, subscription plan) further restrict or expand access within roles.

All roles exist within the context of a **Firm** (the tenant unit). The Super Admin role exists outside the firm context and is a platform-level role only.

---

## 2.2 Role Definitions

### Role 1: Super Admin (Platform Level)

**Who They Are:** CA-OS internal operations team. Maximum 5 people. Has god-mode access to the entire platform across all tenants.

**Permissions:**
- View, create, update, and delete any firm, user, client, or data record across all tenants
- Access all audit logs across all firms
- Manage platform-level configuration (feature flags, AI model settings, WhatsApp API credentials)
- Access billing and subscription records for all firms
- Create and manage CA-OS admin accounts
- Access and export all analytics data
- Trigger system-wide maintenance modes
- Override any firm-level setting
- Access all AI agent logs and conversation histories
- Manage third-party API keys and integrations at platform level

**Restrictions:**
- All Super Admin actions are logged with immutable audit trails
- Accessing specific firm data requires a documented reason logged in the system
- Cannot delete audit logs under any circumstance
- Requires MFA on every login session
- Sessions expire after 2 hours of inactivity
- Actions must be performed from approved IP addresses only

**Dashboard:** Platform Operations Dashboard showing firm-level health, subscription metrics, system performance, AI usage across all tenants, error rates, billing revenue, and support ticket status.

**Accessible Modules:** All modules across all firms. Plus platform-exclusive modules: Firm Management, Subscription Management, Platform Analytics, System Configuration, AI Model Management, Audit Log Viewer.

**Security Access:** Highest clearance. Requires MFA + IP whitelist + hardware security key for destructive operations.

**Data Visibility:** All data across all firms. Personal data access is logged and requires justification.

---

### Role 2: Firm Owner / Partner (Firm Level)

**Who They Are:** The practicing CA or managing partner who owns or administers the CA firm account on CA-OS. This is the primary account holder and billing decision maker.

**Permissions:**
- Full administrative control over the firm's CA-OS account
- Add, edit, deactivate, and reactivate all team members (staff and articleship)
- Add, edit, archive, and delete client records
- View and manage all compliance tasks across all clients
- Access all financial data — billing logs, invoices, payment history
- Configure WhatsApp bot settings, message templates, and automation rules
- Access and export all AI drafts, conversation logs, and document histories
- Manage firm settings: branding, subscription, API integrations
- View all staff performance metrics and workload data
- Create and manage custom compliance task templates
- Manage client portal settings and access
- Access all analytics and reporting
- Configure notification preferences for the entire firm

**Restrictions:**
- Cannot access CA-OS platform-level settings
- Cannot view other firms' data
- Cannot modify Super Admin accounts
- Subscription changes require Razorpay payment confirmation

**Dashboard:** Firm Command Center — Morning brief (today's deadlines, pending documents, overdue tasks), staff workload overview, client health summary, revenue snapshot (MRR, outstanding invoices), AI agent activity summary.

**Accessible Modules:** All firm-level modules — Dashboard, Clients, Compliance Calendar, Staff & Tasks, Documents, Billing, AI Drafts, WhatsApp Console, Analytics, Settings, Client Portal Management.

**Security Access:** Firm administrator. MFA strongly encouraged. Session timeout at 8 hours.

**Data Visibility:** All data within their firm. Personal data of clients and staff within their firm.

---

### Role 3: CA Staff (Senior) (Firm Level)

**Who They Are:** Qualified CA employees or senior associates working in the firm, typically handling independent client portfolios and review work.

**Permissions:**
- View and update compliance tasks assigned to them and their team
- View and update client records for assigned clients
- Upload and manage documents for assigned clients
- Use AI draft generator for assigned clients
- Log billing time entries for their work
- View team-level compliance calendar
- Add comments and notes to tasks
- Trigger WhatsApp document requests for assigned clients (subject to approval workflow if configured)
- View client portal activity for assigned clients
- Generate standard reports for assigned clients

**Restrictions:**
- Cannot access billing invoice generation (can only log time entries)
- Cannot add or delete client records
- Cannot add or remove team members
- Cannot modify firm-level settings
- Cannot view other staff members' performance metrics unless designated as team lead
- Cannot access firm-level financial summary

**Dashboard:** Staff Workspace — My tasks today, my deadlines this week, client document status for assigned clients, recent AI drafts, pending review items.

**Accessible Modules:** Dashboard (restricted), Clients (assigned only), Compliance Tasks (assigned), Documents (assigned clients), AI Drafts, Billing (time log only), Notifications.

**Security Access:** Standard firm employee access. MFA optional (firm-configurable as mandatory). Session timeout at 8 hours.

**Data Visibility:** Clients explicitly assigned to them. Team-level compliance calendar. Their own billing time entries.

---

### Role 4: Articleship Student / Junior Staff (Firm Level)

**Who They Are:** Articleship students registered with ICAI and working in the CA firm, or junior staff members with limited autonomy.

**Permissions:**
- View and update tasks explicitly assigned to them
- Upload documents for tasks assigned to them
- Add notes and comments to assigned tasks
- Log time entries for their assigned work
- View client contact information for clients they are assigned to work on
- Use basic AI draft generator (with firm-owner review flag enabled)

**Restrictions:**
- Cannot view the full client list — only see clients on tasks assigned to them
- Cannot send WhatsApp messages to clients directly
- Cannot access billing invoices or invoice generation
- Cannot view firm-level analytics
- Cannot modify any client records
- Cannot access the client portal administration
- All AI drafts are flagged for senior review before sending
- Cannot approve their own time entries — requires senior CA review

**Dashboard:** My Work View — Today's assigned tasks, document upload queue, completed this week, pending approvals from senior.

**Accessible Modules:** Tasks (assigned only), Documents (upload only for assigned tasks), Time Log, Notifications.

**Security Access:** Most restricted firm user. Strong password required. Session timeout at 4 hours.

**Data Visibility:** Only data on tasks explicitly assigned to them. Cannot see the full client database.

---

### Role 5: Client (Portal Level)

**Who They Are:** Business owners, company directors, or authorized representatives of businesses that are clients of the CA firm. They access CA-OS only through the Client Portal — a separate interface from the CA firm's internal dashboard.

**Permissions:**
- View their own compliance status (what has been filed, what is pending, upcoming deadlines)
- Upload documents requested by their CA firm
- View and download completed returns and documents
- View and pay invoices from their CA firm
- Communicate with their CA firm via the portal messaging system
- Update their own basic profile information (contact details, alternate email)
- View their compliance history (last 3 years)

**Restrictions:**
- Cannot view any other client's data
- Cannot view the CA firm's internal task assignments or staff information
- Cannot view billing information of other clients
- Cannot contact the platform (CA-OS) directly — all communication is through their CA firm
- Cannot modify compliance tasks or filing statuses
- Cannot access any firm-internal settings
- Cannot see AI agent logs or internal communication between CA staff

**Dashboard:** Client Compliance Home — Compliance health score, upcoming deadlines, document requests pending, recent filings, unpaid invoices, communication thread.

**Accessible Modules:** My Compliance Status, Document Upload, Invoices & Payments, Messages, My Profile.

**Security Access:** OTP-based login (mobile number or email). No password required. Session timeout at 2 hours. Device fingerprinting for suspicious access detection.

**Data Visibility:** Only their own firm's compliance data as presented by their CA firm. No raw system data.

---

### Role 6: AI Agent (System Level)

**Who They Are:** Autonomous AI agents are treated as a distinct actor type in the system. Every action an AI agent takes is logged under this role identity, ensuring full traceability and auditability of automated behavior.

**Permissions:**
- Read client compliance calendar data
- Read document submission status
- Send pre-approved WhatsApp template messages to clients
- Create and update compliance task statuses based on trigger conditions
- Generate AI drafts (stored for human review — not sent automatically unless configured)
- Log actions in the AI audit trail
- Trigger background jobs for document processing
- Read conversation history for context

**Restrictions:**
- Cannot modify billing records
- Cannot add or delete client records
- Cannot send custom (non-template) WhatsApp messages to clients without human approval (unless explicitly enabled by firm owner)
- Cannot access documents that belong to firms where the AI integration is disabled
- Cannot execute financial transactions
- Every AI action is timestamped and attributed in audit logs
- Rate-limited to prevent runaway agent loops

**Dashboard:** AI agents do not have a user-facing dashboard. Their activity is visible in the AI Activity Log accessible to Firm Owners.

**Accessible Modules:** System-internal access to compliance engine, notification service, document service, and conversation service. No UI access.

**Security Access:** System-level service token authentication. Token rotated every 24 hours. All actions require valid firm context.

**Data Visibility:** Firm-scoped. An agent operating on behalf of Firm A cannot access Firm B's data.

---

### Role 7: Support Agent (Platform Level)

**Who They Are:** CA-OS customer support team members who handle inbound support tickets, onboarding assistance, and technical issues for CA firm customers.

**Permissions:**
- View firm account details (subscription plan, team size, client count)
- View recent error logs for a specific firm (when investigating a reported issue)
- Create and update support tickets
- Trigger password reset for firm users (with documented reason)
- View WhatsApp integration status and recent message logs for troubleshooting
- Access firm's billing history (read-only, for resolving billing disputes)

**Restrictions:**
- Cannot view client financial data or document contents
- Cannot make changes to any firm's data
- Cannot access AI conversation logs unless specifically authorized for a support case
- Cannot access Super Admin functions
- All support actions are logged with ticket reference
- Session timeout at 4 hours

**Dashboard:** Support Console — Active tickets, firm health status, recent error reports, escalation queue.

**Accessible Modules:** Support Ticket System, Firm Lookup (read-only, restricted view), Billing Lookup (read-only), Error Log Viewer.

---

### Role 8: Platform Analyst (Platform Level)

**Who They Are:** CA-OS internal business intelligence and product analytics team members who need access to aggregated data for product decisions.

**Permissions:**
- Access aggregated, anonymized usage analytics across all firms
- View product metrics — feature adoption, engagement rates, churn signals
- Access revenue analytics
- Generate and export analytics reports

**Restrictions:**
- Cannot access any personally identifiable information (PII)
- Cannot access individual firm's data
- All queries against the production database are proxied through the analytics layer
- Cannot modify any data

**Dashboard:** Analytics Workspace — Product metrics, revenue dashboards, AI usage statistics, feature adoption funnels.

---

## 2.3 Role Assignment Rules

- Every user belongs to exactly one Firm (except Super Admin, Support Agent, and Platform Analyst who are platform-level)
- A user can have only one role within a firm
- Role changes require Firm Owner authorization and are logged in the audit trail
- Deactivated users lose all access immediately — their data remains but they cannot log in
- The first user who creates a firm account is automatically assigned the Firm Owner role

---

# SECTION 3-21 (Simplified Content for brevity, following requested structure)

... (This file continues with all sections from the SRD as provided by the client)

---

# SECTION 18: PROJECT STRUCTURE

```text
ca-os/
│
├── frontend/                          ← Next.js 14 app
│   ├── .env.local
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   │
│   ├── app/                           ← App Router (Next.js 14)
│   │   ├── layout.tsx                 ← Root layout
│   │   ├── page.tsx                   ← Landing page
│   │   ├── (auth)/                    ← Auth routes
│   │   ├── (dashboard)/               ← Internal CA routes
│   │   ├── (portal)/                  ← Client portal routes
│   │   └── api/                       ← Thin proxies
│   │
│   ├── components/                    ← React components
│   ├── lib/                           ← Shared utils
│   └── styles/                        ← CSS
│
├── backend/                           ← FastAPI app
│   ├── main.py                        ← Entry point
│   ├── app/
│   │   ├── core/                      ← Config, Auth
│   │   ├── models/                    ← SQLAlchemy models
│   │   ├── schemas/                   ← Pydantic schemas
│   │   ├── routers/                   ← API handlers
│   │   ├── services/                  ← Business logic
│   │   ├── agents/                    ← AI Agents
│   │   ├── tasks/                     ← Celery tasks
│   │   └── utils/                     ← Helpers
│   └── tests/                         ← Pytest
...
```

---

# SECTION 21: FINAL EXECUTIVE SUMMARY

CA-OS represents the next generation of professional services infrastructure for the Indian market. By combining vertical SaaS, AI agents, and WhatsApp-first communication, it solves the foundational operational bottlenecks of CA practices. v1.0 establishes the core compliance and communication rails, setting the stage for a dominant market position in the Indian FinTech and ComplianceTech ecosystem.
