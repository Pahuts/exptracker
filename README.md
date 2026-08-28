# House Budget · Expense Tracker

A full-stack expense tracker.
Full CRUD over a cloud Postgres database, plus a dashboard with summary cards and charts.

## Stack
- **Backend:** Node.js + Express REST API
- **Database:** PostgreSQL (Neon recommended)
- **Frontend:** Vanilla HTML/CSS/JS with [Chart.js](https://www.chartjs.org/)

## Getting started

```powershell
npm install      # install dependencies
npm run seed     # load the initial records from your House Budget CSV
npm start        # start the server
```

Then open http://localhost:3000

> Requires `DATABASE_URL` (your Neon Postgres connection string).

> Re-seed from scratch (wipes existing rows): `npm run seed -- --force`

## Features
- **CRUD:** add, edit, delete, and filter expenses (by category, payer, status, year, or search text).
- **Categories** modelled from the CSV: `Titling Fee`, `Downpayment`, `House Dues`, `UB Loan`.
- **Dashboard:** total budget, paid, outstanding, and % progress cards.
- **Charts:** monthly payments + cumulative line, paid-vs-unpaid by category, status doughnut, contribution by payer.

## API

| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/expenses`      | List (filters: category, payer, status, year, q) |
| GET    | `/api/expenses/:id`  | Get one                              |
| POST   | `/api/expenses`      | Create                               |
| PUT    | `/api/expenses/:id`  | Update                               |
| DELETE | `/api/expenses/:id`  | Delete                               |
| GET    | `/api/stats`         | Aggregates for dashboards            |

## Deploying online (Render)

GitHub Pages can't host this app because it needs a running Node server and a
database. Render runs the Node backend directly, and Neon stores the data in
the cloud, so you do not need Render paid persistent disk. The repo includes a
[`render.yaml`](render.yaml) blueprint.

### 1. Push to GitHub
```powershell
git init
git add .
git commit -m "Expense tracker"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
> `node_modules/`, `data/`, and `.env` are gitignored and won't be uploaded.

### 2. Generate your password hash
The login password is stored only as a scrypt hash + salt — never plaintext.
Generate values for your password:
```powershell
npm run hash-password -- "your-password-here"
```
Copy the printed `PASSWORD_SALT` and `PASSWORD_HASH`.

### 3. Create the service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml` automatically.
3. When prompted, set env vars:
   - `DATABASE_URL` — your Neon connection string
   - `PASSWORD_SALT` — from step 2
   - `PASSWORD_HASH` — from step 2
   - (`SESSION_SECRET` is generated automatically.)
4. Click **Apply**. Render builds, seeds the database, and starts the server.

Your site will be live at `https://<your-app>.onrender.com` over HTTPS, protected
by your password.

> **Note:** Render's free tier sleeps after inactivity, so the first visit after
> a while may take ~30s to wake up. Data persists in Neon, so it survives
> restarts/redeploys even on free Render without a disk.

### Environment variables
See [`.env.example`](.env.example) for the full list:

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `NODE_ENV`       | `production` enables the Secure cookie flag          |
| `DATABASE_URL`   | Neon/Postgres connection string                      |
| `SESSION_SECRET` | Signs session cookies (auto-generated on Render)     |
| `PASSWORD_SALT`  | Salt for the login password hash                     |
| `PASSWORD_HASH`  | scrypt hash of the login password                    |

Locally, set `DATABASE_URL` before running `npm run seed` or `npm start`.

