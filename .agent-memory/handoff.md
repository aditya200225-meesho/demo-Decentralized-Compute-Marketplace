# Handoff

## Current blocker

Docker Desktop is not installed on this machine (`docker --version` fails, winget install was attempted but not completed — user opted to continue without Docker for now). The Dockerfile/nginx/entrypoint are written but **never built or run**.

## Next exact action

1. Install Docker Desktop: `winget install -e --id Docker.DockerDesktop --source winget --accept-package-agreements --accept-source-agreements` (needs admin + likely a restart, enables WSL2 if not already on).
2. From the project root (`D:\decentralized-compute-marketplace`):
   ```
   docker build -t hackathon-app:local .
   mkdir -p data
   docker run --rm -p 9080:9080 -p 8090:8090 -v "$(pwd)/data:/app/data" hackathon-app:local
   ```
3. Verify:
   - `http://localhost:9080/api/health` → `{"status":"ok"}`
   - `http://localhost:9080/` → the React app loads, Providers tab shows 8 seeded virtual providers, submitting a job under the Jobs tab progresses through PENDING → RUNNING → VERIFIED/DISPUTED → PAID within ~15-20s.
4. If the Prisma schema-engine download fails inside the Docker build (same TLS-inspecting-proxy issue seen on the host), the fix is the same one used on the host: add `ENV NODE_TLS_REJECT_UNAUTHORIZED=0` before the `RUN npx prisma generate` line in the `backend-build` stage of the root `Dockerfile` — ask the user before doing this, same as was done on the host.

## Expected result

A single Docker image (`hackathon-app:local`) that serves the full app on port 9080 with no docker-compose, matching the hackathon's single-image submission rule.
