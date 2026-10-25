<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-horizontal-dark.svg">
    <img src="docs/assets/logo-horizontal-light.svg" alt="DevHibernate" width="340">
  </picture>
</p>

<p align="center"><strong>Let your projects rest.</strong></p>

[![Node](https://img.shields.io/badge/Node-24_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Ollama](https://img.shields.io/badge/Ollama-gemma3:1b-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-5B47C8?style=for-the-badge)](LICENSE)

## You have a perfectly reasonable number of side projects

Each one, however, invited an entire `node_modules` to move in — rent-free, indefinitely, and with no plans to leave. The experiment you were "just trying quickly" has apparently signed a long-term lease. Your SSD is now a dependency Airbnb, and you are funding everyone's accommodation.

**DevHibernate** puts a shelved project to sleep. It clears the recreatable dependency clutter and keeps everything you actually care about — your source, your Git history, your lockfiles, and (very much) your `.env`.

> Hibernation isn't deletion. It's *"release the stuff you can `npm install` back, keep the stuff you can't."*

## How it works

Point it at a folder. It takes a look, drafts a plan, you say yes, it tidies up, and it leaves you a note on how to wake the project later.

```
Register a folder  →  Scan (filenames + sizes only)  →  Local AI drafts a plan
     →  You review  →  Approved cleanup runs  →  Resume guide for later
```

## Your code never leaves your laptop

Metadata only. The scanner never opens your files. The local model never sees your source, your secrets, or your `.env` — it gets IDs and sizes, nothing more. No cloud, no telemetry, no "we value your privacy" fine print that means the opposite. We [wrote down exactly how](docs/TECHNICAL.md#privacy-contract).

## Quick start

You'll need **Node 24 LTS** and [Ollama](https://ollama.com/) with `gemma3:1b`.

```bash
nvm use 24              # the native SQLite build targets Node 24
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173**. The API lives on `:4317`, and its Swagger docs are at `/docs`.

## Want the gory details?

The seven-table data model, the security contract, and the architecture live in **[docs/TECHNICAL.md](docs/TECHNICAL.md)** — because a README should sell the idea, not bury it.

## License

MIT — do what you like, just keep the notice. See [LICENSE](LICENSE).

Built by [wamzii](https://wamzii.com).
