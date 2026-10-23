# Medical Operations Intelligence Dashboard & Automation System

This clean build is designed from the supplied reference screenshot. It uses React + Vite on the frontend, Express + MongoDB on the backend, Recharts for analytics, JWT demo authentication, and a local demo AI copilot when no OpenAI key is supplied.

## Requirements
- Windows 10/11
- Node.js 20+ (Node 24 works)
- MongoDB Community Server running locally on port 27017

## First setup
Open Command Prompt in the project folder:

```cmd
npm install
npm run install:all
npm run seed
npm run dev
```

If `npm run install:all` fails because a package is already installed, run:

```cmd
cd server
npm install
cd ..
cd client
npm install
cd ..
```

## Login
- Email: `admin@medops.local`
- Password: `Demo@12345`
- Display name: **Gandhe Varshitha**

Other demo users:
- doctor@medops.local / Demo@12345
- billing@medops.local / Demo@12345
- pharmacy@medops.local / Demo@12345

## Start
Run only this from the root folder:

```cmd
npm run dev
```

Do NOT start `server` separately when using the root command. It starts both the API on `http://localhost:5000` and the frontend on `http://localhost:5173`.

## Design
The home page intentionally follows the supplied reference: dark navy sidebar, blue medical branding, six KPI cards, patient trend, revenue by department, patient flow donut, facility comparison, AI executive summary, module cards, alerts, KPIs, quick actions, right-side AI copilot, and workflow automation.

All visible dashboard controls have an action: navigation, tabs, selectors, search, notifications, profile menu, theme toggle, report download, AI prompts, alert rows, quick actions, workflow steps, module cards and page controls.

Data is synthetic demo data. It is not real patient information and should not be used for clinical decision-making.
