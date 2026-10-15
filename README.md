# Life Assistant

Personal PWA. First module: English vocabulary flashcards with spaced repetition.
See [life-assistant-spec.md](life-assistant-spec.md) for the full spec.

## Stack

React 19 + TypeScript + Vite 8 · Tailwind CSS 4 · Firebase Auth + Firestore (Spark plan) ·
`vite-plugin-pwa` · deployed on Cloudflare Pages.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from Firebase Console > Project settings
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Run unit tests |
| `npm run lint` | oxlint |

## Firestore

Rules and indexes live in `firestore.rules` / `firestore.indexes.json`:

```bash
npx firebase-tools deploy --only firestore
```

## Deploy

Cloudflare Pages builds from `main`: build command `npm run build`, output `dist`.
The `VITE_FIREBASE_*` variables must also be set in the Pages project settings.
