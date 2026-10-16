# Life Assistant

A personal PWA. One module so far: English vocabulary flashcards with spaced
repetition. Built with and for one user (Vietnamese, learning English for
TOEIC), but the data model never assumed a single account.

Read `life-assistant-spec.md` for the product spec — it is kept current and
records which milestones are done. This file is for the things the spec does
not say: why the code is shaped the way it is, and what will break if you
undo it.

## Hard constraints — do not undo these without asking

- **Firebase stays on the free Spark plan.** No Cloud Functions, no Blaze, no
  card on file. Anything that needs a server runs in the Cloudflare Worker.
- **Hosting is Cloudflare Workers** (static assets), not Pages. The Cloudflare
  UI creates Workers now; `wrangler.jsonc` configures it. `_redirects` is
  Pages syntax and is rejected here — SPA fallback comes from
  `assets.not_found_handling`.
- **The UI is Vietnamese.** Code, comments and commit messages are English.
- **Cost must stay zero.** Watch Firestore reads, not storage: ~600 cards is
  under a megabyte, but every `onSnapshot` of all cards costs a read per card.

## Things that cost us a day each — leave them alone

**`VITE_FIREBASE_AUTH_DOMAIN` must be this app's own domain, not
`<project>.firebaseapp.com`.** Safari blocks third-party storage, so the
helper iframe on firebaseapp.com cannot hand a redirect result back to an app
on another domain: `getRedirectResult()` resolves to `null`, sign-in silently
loops, and nothing is logged. `worker/index.ts` proxies `/__/auth/*` there.
This also requires `https://<domain>/__/auth/handler` in the OAuth client's
authorized redirect URIs.

**One service worker, `src/sw.ts`, built with `injectManifest`.** Firebase
would register its own `firebase-messaging-sw.js`; two workers competing for
the same pages breaks push on iOS, which is the only platform where these
notifications matter. `deleteToken()` is deliberately not called — it forces
that second registration and fails on MIME type.

**Firestore writes are not awaited to completion.** A write promise resolves
only when the *server* acknowledges, while the local cache updates
immediately. Awaiting it froze the review screen for as long as the phone was
offline. See `src/shared/lib/pending.ts`; every SDK call that can stall has a
deadline (`src/shared/lib/timeout.ts`).

**A deck in the library is not a deck being studied** (`Deck.inPlan`). Seeding
591 TOEIC words into every account would otherwise put 591 cards into
tonight's queue and the evening reminder. The schedule, the home counts and
the Worker all draw from in-plan decks; everything else stays available for
free practice. A missing `inPlan` field reads as `true` — decks predating the
field were all being studied.

**Definitions leak their own answer.** 38 of the first 59 real cards carried
the English term inside the Vietnamese definition ("sự kết hợp — a
combination OF A and B"). `maskTerm(..., { loose: true })` blanks it in the
modes that ask for the term. Sentences use strict matching; definitions use
loose, because over-masking a definition costs readability while a leak costs
the exercise.

**Tab is the only safe delimiter.** Commas appear in definitions,
pronunciations and parts of speech; semicolons appear inside definitions. The
import warns only when most rows failed to split at all — warning on ragged
columns fired on every real file and trained the user to ignore warnings.

## Layout

```
src/
  app/            shell: router, layout, auth gate, settings, backup
  shared/         auth, firebase, ui primitives, hooks, lib
  modules/flashcards/
    domain/       pure logic + tests (parser, FSRS, session, stats, backup)
    data/         Firestore repositories and hooks
    components/   module-specific UI
    pages/        routed screens
worker/           Cloudflare Worker: auth proxy + reminder cron
public/catalog/   the shipped TOEIC catalogue (content, not code)
```

Firestore, all under one subtree per account, enforced by `firestore.rules`:

```
users/{uid}
  ├─ settings, catalogVersion, lastReminderSentOn
  ├─ decks/{deckId}        name, collection, inPlan, cardCount, archived
  ├─ cards/{cardId}        deckId, term, termLower, …, srs
  ├─ reviewLogs/{logId}    cardId, rating, reviewedAt, mode, wasNew
  └─ pushTokens/{token}
```

Cards are flat, not nested under decks, so "what is due across every deck" is
one query.

## Conventions

- **Domain logic is pure and tested; repositories are not.** Anything worth
  asserting lives in `domain/` and has a `.test.ts` beside it. 203 tests.
- **No composite Firestore indexes.** They cannot be created offline and cost
  a manual console step. Filter on one field and sort or count in memory — a
  deck holds hundreds of cards, not millions. Sorting uses
  `localeCompare(…, 'vi')`; Firestore's byte order misplaces accents.
- **Client timestamps, not `serverTimestamp()`**, which reads back `null`
  until it syncs and breaks sorting offline.
- **Shared UI comes from `shared/ui`** — `Page`, `PageHeader`, `Section`,
  `Panel`, `Note`, `Button`, `QuietButton`, `Sheet`, `Field`. The panel border
  and page padding were once copy-pasted into eight files; do not start again.
- **Inputs render at 16px.** iOS Safari zooms the page below that.
- **Every animation sits behind `prefers-reduced-motion`.**
- `public/catalog/toeic-600.tsv` is checked by `domain/catalog.test.ts`, which
  verifies every column, that each term appears in its own example (so cloze
  works), and that no definition leaks its answer. It has caught real mistakes.
  **Raise `CATALOG_VERSION` whenever the catalogue gains topics**, or accounts
  that already recorded a version never see them.

## Commands

```bash
npm run dev            # localhost:5173, service worker enabled
npm test               # vitest, 203 tests
npm run lint           # oxlint
npx tsc -b             # type-check app, worker and tests separately
npm run build          # tsc -b && vite build
npx wrangler deploy --dry-run    # validate the Worker without deploying
npx wrangler tail                # live Worker logs
```

Deployment is automatic: pushing to `main` makes Cloudflare build and deploy.
Build-time env vars live in the Cloudflare project, not in the repo.

## What a new machine needs

See `docs/setup-may-moi.md`. Short version: `.env.local` (not in git) and, for
the reminder job, two Worker secrets the owner must set by hand.

## State and next steps

M0–M5 are done: decks, TSV import, FSRS review in four modes, statistics,
backup, offline, and reminders. The TOEIC catalogue is complete at 50 topics
and 591 words.

Unproven: the reminder cron firing on its own. The send-test button was
removed once the path was proven end to end, but its endpoint
(`POST /__/reminders/test`, authenticated) remains for diagnosing a silent
evening.

Not built, in rough order of usefulness: filtering a session by tag (the
`can-on-ky` idea in spec §3.1 and §3.7, for which the statistics page already
produces the input), the planner/habits/blog modules, and an API or MCP server
so Claude can read and write the data directly.
