# Agron Customer Management

An agricultural CRM portal to manage customer records.

## Project Structure

```
/ (root)
├── api/                    ← Vercel Serverless API (Node.js/Express)
│   ├── index.js            ← Main API handler (all /api/* routes)
│   ├── database.js         ← Turso/libSQL database connection
│   └── authMiddleware.js   ← Bearer token auth
│
├── frontend/               ← React + Vite frontend
│   ├── src/
│   │   ├── App.jsx         ← Main app component
│   │   ├── api.js          ← Shared fetch wrapper
│   │   └── index.css       ← Global styles
│   ├── index.html
│   └── package.json
│
├── package.json            ← Root package (api dependencies)
└── vercel.json             ← Vercel deployment config
```

> **Note:** The `agron-customers/` and `backend/` folders are legacy local-only 
> versions and are NOT used in production. Only `api/` and `frontend/` matter for Vercel.

## Vercel Deployment

### 1. Set up Turso database
1. Create a free account at [turso.tech](https://turso.tech)
2. Create a database: `turso db create agron-customers`
3. Get your credentials:
   - URL: `turso db show agron-customers --url`
   - Token: `turso db tokens create agron-customers`

### 2. Set Environment Variables in Vercel
In your Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://your-db-url.turso.io` |
| `TURSO_AUTH_TOKEN` | `your-turso-auth-token` |
| `PORTAL_ACCESS_TOKEN` | `agron_secure_token_2024` |

### 3. Deploy
Push to GitHub — Vercel auto-deploys on every push.

## Local Development

### Start backend (local Express server):
```bash
cd agron-customers
npm start
```

### Start frontend:
```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:3000`.
