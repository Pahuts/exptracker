# House Budget · Expense Tracker

A full-stack expense tracker for the Grand Royale (Malolos, Bulacan) house budget.
Full CRUD over a persistent SQLite database, plus a dashboard with summary cards and charts.

## Stack
- **Backend:** Node.js + Express REST API
- **Database:** SQLite via `better-sqlite3` (file stored in `data/expenses.db`, so data persists)
- **Frontend:** Vanilla HTML/CSS/JS with [Chart.js](https://www.chartjs.org/)

## Getting started

```powershell
npm install      # install dependencies
npm run seed     # load the initial records from your House Budget CSV
npm start        # start the server
```

Then open http://localhost:3000

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
database. Render runs the Node backend directly with a persistent disk, so it's
the simplest option. The repo includes a [`render.yaml`](render.yaml) blueprint.

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
3. When prompted, set the two secret env vars:
   - `PASSWORD_SALT` — from step 2
   - `PASSWORD_HASH` — from step 2
   - (`SESSION_SECRET` and `DATA_DIR` are configured automatically.)
4. Click **Apply**. Render builds, seeds the database, and starts the server.

Your site will be live at `https://<your-app>.onrender.com` over HTTPS, protected
by your password.

> **Note:** Render's free tier sleeps after inactivity, so the first visit after
> a while may take ~30s to wake up. The 1 GB persistent disk keeps your data
> across restarts and redeploys.

### Environment variables
See [`.env.example`](.env.example) for the full list:

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `NODE_ENV`       | `production` enables the Secure cookie flag          |
| `DATA_DIR`       | Path to persistent storage for the DB + cookie secret |
| `SESSION_SECRET` | Signs session cookies (auto-generated on Render)     |
| `PASSWORD_SALT`  | Salt for the login password hash                     |
| `PASSWORD_HASH`  | scrypt hash of the login password                    |

Locally, none are required — the app falls back to sane defaults so `npm start` just works.

