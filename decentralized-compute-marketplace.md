# Decentralized Compute Marketplace — Project Brief

*Rent out idle personal hardware (PCs, laptops) for AI-related tasks and earn in crypto.*

---

## 1. Problem Statement

AI compute is scarce and expensive. Cloud GPU/CPU pricing from AWS, Google Cloud, and Azure is high, and access is often gated. At the same time, a huge amount of consumer hardware — personal laptops, desktops, college lab PCs, gaming rigs — sits idle for most of the day.

The idea: build a **marketplace** that connects these two sides.

- **Supply side (providers):** anyone with a machine that meets the minimum hardware requirements registers it, and earns crypto when their idle hardware runs AI jobs.
- **Demand side (requesters):** developers and businesses submit AI workloads (inference, embeddings, preprocessing, small fine-tunes), get them matched to available hardware, and pay per job.

This is a **validated problem, not an invented one** — idle consumer hardware is abundant, AI compute is scarce and costly, and a marketplace layer bridges the gap.

### Why it's a strong pitch
- **Inherently visual and demoable:** a live dashboard of available machines, a job getting matched and run, a payout ticking up — far more compelling on stage than a static audit-log table.
- **Requires real design thinking:** hardware matching, job scheduling, and verification of work done are non-trivial, so it doesn't read as a copied template.
- **One-sentence consumer hook:** "Earn crypto with your idle PC."

---

## 2. This Idea Already Exists — The Competitive Landscape

This is **not an unfilled niche**. It's an active, moderately crowded Web3 vertical with venture-funded competitors. The core idea is validated but not novel, so differentiation is essential.

| Platform | What it does |
|----------|--------------|
| **Vast.ai** | Biggest peer-to-peer GPU marketplace — renters bid directly for your GPU hardware, pays hosts well for good uptime/bandwidth. Not crypto-native, but the closest match to the exact idea. |
| **Akash Network** | Decentralized, blockchain-based cloud marketplace — permissionless, no company owns the data centers, it's purely a software protocol matching supply/demand. Claims up to 80% cheaper than AWS/GCP. |
| **Salad** | Consumer-facing — install an app, it uses your idle gaming PC for AI/rendering jobs while you're away, pays out in gift cards, games, or crypto. Closest to "regular person's idle laptop earns passive income." |
| **io.net** | Aggregates idle GPUs (including from other networks) into a large pool specifically for AI/ML workloads; token-based payments. |
| **Aethir** | Large-scale decentralized GPU cloud, stablecoin-backed pricing. |
| **Bittensor** | Broader "AI marketplace" rewarding compute/model contributions via blockchain tokens. |
| **RunPod, CLORE.AI** | GPU rental marketplaces, some with decentralized/crypto angles. |

**Implication:** if a judge has seen Vast.ai, Akash, or Salad, "rent your PC for AI compute, earn crypto" reads as familiar. A specific differentiating angle is required.

