# Life Assistant

Personal PWA. First module: English vocabulary flashcards with spaced
repetition, built around a TOEIC catalogue of 50 topics and 591 words.

Live at <https://life-assistant.tan14012004.workers.dev>

## Documentation

| File | What it holds |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Why the code is shaped this way, and what breaks if you change it. Read this first. |
| [`life-assistant-spec.md`](life-assistant-spec.md) | Product spec, kept current, with the milestone state |
| [`docs/setup-may-moi.md`](docs/setup-may-moi.md) | Setting the project up on another machine, and the secrets only the owner can supply |

## Stack

React 19 + TypeScript + Vite 8 · Tailwind CSS 4 · Firebase Auth + Firestore
(Spark plan) · `ts-fsrs` for scheduling · one Cloudflare Worker serving the
built site, proxying Firebase auth and running the daily reminder cron.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from Firebase Console
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173, service worker enabled |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | 203 unit tests |
| `npm run lint` | oxlint |
| `npx wrangler deploy --dry-run` | Validate the Worker without deploying |
| `npx wrangler tail` | Live Worker logs |

## Deployment

Pushing to `main` builds and deploys through Cloudflare. Build-time
`VITE_*` variables live in the Cloudflare project; the reminder job's two
secrets are set with `wrangler secret put`.

## Firestore

Rules and indexes are in the repo:

```bash
npx firebase-tools deploy --only firestore
```
