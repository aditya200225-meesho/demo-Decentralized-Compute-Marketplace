# Idle Compute Co-op

Rent out idle CPU-only laptops and desktops for small AI jobs (embeddings, small-model inference,
preprocessing, tiny fine-tunes), matched by hardware spec and priced fairly by a verified
reliability score — differentiated from Vast.ai / Akash / Salad by targeting **everyday CPU
hardware** instead of serious GPU rigs, with **redundant-verification trust** and **reliability-based
fair pricing** instead of a pure auction.

Crypto settlement and "did the untrusted machine really run the job" verification are simulated and
clearly labeled as such (see [decentralized-compute-marketplace.md](decentralized-compute-marketplace.md)
for the full design rationale); hardware detection, matching, and the UI are real.

## Stack

- **Frontend**: React + Vite + TypeScript + shadcn/ui (Tailwind v4)
- **Backend**: Node.js + Express + TypeScript (ESM, run via `tsx`)
- **Database**: SQLite via Prisma (`@prisma/adapter-better-sqlite3` driver adapter)
- **Packaging**: single Docker image — nginx serves the frontend on `9080` and reverse-proxies
  `/api/` to the backend on `8090`

## How the simulation works

A single in-process scheduler (`backend/src/services/scheduler.ts`) ticks every ~1.2s and:

1. Matches `PENDING` jobs to eligible idle providers (hardware spec + reliability + idle-guardrails:
   charging, on wifi, not overheating).
2. Assigns each job chunk to a **primary provider and a shadow provider**, and simulates progress.
3. On completion, compares primary vs. shadow output hashes — a match verifies the chunk; a mismatch
   (simulated ~6% of the time) triggers a dispute.
4. Settles escrow: verified jobs release payment (reliability-weighted) to providers; disputed jobs
   refund the escrow hold.
5. Recomputes each provider's reliability score from its completed/failed job history.

This is what makes the demo look like "many virtual providers competing for jobs" without any real
distributed infrastructure — it's one Express process, one Docker image, no docker-compose.

## Local development

Two terminals:

```bash
cd backend
npm install
npm run dev        # http://localhost:8090, seeds templates + 8 virtual providers on first run
```

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173, proxies /api to :8090
```

Open `http://localhost:5173`.

## Final single-image build (Docker)

> Docker was not available on the machine this was built on — the Dockerfile below has **not been
> build/run verified yet**. See `.agent-memory/handoff.md` for the exact next steps.

```bash
docker build -t hackathon-app:local .
mkdir -p data
docker run --rm -p 9080:9080 -p 8090:8090 -v "$(pwd)/data:/app/data" hackathon-app:local
```

Then open `http://localhost:9080`. Health check: `http://localhost:9080/api/health`.

## Project layout

```
frontend/     React + Vite + TypeScript + shadcn/ui
backend/      Express + TypeScript + Prisma (SQLite)
docker/       nginx.conf + entrypoint.sh used by the final image
Dockerfile    single-image build (frontend + backend + nginx)
```