### Sources
- [Top 10 AI Compute Marketplaces Redefining Infrastructure in 2026 — TechNow](https://tech-now.io/en/blogs/top-10-ai-compute-marketplaces-redefining-infrastructure-in-2026/)
- [Decentralized GPU Compute: The Web3 Revolution in AI Infrastructure — ComputeStacker Insights](https://computestacker.com/insights/decentralized-gpu-compute-networks-ai/)
- [5 Best GPU Rental Marketplaces for AI — Fluence](https://www.fluence.network/blog/best-gpu-rental-marketplaces/)
- [How to Make Money Renting Out Your GPU in 2026 (Vast.ai, Salad, RunPod) — EarnifyHub](https://earnifyhub.com/learning-guides/make-money-renting-out-gpu-2026)
- [Decentralized GPU Compute Networks 2026 — BLOG.BLOCKXS](https://blog.blockxs.com/decentralized-gpu-compute-networks-2026/)
- [CLORE.AI — Rent GPUs for AI/ML](https://clore.ai/)

---

## 3. What's Genuinely Hard (and How to Scope It Down)

The real version has hard problems that should **not** be solved for real in a hackathon:

| Hard problem | Hackathon approach |
|--------------|--------------------|
| **Proof of computation** — verifying work was done correctly on untrusted hardware (the hardest problem in real decentralized compute) | **Fake it** — report job completion; don't build real trustless verification. |
| **Hardware matching** — detecting GPU/VRAM/CPU to match job requirements | **Build for real** — a lightweight system-info script. This part is achievable. |
| **Crypto payment** — real wallet/chain integration | **Simulate** a token ledger in SQLite ("credits earned/spent"). Say clearly in the pitch: "this would settle on-chain in production." Judges respect a clearly-labeled simulation over a broken real integration. |
| **Running a real AI workload on a stranger's machine** | **Simulate the job** (a script reporting fake progress/output) rather than distributing real containers to remote hardware — a security and networking rabbit hole. |

**Discipline:** simulate the two hardest parts (trustless verification, real crypto settlement); build for real the genuinely achievable parts (hardware detection, matching, UI).

---

## 4. Differentiation Angles

Ranked by hackathon feasibility.

### 1. Target underserved supply, not underserved demand — *feasibility: high*
Vast.ai / Akash / io.net chase serious GPU owners (miners, gamers, data centers). None seriously target **regular CPU-only laptops/desktops** for lightweight AI tasks (small model inference, embeddings, preprocessing, tiny fine-tunes). Position as "your college's computer lab, or your family's spare laptop, can earn money doing small AI jobs" — a more inclusive supply pool. Only the framing and matching logic change, not the hard parts.

### 2. Solve trust/verification better — *feasibility: medium*
Every platform struggles with "did the untrusted machine actually run the job correctly?" A **redundant verification scheme** — send the same small job to 2–3 random providers, compare outputs, only pay if they agree — is a lightweight, simulatable version of proof-of-computation and a genuine technical differentiator. Simulate by running the "job" twice and comparing output hashes.

### 3. Local/regional focus with local payment rails — *feasibility: high*
Big players assume global crypto-native users. A version scoped to a specific market (e.g., India) with usable payouts (crypto-to-local bridge, or "credits redeemable via UPI in production") solves a real adoption barrier. Pure positioning/UX — easy to build and pitch.

### 4. Task-specific marketplace instead of generic compute — *feasibility: high*
Narrow to one high-demand task category — e.g., on-device fine-tuning for small businesses, or batch inference for indie AI developers priced out of cloud GPUs. A focused vertical is easier to demo convincingly and reads as more thought-through than a generic Akash clone. Narrows UI/flow scope too, which helps you finish.

### 5. Fair, transparent pricing via reputation/quality score — *feasibility: high*
Vast.ai is bid-based (can be opaque/volatile). Differentiator: **dynamic pricing based on a provider's verified reliability score** (uptime, past job success rate) instead of a pure auction — "fair pay for reliable providers." Just a scoring formula over a SQLite job-history table.

### 6. Idle-time-aware scheduling, not always-on — *feasibility: medium-high*
Go further than Salad: the app watches for genuine idle time (no user activity, plugged in, on Wi-Fi) and only takes jobs then — marketed as "won't slow your laptop or drain your battery," addressing the #1 consumer objection. Idle-state detection is real; the job itself can be simulated.

> **Recommended combination:** #1 (underserved CPU/light-hardware supply) + #4 (narrow to one AI task type) + #5 (reliability-based fair pricing). This gives a pitch that is clearly *not* "yet another Akash clone" — it's "a marketplace for small, everyday AI jobs using everyday hardware, priced fairly by reliability" — while staying buildable.

---

## 5. Additional Features Beyond Existing Platforms

Features that go beyond what Vast.ai, Akash, Salad, and io.net offer today.

### 1. Privacy-preserving jobs — data never leaves the provider's device
Instead of shipping a requester's dataset to a stranger's machine (a real trust/legal problem none of these solve fully), support **federated-style jobs**: the requester sends only the model/task; the provider computes locally on data that stays local; only the result (weight update, embedding, prediction) comes back. Directly answers "why would I trust a random laptop with my data."
*Hackathon version:* simulate — job spec says "no raw data leaves provider," provider "processes" a local dummy file and returns only output.

### 2. Split one big job across many small devices (crowd-compute chaining)
Existing platforms mostly match one job to one machine. Differentiator: **break a large job into chunks and distribute across multiple weak devices in parallel** (like Folding@home, but paid) — useful for splittable batch inference or embeddings, letting low-end hardware compete instead of being priced out.
*Hackathon version:* simulate chunking — split a fake job into N pieces, assign to N mock providers, reassemble results, show a progress bar.

### 3. Hardware health/safety guardrails as a selling point
No major platform makes "we protect your device" first-class. Add visible safeguards — thermal/battery-aware throttling, auto-pause above a temperature threshold, auto-cancel if the user resumes activity — and market it explicitly. Addresses a genuine adoption barrier for everyday (non-miner) users.
*Hackathon version:* real-ish — read CPU temp/battery via a simple system call, throttle/pause the simulated job accordingly.

### 4. Escrow + dispute resolution flow
Payment held in escrow until output is verified (ties into redundant verification), with a simple dispute flow if requester and provider disagree. Most platforms have ratings, not structured disputes.
*Hackathon version:* a status state machine (`pending → verified → paid`, or `→ disputed → resolved`) in the job table — cheap to build, reads as sophisticated.

### 5. "Compute co-op" — pooled small devices act as one bigger unit
Let multiple small-hardware owners (a friend group, a college hostel) form a **co-op** that pools combined capacity to bid on bigger jobs collectively, splitting earnings proportionally. A genuinely different market structure from "single machine, single renter."
*Hackathon version:* a "team" entity in the data model, jobs assigned to teams, payout-split logic.

### 6. Sustainability / carbon transparency
Show estimated energy use and carbon footprint per job, and let requesters optionally prefer providers on renewable/off-peak power. None of the crypto-compute platforms lead with this — an easy, judge-friendly ESG angle.
*Hackathon version:* a static/estimated carbon-per-job number in the UI — no real tracking needed.

### 7. No-crypto-wallet onboarding
Every competitor assumes users already have a crypto wallet — a real barrier for non-crypto-native users. Let users earn in an internal credit system with a "cash out" button that abstracts wallet complexity (in production, bridges to real crypto/UPI).
*Hackathon version:* exactly what you'd build anyway (SQLite credit ledger) — just framed explicitly as a feature.

### 8. Marketplace for reusable job templates
Offer a library of common AI task templates ("summarize these documents," "generate embeddings for this dataset," "run this small fine-tune") that auto-configure hardware requirements and pricing. Makes the demo look far more polished with minimal backend work.
*Hackathon version:* a few hardcoded template cards in the UI that pre-fill the job form.

> **Recommended feature set to build:** #1 (privacy-preserving framing) + #4 (escrow/dispute state machine) + #7 (no-wallet onboarding) + #8 (job templates). All cheap to simulate, all hit real gaps, all give specific talking points.

---

## 6. Realistic Hackathon-Scope Architecture

**Frontend**
- **Provider view:** register your machine, see specs auto-detected, see earnings.
- **Requester view:** submit a job, pick requirements, watch it get matched and "run."

**Backend**
- Real hardware-spec detection from the provider's machine.
- A matching algorithm.
- A simulated job runner.
- A credit ledger (SQLite).

**The differentiator you present** is the matching + fair-pricing algorithm and the UX of turning idle hardware into passive income — *not* real distributed computing infrastructure.

### Multi-container demo (docker-compose)
Conceptually a great fit: one **orchestrator/backend** container (matching, ledger, API), **N "provider"** containers (poll for jobs, "run" them, report results), and a **frontend** container. Shared SQLite via mounted volume or a small message queue. You could literally show `docker ps` with multiple providers picking up jobs live.

**The catch — submission rules:** if the hackathon toolchain expects a **single final Docker image** for judging (no docker-compose on the judges' end), a multi-container setup isn't submittable as-is.

**How to reconcile:**
- **Local demo:** use multiple containers — great for testing and for a live demo from your own laptop.
- **For submission:** simulate the same behavior inside one container using multiple worker processes/threads (Node/Go) acting as "virtual providers." Judge-facing behavior looks identical — jobs picked up by different providers, independent progress bars — but runs inside the one required image.

> **Open question to confirm:** does this hackathon actually require a single image, or is that just the plugin's default assumption? That decides which path to build toward.

---

## 7. Summary

- **The problem is real and validated:** scarce/expensive AI compute vs. abundant idle consumer hardware.
- **The idea already exists** (Vast.ai, Akash, Salad, io.net, Aethir, Bittensor, RunPod, CLORE.AI), so **differentiation is the whole game**.
- **Best differentiation:** underserved CPU/light-hardware supply + a narrow AI task vertical + reliability-based fair pricing.
- **Standout features to build:** privacy-preserving jobs, escrow/dispute flow, no-wallet onboarding, job templates.
- **Scope discipline:** build hardware detection, matching, and UI for real; simulate trustless verification and crypto settlement, clearly labeled.
- **Architecture:** provider + requester views, matching + simulated job runner + SQLite ledger; multi-container for local demo, single-image with worker processes for submission if required.
