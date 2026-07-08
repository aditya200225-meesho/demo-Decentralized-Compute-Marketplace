# Idle Compute Co-op

A marketplace for renting out idle CPU-only laptops and desktops to run small AI jobs
(embeddings, small-model inference, preprocessing, tiny fine-tunes) — matched by hardware spec,
priced fairly by a verified reliability score, and secured by redundant, co-op-based verification
instead of blind trust.

Differentiated from Vast.ai / Akash / Salad by targeting **everyday CPU hardware** instead of
serious GPU rigs, with **reliability-based fair pricing**, **redundant-verification trust**, and a
**co-op group** model where machines pool together to verify each other's work and split earnings —
see [decentralized-compute-marketplace.md](decentralized-compute-marketplace.md) for the full
design rationale and competitive landscape.

> **What's real vs. simulated:** accounts/auth, hardware detection, matching, co-op group rules,
> escrow/payout bookkeeping, and the UI are all real and fully functional. Actual job execution and
> data transfer are **simulated and clearly labeled as such** in the UI — no real compute runs and
> no real files move. See [What's simulated](#whats-simulated-vs-real) below.

---

## Stack

- **Frontend**: React 19 + Vite + TypeScript + shadcn/ui (Tailwind v4)
- **Backend**: Node.js + Express 5 + TypeScript (ESM, run via `tsx`)
- **Database**: SQLite via Prisma 7 (`@prisma/adapter-better-sqlite3` driver adapter)
- **Auth**: username/password with server-side sessions (opaque bearer tokens, `node:crypto` scrypt password hashing — no external auth library)
- **Packaging**: single Docker image — nginx serves the frontend on `9080` and reverse-proxies `/api/` to the backend on `8090`

## Feature tour

### Marketplace
- Register a machine (auto-detects real CPU/RAM via Node's `os` module) and get a unique, shareable **machine ID**.
- Submit a job from a template (Document Embeddings, Small Model Inference, Image Preprocessing, Tiny Fine-Tune/LoRA) — hardware requirements and pricing auto-fill.
- A background scheduler (ticking every ~1.2s) matches pending jobs to eligible, genuinely-idle machines (charging, on wifi, not overheating) and "runs" them to completion.
- You can't rent your own machine — it's hidden from the public Providers list, and the matching engine excludes your own hardware from your own jobs.

### Redundant verification ("solo" vs. "co-op")
- **Solo (ungrouped) machines** run a job alone and get paid on trust — true single-job/single-machine.
- **Co-op group machines** get paired with a group-mate for redundant verification: both independently "run" the exact same chunk, and their output hashes must match to be paid. A mismatch (simulated ~6% of the time) disputes the job and refunds escrow. The shadow verifier earns a reduced fee too, not just the primary.
- Every job card, the job detail dialog, and the Dashboard tab show a **Solo / Co-op verified** badge per chunk, plus both output hashes side by side.

### Co-op groups
- Anyone can **create a group** (admin) with Open or Invite-only visibility and configurable join rules: min reliability, min uptime %, min jobs completed, min CPU/RAM, GPU required, min account age, min avg jobs/week.
- Admins/moderators can **invite a machine by its machine ID**, promote/demote moderators, edit rules any time, and remove members.
- Open groups are self-serve joinable if a machine meets the rules; the directory shows **expected weekly earnings per machine** so you know what you're signing up for.
- A machine can only be in one group at a time. A background job re-checks every grouped machine's rule compliance periodically — **more than 5 violations auto-removes** it, with a notification.
- **Notifications tab**: invites (Accept/Decline), rule-violation warnings, and removal notices.

### Per-machine dashboards
- **My Machines**: per-machine job history (role, status, time taken, exact credits earned per job), uptime %, current group, and a "Leave group" action.
- **Providers tab**: browse rentable machines (yours excluded); click into any one for its public job history and earnings.
- **Dashboard tab**: a global table of every job↔machine assignment across the marketplace, with live stats (redundant assignments, disputes, total paid out).

### Simulated shared storage ("S3-style bucket")
- Submitting a job "uploads" an `INPUT` object to a shared bucket.
- When a machine finishes a chunk, it "uploads" an `OUTPUT` object (and the shadow verifier uploads its own copy too, for co-op chunks).
- The **Storage tab** is a global bucket browser (key, kind, job, uploader, size); every object has a **Download** button that returns a small, honestly-labeled JSON descriptor (key, simulated size, content hash, uploader) — not a fake giant binary.
- This exists purely to make the "job → compute → result" data flow tangible in a demo, without needing real object storage or a real compute agent. See [What's simulated](#whats-simulated-vs-real).

### Testing controls
- The 8 seeded virtual providers simulate a spread of hardware profiles (2-core/4GB up to 8-core/32GB+GPU) and idle-state jitter (battery, wifi, charging, temperature) so the marketplace never sits empty.
- Any logged-in user can **pause/resume a virtual (ownerless) provider** from its detail dialog — useful for forcing your own registered machines to win matching when testing multi-machine scenarios locally, since virtual bots would otherwise tie on reliability and often win first. This does **not** work on real people's machines (ownership-checked).

## How the simulation works

A single in-process scheduler (`backend/src/services/scheduler.ts`) ticks every ~1.2s and, each tick:

1. **Matches** `PENDING` jobs to eligible providers (hardware spec, reliability floor, idle-guardrails, excluding the requester's own machines). If the best candidate belongs to a co-op group, it looks for a group-mate to pair as shadow verifier; otherwise the chunk runs solo.
2. **Progresses** running chunks, and on completion, computes output hash(es) — comparing primary vs. shadow for co-op chunks (with a small simulated tamper chance), or trusting a solo run outright.
3. **Recomputes reliability** from each provider's completed/failed job history.
4. **Settles** finished jobs: verified jobs release escrow and pay providers (reliability-weighted, shadow verifiers at half rate); disputed jobs refund escrow.
5. **Jitters idle state** for virtual providers (battery, wifi, charging, temperature) so eligibility genuinely fluctuates.
6. **Tracks uptime** (two bulk counters) and, every ~20 ticks, **enforces co-op group rules** against every active membership, issuing strikes/removals as needed.

This is what makes the demo look like "many machines competing for and collaborating on jobs" without any real distributed infrastructure — one Express process, one Docker image, no docker-compose, no message queue.

## What's simulated vs. real

| Real | Simulated (clearly labeled in the UI) |
|---|---|
| Accounts, sessions, password hashing | Actual job execution — progress is a fixed counter, not real computation |
| Hardware auto-detection (`os.cpus()`, `os.totalmem()`) | Output hashes (`sha256` of a string, not of real computed output) |
| Matching, idle-eligibility, reliability scoring | Object storage — no real bytes are ever written or moved; "sizes" are deterministic pseudo-random numbers |
| Co-op groups, rules, roles, invites, strikes | The downloadable "result" file is an honest JSON descriptor, not the real payload |
| Escrow/payout ledger bookkeeping | Crypto settlement — credits are an internal SQLite ledger, not on-chain |
| The full UI/UX | A provider-side execution agent (there isn't one — providers are DB rows, not running processes) |

If you want to see how real distributed-compute platforms (BOINC, Akash, Golem, Vast.ai) solve packaging, transfer, and verification for real, ask — it's a genuinely different (and much larger) project than this simulated marketplace.

## Local development

Two terminals:

```bash
cd backend
npm install
npx prisma db push   # first time only, or after pulling schema changes
npm run dev           # http://localhost:8090 — seeds templates + 8 virtual providers on first run
```

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 (or next free port) — proxies /api to :8090
```

Open the printed frontend URL. Sign up, register a machine, and submit a job from the Jobs tab.

### Testing with multiple machines locally

See the walkthrough for simulating two real machines on one laptop, putting them in the same
co-op group, and watching a redundant-verification job run end to end — including pausing the
virtual bots so your own machines actually win matching. Short version:

1. Open two browser contexts (e.g. a normal window + an Incognito window) — one account/machine each.
2. Put both machines in the same co-op group (Co-op Groups tab → create → join).
3. Optionally pause the 8 virtual bots (Providers tab → open each → "Take offline") so your machines are the only eligible candidates.
4. Submit a job — watch it get matched, run, and settle in the Jobs tab, then open its detail dialog for the redundancy log and bucket activity, and the Storage tab for the global bucket view.

## Final single-image build (Docker)

```bash
docker build -t hackathon-app:local .
mkdir -p data
docker run --rm -p 9080:9080 -p 8090:8090 -v "$(pwd)/data:/app/data" hackathon-app:local
```

Then open `http://localhost:9080`. Health check: `http://localhost:9080/api/health`.

## Project layout

```
frontend/               React + Vite + TypeScript + shadcn/ui
  src/components/       Feature components (one per tab/dialog) + shadcn primitives in ui/
  src/lib/               api.ts (fetch client), auth.tsx (session context), types.ts (mirrors Prisma models)
backend/                Express + TypeScript + Prisma (SQLite)
  src/routes/            One router per resource: auth, providers, jobs, groups, dashboard, storage, templates
  src/services/          scheduler.ts (the tick loop), matching.ts, groupRules.ts, auth.ts, storage.ts, ids.ts, hardware.ts
  src/middleware/auth.ts requireAuth / optionalAuth
  prisma/schema.prisma   Full data model
docker/                  nginx.conf + entrypoint.sh used by the final image
Dockerfile               single-image build (frontend + backend + nginx)
```

## Data model (high level)

- **User** → owns **Provider**(s) (machines) via `ownerId`; has **Session**s and **Notification**s.
- **Provider** (a "machine") → optionally belongs to one **CoopGroup** (`groupId`/`groupRole`), tracks uptime ticks, reliability, credit balance, and a unique `machineCode`.
- **CoopGroup** → has one **GroupRule** (join thresholds), many **GroupMembership** records (role/strikes audit log), many **GroupInvite**s.
- **Job** → split into **JobChunk**s, each with a primary `Provider` and optional shadow `Provider`; tracks `requesterId` so the matcher can exclude the requester's own machines.
- **LedgerEntry** → the escrow/payout audit trail (`ESCROW_HOLD` → `EARNING`/`ESCROW_REFUND`).
- **StorageObject** → simulated bucket entries (`INPUT` at job submission, `OUTPUT` per chunk completion), linked to the uploading `Provider`.

## API surface

All routes are mounted under `/api`. Grouped by resource:

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- **Providers**: `GET /providers`, `GET /providers/mine`, `GET /providers/:id`, `POST /providers/register`, `PATCH /providers/:id/status`
- **Jobs**: `GET /jobs`, `GET /jobs/:id`, `POST /jobs`
- **Templates**: `GET /templates`
- **Co-op groups**: `GET /groups`, `GET /groups/:id`, `POST /groups`, `PATCH /groups/:id/rules`, `POST /groups/:id/join`, `POST /groups/:id/leave`, `POST /groups/:id/invite`, `POST /groups/:id/members/:providerId/role`, `POST /groups/:id/members/:providerId/remove`, `POST /invites/:id/respond`
- **Notifications**: `GET /notifications`, `POST /notifications/:id/read`
- **Dashboard**: `GET /dashboard/assignments`, `GET /dashboard/stats`
- **Storage**: `GET /storage`, `GET /storage/:id/download`

## Known limitations

- Multiple "real" machines registered from the same physical laptop will report identical CPU/RAM (registration detects the *host* running the backend, not a per-browser value) — use the virtual providers, or actual separate devices on your LAN, to test genuinely different hardware.
- No password reset, email verification, or rate limiting — this is a hackathon-grade auth system, not production-hardened.
- Group rule enforcement runs on a fixed tick cadence (~20 ticks, ~24s), not instantly on every state change.
