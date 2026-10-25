<p align="center">
  <img src="docs/assets/readme-banner.png" alt="DevHibernate" width="100%">
</p>

<p align="center"><strong>Let your projects rest.</strong></p>

<p align="center">
  A <strong>local, open-weight AI</strong> clears the dependency clutter from shelved dev projects.<br>
  No cloud, no API keys, your code never leaves your machine.
</p>

[![Node](https://img.shields.io/badge/Node-24_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/CynthiaWahome/dev-hibernate/ci.yml?branch=dev&style=for-the-badge&logo=githubactions&logoColor=white&label=CI)](https://github.com/CynthiaWahome/dev-hibernate/actions/workflows/ci.yml)
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

## The AI runs on *your* machine — that's the whole point

Cleaning up your projects means letting something look at them, and your project list alone can leak client names, internal work, and the shape of your entire setup. So DevHibernate doesn't phone home. The hibernation assessment runs on an **open-weight model — [Gemma 3](https://ollama.com/library/gemma3) through [Ollama](https://ollama.com/)** — entirely on your laptop.

- 🏠 **No cloud, no API keys, no per-token bill.** It also works on a plane.
- 🔒 **Your code stays put.** The scanner reads filenames and sizes, never contents. The model gets IDs and sizes — never your source, your secrets, or your `.env`.
- 🔄 **Your model, your call.** Don't like Gemma? Point it at a different local model and run it against the exact same validation.
- 🔍 **Nothing to trust blindly.** It's open — inspect it, fork it, run it offline forever.

The privacy promise isn't a reassuring banner; there's simply no server to send anything to. [Here's exactly how it holds](docs/TECHNICAL.md#privacy-contract).

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
