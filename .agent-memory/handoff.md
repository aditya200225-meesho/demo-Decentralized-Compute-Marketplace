# Handoff

## Current blocker

Docker Desktop 4.81.0 IS installed (per-user, at `%LOCALAPPDATA%\Programs\DockerDesktop`, CLI at
`resources\bin\docker.exe`) and its process is running, but its engine fails to start:
`ERROR: Error response from daemon: Docker Desktop is unable to start`. Root cause: WSL2 is not
installed (`wsl --status` → "The Windows Subsystem for Linux is not installed"). Installing WSL2
requires admin rights, which this agent's shell does not have — the user is installing it manually.

User is running, in an elevated (Administrator) PowerShell: `wsl --install`, then restarting Windows.

## Next exact action

1. Confirm with the user that they've run `wsl --install` as Administrator and restarted Windows.
2. Verify: `& "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe" info` should succeed
   (no "unable to start" error). Docker Desktop autostarts on login, so `docker` should also work
   directly once a fresh shell picks up the updated PATH.
3. From the project root (`D:\decentralized-compute-marketplace`):
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
