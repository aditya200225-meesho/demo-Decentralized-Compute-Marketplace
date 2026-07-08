# Session Summary

## What exists

A full-stack "Idle Compute Co-op" marketplace app:

- **frontend/**: React + Vite + TypeScript + shadcn/ui (hand-authored components, since the shadcn CLI's network fetch was blocked by this network's TLS-inspecting proxy — see below). Tabs for Providers, Jobs, Templates; polls the backend every 1.5–10s.
- **backend/**: Express + TypeScript (ESM, run via `tsx`, no separate `tsc` build step — Prisma 7's client generator is ESM/TS-native and this was simpler than fighting NodeNext extension rules). Routes for health, providers, templates, jobs, teams.
- **Prisma schema**: `Team`, `Provider`, `JobTemplate`, `Job`, `JobChunk` (with primary + shadow provider for redundant verification), `LedgerEntry`. SQLite via the `@prisma/adapter-better-sqlite3` driver adapter (required in Prisma 7 — the schema `datasource` block no longer accepts a `url`).
- **Scheduler** (`backend/src/services/scheduler.ts`): an in-process tick loop (1.2s) that matches pending jobs to eligible idle providers, simulates chunk progress, does redundant verification (primary + shadow provider hash compare, ~6% simulated dispute rate), settles escrow (release on verified, refund on disputed), and recomputes reliability scores. This is what makes it look like "many virtual providers" without any real distributed infra — single Express process, single Docker image.
- **Seed data**: 4 job templates, 8 virtual providers (simulating a hostel/college-lab co-op), 1 team.

## What works (verified locally)

- Backend: `npm run dev` in `backend/` → health check, template/provider listing, job submission, and the full job lifecycle (PENDING → RUNNING → VERIFIED/DISPUTED → PAID) all confirmed via curl.
- Frontend: `npm run dev` in `frontend/` → typechecks clean, builds clean (`npm run build`), `/api` dev-proxy to `:8090` confirmed working.
- Full local dev loop (both servers running) confirmed end-to-end.

## What doesn't work / isn't verified yet

- **Docker build/run is untested** — Docker Desktop is not installed on this machine. The Dockerfile, `docker/nginx.conf`, and `docker/entrypoint.sh` are written per the hackathon single-image contract (nginx on 9080 reverse-proxying `/api/` to the backend on 8090) but have never actually been built or run.

## Notable environment quirks (don't re-diagnose these)

- This network has a TLS-inspecting corporate proxy. The user's own `.npmrc` already has `strict-ssl = false` to work around it for npm. Prisma's CLI and the shadcn CLI both do their own HTTPS fetches that don't honor that setting — Prisma needed `NODE_TLS_REJECT_UNAUTHORIZED=0` for `prisma generate`/`migrate` specifically (user explicitly approved this narrow scope); shadcn's CLI registry fetch couldn't be worked around the same way conversationally, so shadcn components were hand-written to match the standard shadcn output instead of running `npx shadcn init`.
- Next.js was explicitly ruled out for the frontend — the hackathon contract requires a static React build served by nginx with SPA fallback; Next.js's own server model doesn't fit the single-image nginx+backend contract.
