# AURA — Bilingual News Portal

AURA is a bilingual English/Hindi editorial news portal with an admin newsroom. It uses **Node.js built-in modules and a local JSON file** for storage; it does not require Supabase, Firebase, or a paid API.

## Requirements
- Node.js 20+ (recommended)
- npm

## Run on Windows (PowerShell)
1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. In the VS Code terminal run:
   ```powershell
   npm install
   ```
4. Create a `.env` file in the project root by copying `.env.example`.
5. Change `ADMIN_PASSWORD` in `.env` to a long, unique password.
6. Start both the website and API:
   ```powershell
   npm run dev
   ```
7. Open the local address shown by Vite (normally `http://localhost:5173`).
8. Select the lock icon or open `/admin`. Default username is `admin`; use the password you set in `.env`.

## Publish an article
- Sign in at `/admin`.
- Select **New article**.
- Add an English headline and/or Hindi headline. Add summaries and article text in either language.
- Save as draft or publish. Published articles appear on the homepage.
- Articles are stored in `data/articles.json` and persist across restarts on the same machine.
- To back up your content, copy `data/articles.json`.

## How it works
- Frontend: React + Vite.
- Backend: Node.js `http` server (no Express required).
- Authentication: server-side session cookie marked HttpOnly and SameSite=Strict; sessions expire after 8 hours.
- Storage: local JSON file, no external database or API.

## Important limitations
This is suitable for local development and a single server with persistent local storage. It is **not a managed cloud database**. If deployed to a free hosting service that sleeps, uses ephemeral storage, or runs multiple instances, articles/sessions may not persist or may differ between instances. For a public production news site, use a host with persistent storage and HTTPS, set a strong admin password, and configure rate limiting/backups before launch. Do not commit `.env` to a public repository.

## Troubleshooting
- If the website opens but the API fails, make sure `npm run dev` is running both processes and check the terminal for the API message.
- If port 8787 is already occupied, set `API_PORT=8788` in `.env` and update the proxy target in `vite.config.ts` to match.
