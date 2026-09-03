# 🚀 Rise With Media — Agency CRM & Marketing Operating System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![E2E Testing](https://img.shields.io/badge/Playwright-100%25%20Passing%20(39%20Tests)-darkgreen.svg?style=for-the-badge&logo=playwright)](https://playwright.dev/)
[![API Testing](https://img.shields.io/badge/Postman-100%25%20Passing%20(27%20Checks)-orange.svg?style=for-the-badge&logo=postman)](https://www.postman.com/)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg?style=for-the-badge)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-informational.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)

An enterprise-grade, production-ready full-stack Operating System built specifically for modern digital marketing agencies and media firms. Combines advanced CRM pipeline operations, team workflow tracking, multi-currency finance & invoicing, and a complete **Social Media Marketing (SMM) Command Center** with live ad spend tracking, campaign optimization, and report export engines.

---

## 🌟 Key Platform Modules

```
                    ┌────────────────────────────────────────────────────────┐
                    │       Rise With Media Agency CRM & Marketing OS        │
                    └───────────────────────────┬────────────────────────────┘
                                                │
       ┌────────────────────────┬───────────────┴───────────────┬────────────────────────┐
       │                        │                               │                        │
┌──────▼──────┐          ┌──────▼──────┐                 ┌──────▼──────┐          ┌──────▼──────┐
│  Agency CRM │          │ SMM Center  │                 │  Operations │          │   Finance   │
├─────────────┤          ├─────────────┤                 ├─────────────┤          ├─────────────┤
│ • Leads     │          │ • Content OS│                 │ • Tasks     │          │ • Invoices  │
│ • Clients   │          │ • Campaigns │                 │ • Calendar  │          │ • Expenses  │
│ • Vault     │          │ • Ad Sets   │                 │ • SOP Hub   │          │ • Cashflow  │
│ • Followups │          │ • Ads       │                 │ • HR/EOD    │          │ • Renewals  │
│ • Referrals │          │ • Budget OS │                 │ • Team Chat │          │ • Retainers │
└─────────────┘          └─────────────┘                 └─────────────┘          └─────────────┘
```

### 1. Social Media Marketing (SMM) Command Center
- **Ad Budget Dashboard (`/smm/budget`)**:
  - Track **Amount Added vs. Amount Spent** across daily ad spend entries.
  - **4-Level Hierarchy Selection**: Drill down or log entries at **Client → Project → Campaign → Ad** levels.
  - **6 Live Real-Time KPIs**: Total Added (₹), Total Spent (₹), Available Balance (₹), Total Leads, WhatsApp/DM Messages, and ROAS.
  - **Live Spend Alerts**: Visual progress bars with smart threshold detection (🔴 `90%+` Budget Exhausted, 🟡 `75%+` High Spend, 🟢 Healthy).
  - **Spend Anomaly Detection**: Automatic spike detection flagging abnormal spikes compared against past 7-day averages.
  - **Audit Notes & Observations**: Log operational notes and audit trails alongside budgets.
  - **One-Click CSV Export**: Download comprehensive CSV budget sheets formatted with currency, platforms, and metrics.
- **Campaigns & Video Engine (`/smm/campaigns`)**:
  - Multi-platform support (Facebook, Instagram, Google, LinkedIn, YouTube, TikTok).
  - Goal tracking: Leads, Sales, Traffic, Engagement, Awareness, App Promotion.
- **Dynamic Ad Sets (`/smm/adsets`)**:
  - Context-aware destination types mapped directly to campaign objectives (Calls, WhatsApp/Messages, Instagram/Facebook Direct, Instant Forms, App Installs).
- **Ad Creative Manager (`/smm/ads`)**:
  - Creative versioning, automated CTA defaulting, preview cards, and source video linking.

### 2. Agency CRM & Client Relations
- **Lead Pipeline**: Kanban stages, quick qualification, lead scorecards, and automated assignment.
- **Client Vault**: Secure encrypted storage for client assets, portal access credentials, and brand guidelines.
- **Automated Follow-ups**: Scheduled follow-up reminders, engagement history, and client call logs.
- **Referral Hub**: Track partner referrals, referral commissions, and inbound lead sources.

### 3. Project Management & Team Workflows
- **ClickUp-style Task Board**: Kanban boards, list views, priority tags, rework flags, and review status.
- **Interactive Calendar**: Unified drag-and-drop scheduling across DM activities, content releases, and team tasks.
- **Standard Operating Procedures (SOPs)**: Centralized company playbooks and training documentation.
- **HR & Attendance**: One-click clock in/out, End-of-Day (EOD) work reports, and manager review logs.

### 4. Financial Status & Billing
- **Invoice Generator**: Tax-compliant multi-item invoices with PDF generation and client download portals.
- **Expense Tracking**: Operational expenses, domain/hosting renewals, vendor payouts, and net profit analytics.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Core** | React 18 (Vite 5) | Blazing-fast component architecture with pure JavaScript |
| **State Management** | Redux Toolkit & React Query | Global state for auth/UI, server state synchronization |
| **Styling & Design** | Tailwind CSS & Framer Motion | Premium responsive UI with custom dark mode and micro-interactions |
| **Backend API** | Node.js & Express | Modular RESTful API architecture with async error handlers |
| **Database** | MongoDB & Mongoose | Schematized data modeling with indexed relational population |
| **Real-time Engine**| Socket.io | Live notifications and real-time status updates |
| **E2E Testing** | Playwright | Full multi-browser end-to-end automation suite |
| **API Testing** | Postman / Newman | Automated collection runner with assertion tests |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance running on port `27017` or MongoDB Atlas URI
- **npm**: v9.0.0 or higher

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/agency-crm.git
cd agency-crm
```

---

### Step 2: Backend Setup & Configuration
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/agency_crm
JWT_SECRET=super-secret-jwt-key-for-development-32char
JWT_REFRESH_SECRET=super-secret-refresh-key-for-development
ENCRYPTION_KEY=rise-with-media-development-key-32c
DEFAULT_ADMIN_NAME="DINESH M"
DEFAULT_ADMIN_EMAIL=admin@agencycrm.com
DEFAULT_ADMIN_PASSWORD=password123
```

Seed initial accounts and default data:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
# Server will start on http://localhost:5000
```

---

### Step 3: Frontend Setup & Configuration
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
# Client will be live on http://localhost:5173
```

---

## 🔑 Default Seeded Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@agencycrm.com` | `password123` | Full system access & admin tools |
| **Manager** | `manager@agencycrm.com` | `password123` | Projects, SMM, and team approvals |
| **Employee** | `employee@agencycrm.com` | `password123` | Tasks, attendance, content logging |
| **Client** | `client@agencycrm.com` | `password123` | Client portal, invoices, approvals |

---

## 🧪 Comprehensive Testing Suites

This project includes **100% automated test coverage** across both API and browser levels.

### 1. Postman API Suite (via Newman)
A complete 12-request integration test suite verifying authentication, auto-provisioning, SMM hierarchy CRUD, budget calculations, and CSV reports:
```bash
# Run against local backend (http://localhost:5000)
npx newman run "backend/tests/postman/SMM_AdBudget_API.postman_collection.json"
```
- **Total Assertions**: 27
- **Pass Rate**: 100%

### 2. Playwright End-to-End (E2E) Browser Tests
Tests user interactions, cascading dropdowns, form submissions, and modals across Chromium:
```bash
cd frontend

# Run all Playwright test suites
npx playwright test

# Run the SMM Ad Budget Dashboard suite specifically
npx playwright test e2e/budget-dashboard.spec.js

# Run with interactive UI mode
npx playwright test --ui

# View HTML test execution report
npm run test:e2e:report
```

---

## 📁 Repository Directory Structure

```text
COMPANY/
├── backend/
│   ├── config/              # Database connection & socket configuration
│   ├── controllers/         # Core business logic
│   │   ├── smm/             # SMM controllers (Ad Spend, Campaigns, Ads, Sets)
│   │   └── ...              # CRM, Finance, Task, HR controllers
│   ├── middleware/          # JWT auth, error handlers, upload validators
│   ├── models/              # Mongoose schemas & indexes
│   │   ├── smm/             # SMM domain models (AdSpend, Campaign, Ad, etc.)
│   │   └── ...              # Core CRM models (Client, Project, Task, etc.)
│   ├── routes/              # Express API route registrations
│   ├── tests/
│   │   └── postman/         # Postman collections & automated test runs
│   ├── utils/               # Seed scripts, activity loggers, notification helpers
│   └── index.js             # Main server entry point
│
├── frontend/
│   ├── e2e/                 # Playwright test specs
│   │   ├── budget-dashboard.spec.js
│   │   ├── full-project.spec.js
│   │   └── ...
│   ├── src/
│   │   ├── api/             # Axios API client instances
│   │   ├── components/      # Reusable UI components & layouts
│   │   ├── pages/
│   │   │   ├── smm/         # SMM pages (AdBudgetDashboard, Campaigns, etc.)
│   │   │   └── ...          # CRM, Finance, Task, HR pages
│   │   ├── store/           # Redux Toolkit state slices
│   │   ├── App.jsx          # Top-level routing & layout shell
│   │   └── main.jsx         # React application entry point
│   ├── playwright.config.js # Playwright test runner configuration
│   ├── tailwind.config.js   # Tailwind custom design system & theme tokens
│   └── vite.config.js       # Vite build & plugin settings
│
└── README.md                # Project documentation
```

---

## 🚢 Production Deployment Checklist

1. **Frontend Production Build**:
   ```bash
   cd frontend
   npm run build
   ```
   Generates optimized assets inside `frontend/dist/`.
2. **Environment Configuration**:
   - Set `NODE_ENV=production` in `backend/.env`.
   - Replace development `JWT_SECRET` and `ENCRYPTION_KEY` with secure 32+ character secrets.
   - Configure MongoDB Atlas connection string in `MONGO_URI`.
3. **Process Management**:
   - Use **PM2** to run the backend: `pm2 start index.js --name agency-crm-api`.
   - Serve frontend assets via Nginx or Vercel/Netlify with reverse proxy to `/api`.

---

## 📄 License & Intellectual Property

Proprietary Software. Developed for **Rise With Media**. All rights reserved. Unauthorized copying, distribution, or reproduction is strictly prohibited.
