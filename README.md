# DevHibernate

A local development-project hibernation tool. Remove approved, recreatable dependencies from shelved projects while retaining source, configuration, and local data — then record how to resume work.

**Promise: Keep the project. Release the resources. Return when ready.**

## How It Works

DevHibernate works on a simple chain:

```
Root → Project → Scan → Candidate → Plan → Operation → Resume Record
```

| Step | What Happens |
|---|---|
| **Root** | User registers a folder on their machine |
| **Project** | Standalone project discovered by markers (e.g. `package.json`) |
| **Scan** | Metadata-only pass — filenames and sizes, never file contents |
| **Candidate** | A directory that could be removed (e.g. `node_modules`) |
| **Plan** | Local AI assessment with recommendation and restart checklist |
| **Operation** | Actual deletion, journaled per-target with idempotency |
| **Resume Record** | Instructions for getting the project running again |

## Privacy Contract

- The scanner never reads project file contents
- The local AI receives only a restricted inventory — never `.env`, source, credentials, or absolute paths
- Secrets are never opened, sent to a model, placed in telemetry, or logged
- Dependency installation and the application runtime are separate operations

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — the server runs at http://127.0.0.1:4317.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start UI + server in development |
| `npm run build` | Build UI and server for production |
| `npm run start` | Run built app on loopback |
| `npm run lint` | Lint all code |
| `npm run typecheck` | TypeScript checks |
| `npm run test` | Unit + integration tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Architecture

- **UI:** React + TypeScript + Vite
- **API:** Express + TypeScript on Node 24 LTS
- **State:** SQLite via better-sqlite3
- **Validation:** Zod
- **AI:** Ollama (gemma3:1b), local only

## License

2026 — All rights reserved. wamzii.com