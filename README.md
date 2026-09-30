# SnapQueue

URL → PNG screenshot service built to learn Redis and BullMQ properly. Paste
a URL, pick a viewport, get a screenshot — the API never blocks on the slow
part.

## Why a queue at all

A screenshot takes 2–10 seconds (launch a browser, load the page, capture).
An HTTP handler that does this inline blocks the whole request, and every
concurrent request queues up behind it. So the work goes into a background
job — the API only enqueues it and answers "done yet?"

```
Next.js  ──HTTP──▶  Express API  ──▶  Redis / BullMQ  ──▶  Worker  ──▶  Playwright
   ▲                                          │
   └────────── polls status once/sec ─────────┘
                    │
              Postgres (permanent history)
```

API and worker are **separate processes on purpose** — that's what makes the
dedup below possible, and what stops one slow job blocking everyone else.

## Key decisions

**Deterministic job IDs.** `shot_<sha256(url + viewport)>` instead of a
random ID. Two identical requests hash to the same job — BullMQ hands back
the existing one instead of creating a second. Five people, one URL, one
Chromium launch.

**`concurrency: 3` is a memory limit, not a guess.** Each screenshot context
costs ~300–500MB of Chromium. On a 2GB box, that's ~3 before it runs out of
room. Turning it up without more RAM trades a few faster jobs for the worker
falling over.

**Retries know "try again" from "never will."** Timeouts get 3 retries with
backoff. A DNS failure throws `UnrecoverableError` instead — that hostname
was never going to resolve, so it fails once, fast.

**Two rate limits, two different jobs.** The worker's `limiter` throttles
how fast *sites get hit*. A per-IP limit on `POST /screenshots` throttles how
fast *this API* can be hit. Different failure mode, different fix.

**History outlives the queue.** Redis prunes old completed jobs
(`removeOnComplete`) so IDs can be reused; Postgres keeps the permanent
record regardless.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js | Polling UI, live request-path diagram |
| API | Express | Two endpoints, no framework overhead |
| Worker | Plain Node + tsx | A loop that consumes jobs |
| Queue | BullMQ + Redis | State, retries, dedup, rate limiting |
| History | Postgres + Drizzle | Permanent, independent of Redis's eviction |
| Browser | Playwright (Chromium only) | One browser reused across jobs |

## Running it locally

```bash
npm run setup   # Redis + Postgres + install + migrate
```

Then, one per terminal:

```bash
npm run dev -w apps/worker
npm run dev -w apps/api
npm run dev -w apps/web
```

Open `http://localhost:3000`.

## API

| | |
|---|---|
| `POST /screenshots` | `{ url, viewport }` → `202 { jobId }` |
| `GET /screenshots/:id` | status; Redis first, Postgres fallback |
| `GET /screenshots/:id/image` | the PNG |
| `GET /screenshots` | recent history |

## Out of scope

Auth, S3/object storage, multiple browser engines, WebSocket/SSE, multi-page
capture — each a separate project on top of this one.
