# SnapQueue

URL → PNG screenshot service built to learn Redis and BullMQ properly: a real
async job queue, not a toy example. Paste a URL, pick a viewport, get a
screenshot — while the API never blocks on the slow part.

## Why a queue at all

Taking a screenshot means launching a real browser, navigating, waiting for
the page to settle, then capturing pixels — 2 to 10 seconds. An HTTP handler
that does this inline blocks that request the whole time, and every
concurrent request queues up behind it.

So the work is pushed into a background job instead. The API's only jobs are:
enqueue the work, and answer "is it done yet?" — never the work itself.

```
Next.js  ──HTTP──▶  Express API  ──▶  Redis / BullMQ  ──▶  Worker  ──▶  Playwright
   ▲                                          │
   └────────── polls status once/sec ─────────┘
                    │
              Postgres (permanent history)
```

Five real pieces: a frontend, an API, a queue, a worker, a browser. The API
and worker are **separate processes on purpose** — that separation is what
makes the dedup trick below possible, and what stops one slow job from
blocking every other request.

## The engineering decisions this project is actually about

**Deterministic job IDs, not random ones.** A job's ID is
`shot_<sha256(url + viewport)>` instead of an auto-incrementing number. If two
requests hash to the same ID, BullMQ doesn't create a second job — it hands
back the existing one. Five people requesting the same URL in the same
second share one Chromium launch instead of spawning five.

**`concurrency: 3` — a memory limit, not a guess.** Each active screenshot
context costs roughly 300–500MB of Chromium memory. On a 2GB box, that's
about 3 before the machine runs out of room. This is the number the whole
project's memory budget is built around — turn it up without more RAM and
you trade a few faster screenshots for the worker falling over under load.

**Retries know the difference between "try again" and "never will."** A
timeout gets 3 attempts with exponential backoff (2s, 4s, ...) — the target
site might just be slow right now. A DNS failure (`net::ERR_NAME_NOT_RESOLVED`)
throws BullMQ's `UnrecoverableError` instead — that hostname will never
resolve no matter how many times you ask, so it fails once, immediately,
instead of wasting ~7 seconds finding that out the slow way.

**Two independent rate limits, protecting two different things.** The
worker's own `limiter` (10 jobs/min) protects the *sites being screenshotted*
from getting hammered — it throttles throughput regardless of who submitted
what. A separate per-IP limit on `POST /screenshots` (10 req/min) protects
*this API* from being spammed. Different layer, different failure mode,
different fix.

**History outlives the queue on purpose.** Redis holds job state via
`removeOnComplete` — old completed jobs get pruned so a URL's ID can be
reused later. Postgres holds the permanent record of what was ever
screenshotted, independent of whether Redis has since forgotten it.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js | Polling UI, live-animated request-path diagram |
| API | Express | Two endpoints; no framework overhead needed |
| Worker | Plain Node + tsx | A loop that consumes jobs, nothing more |
| Queue | BullMQ + Redis | Job state, retries, dedup, rate limiting |
| History | Postgres + Drizzle | Permanent record, independent of Redis's eviction |
| Browser | Playwright (Chromium only) | One browser process reused across jobs |

## Running it locally

```bash
npm run setup   # starts Redis + Postgres, installs, creates the database schema
```

Then, one per terminal:

```bash
npm run dev -w apps/worker
npm run dev -w apps/api
npm run dev -w apps/web
```

Open `http://localhost:3000`.

Redis and Postgres run on non-default ports (`6380`, `5435`) to avoid
clashing with other local projects — see `infra/docker-compose.yml` and
`packages/shared/src/redis.ts` / `db.ts` if you need to change them.

## API

| | |
|---|---|
| `POST /screenshots` | `{ url, viewport }` → `202 { jobId }` |
| `GET /screenshots/:id` | current status; checks Redis first, falls back to Postgres once a job's Redis record has been pruned |
| `GET /screenshots/:id/image` | the PNG, once completed |
| `GET /screenshots` | recent history, from Postgres |

## Deliberately out of scope

Auth/user accounts, S3/object storage (local disk is enough for this scale),
multiple browser engines, WebSocket/SSE (polling is the chosen tradeoff, not
an oversight), multi-page capture. Each would be a real, separate project on
top of this one.
