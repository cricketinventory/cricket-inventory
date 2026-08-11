# Kit & Caboodle — Cricket Inventory

A small multi-user inventory app for tracking cricket gear: what you **have**, what you **used to have**, and what you **want to buy**. An admin creates accounts (up to 10 users), and each user gets their own private inventory with a full history log.

```
cricket-inventory/
├── backend/    Node.js + Express + SQLite API (auth, users, items, history)
├── frontend/   React + Vite single-page app
└── .github/workflows/deploy-frontend.yml   auto-deploys frontend to GitHub Pages
```

## Important: GitHub Pages only hosts the frontend

GitHub Pages serves static files only — it can't run the Node/SQLite backend, real logins, or a shared database. So this project deploys in two pieces:

- **Backend** → a free host that can run Node, e.g. [Render](https://render.com) (instructions below)
- **Frontend** → GitHub Pages (free, and the included GitHub Action deploys it automatically)

The frontend just needs to know the backend's URL, set once as `VITE_API_URL`.

---

## 1. Run it locally first

**Backend**
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set JWT_SECRET to any long random string,
# and ADMIN_PASSWORD to whatever you want the first admin login to be
npm start
```
The API runs on `http://localhost:4000`. On first boot it automatically creates an admin account using `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`, and creates a local `data.sqlite` file for storage — leave `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` blank in `.env` for local dev, no Turso account needed.

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000 by default
npm run dev
```
Open `http://localhost:5173`, log in with your admin credentials, and add your first user from **Manage users**.

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

## 3. Set up your database (Turso, free)

Render's free tier has no persistent disk, so the database needs to live somewhere else — [Turso](https://turso.tech) hosts SQLite-compatible databases for free and your data survives restarts and redeploys.

1. Go to [turso.tech](https://turso.tech) and sign up (no credit card needed for the free tier)
2. Create a database (via their dashboard, or the CLI: `turso db create cricket-inventory`)
3. Get your connection details:
   - **Database URL**: dashboard → your database → shows something like `libsql://cricket-inventory-<you>.turso.io`
   - **Auth token**: dashboard → your database → **Create Token**
4. Keep both values handy for the next step.

(Skip this step if you just want to test locally first — without these two variables set, the app automatically uses a local `data.sqlite` file instead, no Turso account needed for local dev.)

## 4. Deploy the backend (Render, free tier)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**, and point it at your GitHub repo. Render will read `render.yaml` at the repo root and configure the service automatically.
2. Render will ask you to set these values (marked `sync: false` in `render.yaml`):
   - `ADMIN_PASSWORD` — the password for your admin login
   - `CORS_ORIGIN` — your GitHub Pages URL, e.g. `https://<your-username>.github.io` (you can update this after step 5 once you know the exact URL)
   - `TURSO_DATABASE_URL` — from step 3
   - `TURSO_AUTH_TOKEN` — from step 3
3. Deploy. Render gives you a URL like `https://cricket-inventory-api.onrender.com` — copy it, you'll need it next.

**Note on the free tier:** Render's free web services spin down after inactivity and take ~30–60 seconds to wake up on the next request. That's normal and just affects speed, not your data — since the database is on Turso now, your data survives regardless of Render sleeping, redeploying, or restarting.

---

## 5. Deploy the frontend (GitHub Pages)

1. In your GitHub repo: **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**:
   - Name: `VITE_API_URL`
   - Value: your Render backend URL from step 4, e.g. `https://cricket-inventory-api.onrender.com`
3. Push any change to `frontend/` (or go to **Actions** tab and run the "Deploy frontend to GitHub Pages" workflow manually).
4. Your app will be live at `https://<your-username>.github.io/<your-repo>/`.
5. Go back to Render and update `CORS_ORIGIN` to exactly that GitHub Pages URL (without a trailing path), then redeploy the backend so it accepts requests from your live frontend.

---

## Using the app

- **Admin** logs in first (credentials from `ADMIN_PASSWORD`/`ADMIN_USERNAME`), goes to **Manage users**, and creates up to 10 accounts with temporary passwords. Users should change their password after first login (via the API's `/api/auth/change-password` — a "change password" UI button is a natural next addition if you want it).
- **Each user** sees only their own inventory: items marked **Have**, **Had**, or **Want to buy**, with quantity, price, and notes.
- **History** tracks every add, status change, quantity change, and removal automatically — this is your "what we used to have" record.
- **Admin** can also view (and manage) any individual user's inventory and history from a dropdown on those pages, without needing that user's password.

## Security

This app has been hardened with the basics that matter most for a small self-hosted tool:

- **Passwords** are hashed with bcrypt (never stored in plain text), minimum 8 characters
- **Login is rate-limited** — 10 attempts per 15 minutes per IP, to slow down brute-force guessing
- **The server refuses to start** with a missing, default, or short `JWT_SECRET` — a weak secret would let anyone forge login tokens, including as admin
- **Security headers** are set via `helmet` (blocks common attacks like clickjacking, MIME sniffing)
- **CORS is locked down** to `CORS_ORIGIN` — only your actual frontend URL can call the API (don't leave this as `*` in production)
- **SQL injection isn't possible** — all queries use parameterized statements, never string-concatenated SQL
- **XSS is mitigated by default** — React escapes rendered content automatically; nothing in this app injects raw HTML

**Things you should still do yourself:**

1. **Generate a real `JWT_SECRET`** rather than typing something short — run this and paste the result into `.env` / your Render environment variable:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. **Set a strong `ADMIN_PASSWORD`** before deploying — never leave it as the example value. The server will warn on boot if it's still the default.
3. **Never commit `.env`** — it's already gitignored, but double-check `git status` before your first push.
4. **Set `CORS_ORIGIN` to your exact GitHub Pages URL** in production, not `*`.
5. **Enable 2FA** on your GitHub and Render accounts — those are now the keys to your users' data.
6. **Keep dependencies updated** occasionally: `npm audit` and `npm outdated` in both `backend` and `frontend`.
7. **Back up your data** periodically — Turso's dashboard supports exporting/downloading your database, which is worth doing occasionally even though Turso itself is durable storage, not a backup service.
8. If someone leaves the team, **deactivate or delete their account** from Manage users rather than just telling them not to log in.

---

## Data model

- `users`: `admin` role (created from env) + up to 10 `user` role accounts
- `items`: `have` / `had` / `want_to_buy`, scoped to one user each
- `item_history`: automatic log entry on every create/update/delete

## Extending it

Some natural next steps if you want to keep building:
- Add a "change my password" button in the UI (the backend endpoint already exists)
- Add categories/filters specific to your club's gear
- Add CSV export of an inventory or history log
- Swap SQLite for Postgres if the team grows past a handful of concurrent users# Kit & Caboodle — Cricket Inventory

A small multi-user inventory app for tracking cricket gear: what you **have**, what you **used to have**, and what you **want to buy**. An admin creates accounts (up to 10 users), and each user gets their own private inventory with a full history log.

```
cricket-inventory/
├── backend/    Node.js + Express + SQLite API (auth, users, items, history)
├── frontend/   React + Vite single-page app
└── .github/workflows/deploy-frontend.yml   auto-deploys frontend to GitHub Pages
```

## Important: GitHub Pages only hosts the frontend

GitHub Pages serves static files only — it can't run the Node/SQLite backend, real logins, or a shared database. So this project deploys in two pieces:

- **Backend** → a free host that can run Node, e.g. [Render](https://render.com) (instructions below)
- **Frontend** → GitHub Pages (free, and the included GitHub Action deploys it automatically)

The frontend just needs to know the backend's URL, set once as `VITE_API_URL`.

---

## 1. Run it locally first

**Backend**
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set JWT_SECRET to any long random string,
# and ADMIN_PASSWORD to whatever you want the first admin login to be
npm start
```
The API runs on `http://localhost:4000`. On first boot it automatically creates an admin account using `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`.

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000 by default
npm run dev
```
Open `http://localhost:5173`, log in with your admin credentials, and add your first user from **Manage users**.

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

## 3. Deploy the backend (Render, free tier)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**, and point it at your GitHub repo. Render will read `render.yaml` at the repo root and configure the service automatically.
2. Render will ask you to set two secret values (marked `sync: false` in `render.yaml`):
   - `ADMIN_PASSWORD` — the password for your admin login
   - `CORS_ORIGIN` — your GitHub Pages URL, e.g. `https://<your-username>.github.io` (you can update this after step 4 once you know the exact URL)
3. Deploy. Render gives you a URL like `https://cricket-inventory-api.onrender.com` — copy it, you'll need it next.

**Note on the free tier:** Render's free web services spin down after inactivity and take ~30–60 seconds to wake up on the next request. The attached disk (`data.sqlite`) persists your data between deploys and restarts. If your team needs always-on/instant access, Render's cheapest paid tier removes the spin-down.

---

## 4. Deploy the frontend (GitHub Pages)

1. In your GitHub repo: **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**:
   - Name: `VITE_API_URL`
   - Value: your Render backend URL from step 3, e.g. `https://cricket-inventory-api.onrender.com`
3. Push any change to `frontend/` (or go to **Actions** tab and run the "Deploy frontend to GitHub Pages" workflow manually).
4. Your app will be live at `https://<your-username>.github.io/<your-repo>/`.
5. Go back to Render and update `CORS_ORIGIN` to exactly that GitHub Pages URl (without a trailing path), then redeploy the backend so it accepts requests from your live frontend.

---

## Using the app

- **Admin** logs in first (credentials from `ADMIN_PASSWORD`/`ADMIN_USERNAME`), goes to **Manage users**, and creates up to 10 accounts with temporary passwords. Users should change their password after first login (via the API's `/api/auth/change-password` — a "change password" UI button is a natural next addition if you want it).
- **Each user** sees only their own inventory: items marked **Have**, **Had**, or **Want to buy**, with quantity, price, and notes.
- **History** tracks every add, status change, quantity change, and removal automatically — this is your "what we used to have" record.
- **Admin** can also view (and manage) any individual user's inventory and history from a dropdown on those pages, without needing that user's password.

## Security

This app has been hardened with the basics that matter most for a small self-hosted tool:

- **Passwords** are hashed with bcrypt (never stored in plain text), minimum 8 characters
- **Login is rate-limited** — 10 attempts per 15 minutes per IP, to slow down brute-force guessing
- **The server refuses to start** with a missing, default, or short `JWT_SECRET` — a weak secret would let anyone forge login tokens, including as admin
- **Security headers** are set via `helmet` (blocks common attacks like clickjacking, MIME sniffing)
- **CORS is locked down** to `CORS_ORIGIN` — only your actual frontend URL can call the API (don't leave this as `*` in production)
- **SQL injection isn't possible** — all queries use parameterized statements, never string-concatenated SQL
- **XSS is mitigated by default** — React escapes rendered content automatically; nothing in this app injects raw HTML

**Things you should still do yourself:**

1. **Generate a real `JWT_SECRET`** rather than typing something short — run this and paste the result into `.env` / your Render environment variable:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. **Set a strong `ADMIN_PASSWORD`** before deploying — never leave it as the example value. The server will warn on boot if it's still the default.
3. **Never commit `.env`** — it's already gitignored, but double-check `git status` before your first push.
4. **Set `CORS_ORIGIN` to your exact GitHub Pages URL** in production, not `*`.
5. **Enable 2FA** on your GitHub and Render accounts — those are now the keys to your users' data.
6. **Keep dependencies updated** occasionally: `npm audit` and `npm outdated` in both `backend` and `frontend`.
7. **Back up `backend/data.sqlite`** periodically if the inventory data matters to you — Render's disk persists it, but isn't a backup.
8. If someone leaves the team, **deactivate or delete their account** from Manage users rather than just telling them not to log in.

---

## Data model

- `users`: `admin` role (created from env) + up to 10 `user` role accounts
- `items`: `have` / `had` / `want_to_buy`, scoped to one user each
- `item_history`: automatic log entry on every create/update/delete

## Extending it

Some natural next steps if you want to keep building:
- Add a "change my password" button in the UI (the backend endpoint already exists)
- Add categories/filters specific to your club's gear
- Add CSV export of an inventory or history log
- Swap SQLite for Postgres if the team grows past a handful of concurrent users
