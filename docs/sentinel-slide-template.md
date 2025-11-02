# Sentinel AI — Slide Deck Template

**Deck Goal**: Pitch Sentinel as the definitive behavioral security layer for Stellar wallets.  
**Primary Audience**: Hackathon judges, investors, and partners evaluating technical depth and go-to-market readiness.  
**Suggested Length**: 18–20 slides. Tailor transitions and emphasis to audience.

---

## Visual System (Use Across Slides)
- **Color Palette**:
  - Midnight Navy `#071630` (backgrounds), Deep Space `#0D213F` (cards)
  - Electric Teal `#13F2FE` (primary accent), Stellar Blue `#3478F6` (secondary accent)
  - Signal Amber `#FFB443` (risk warnings), Guardian Coral `#FF5F5F` (high-risk alerts)
  - Soft Slate `#7C8AA5` (body text), Off White `#F5F7FB` (headlines)
- **Typography**:
  - Headings: `Inter SemiBold` or `Space Grotesk` (all caps for slide titles)
  - Body: `Inter Regular` at 22–28 pt equivalent
  - Data Labels: `Roboto Mono` for code snippets, risk scores, contract IDs
- **Imagery & Motifs**:
  - Use orbital grid lines, subtle constellation dots, and flowing neon gradients to reference Stellar.
  - Incorporate shield/lock icons with linear outlines; favor vector illustrations over photos.
  - Accent each feature slide with a mini timeline or badge showing the security layer (Risk, Explain, Verify, Approve, Enforce).
- **Layout Principles**:
  - Maintain 1/3 left column for narrative, 2/3 right for visuals.
  - Anchor key metrics in pill-shaped containers with gradient borders.
  - Use consistent iconography (Lucide, Heroicons) for clarity.

---

## Slide 1 — Title Slide
**Headline**: “Sentinel AI — Behavioral Security for Stellar Transactions”  
**Subheadline**: “Intercept. Explain. Enforce.”  
**Content Blocks**:
- Left: Logo lockup, hackathon badge, presenter names.
- Right: Hero illustration showing layered shield around Stellar logo.
**Visual Notes**: Background gradient Midnight Navy to Deep Space; overlay with faint orbit lines.

---

## Slide 2 — Vision Hook
**Goal**: Establish mission and promise in one statement.  
**Suggested Copy**:
- Headline: “Protect every Stellar wallet without adding friction.”
- Bullet strip (3 items): “Real-time behavioral defense”, “Explainable AI”, “Human-in-the-loop approvals”.
**Visual**: Minimalist timeline showing incident -> detection -> response -> learning.

---

## Slide 3 — Problem Landscape
**Headline**: “Stellar users are losing assets before they know it.”  
**Content**:
- 2–3 data points (fraud incidents, average loss, time to detection). Source optional.
- Pain chart: “Wallet compromised”, “Funds drained”, “No forensic insights”.
**Design**: Use Signal Amber and Guardian Coral to highlight urgency.

---

## Slide 4 — Why Now
**Purpose**: Tie trend to Stellar ecosystem growth.  
**Elements**:
- Adoption metrics (transactions, ecosystem projects).
- Compliance/insurance pressure note.
- Quote block from security report (placeholder text).
**Visual**: Radial chart showing growth vs. controls.

---

## Slide 5 — Solution Overview
**Headline**: “Sentinel intercepts every transaction, scores risk, and applies the right defense.”  
**Structure**:
- Pillar icons (three columns): `Intercept (Risk Engine)`, `Explain (AI narratives)`, `Enforce (TOTP + Guardians + Contracts)`.
- Supporting sentence under each pillar.
**Visual**: Layered shield diagram showing decision flow.

---

## Slide 6 — Product Pillars
**Goal**: Summarize the five layers at a glance.  
**Content Table**:
```
Layer        Trigger                Action
Risk Engine  Every transaction      Behavioral scoring (0.0–1.0)
Step-Up      Score >= 0.30          Google Authenticator challenge
Guardians    Score >= 0.60          Human approval queue
Learning     Post-transaction       Confirm, adapt allowlists
Contracts    Optional deployment    On-chain policy enforcement
```
**Visual**: Gradient timeline with badges per layer.

---

## Slide 7 — Feature Deep Dive: Behavioral Risk Engine
**Key Points**:
- Analyzes last 60 Horizon transactions.
- Detects anomalous recipients, amount spikes, off-hours activity, frequency deviations, and risk factors powered by Z-score calculations.
- Runs off-chain with sub-second latency.
**Design**: Show dashboard mock with risk dial at 0.62 and highlighted features. Include pill callouts labelled “New Recipient”, “80% higher amount”, “Outside 09:00–17:00”.

---

## Slide 8 — Feature Deep Dive: Explainable AI
**Key Points**:
- OpenAI Responses API generates plain-language explanations.
- Deterministic templating fallback keeps system functional offline.
- Function calling schema ready for automated responses.
**Visual**: Split screen with AI narrative on left, risk factor chips on right. Add caption for source badge `AI` or `Rules`.

---

## Slide 9 — Feature Deep Dive: Step-Up Authentication
**Content**:
- QR-based TOTP onboarding (otpauth + qrcode).
- 30-second rotating codes stored per account.
- StepUpModal drives modal flow; TOTPS setup lives in `TotpSetup.tsx`.
**Design**: Include 3-step vertical timeline (Scan QR -> Verify Code -> Trusted Session). Accent with Electric Teal.

---

## Slide 10 — Feature Deep Dive: Guardian Approval + Telegram
**Highlights**:
- Guardian queue for high-risk events.
- Telegram alerts with inline approval buttons using `/api/telegram/...` routes.
- Guardian contract ready for M-of-N Soroban enforcement.
**Visual**: Messaging mock showing alert, with approval CTA pill and fallback to manual review.

---

## Slide 11 — Feature Deep Dive: Behavior Learning Loop
**Highlights**:
- Post-transaction surveys adjust allowlist and pattern baselines.
- “Was this you?” feedback reduces false positives.
- Freeze automation for confirmed fraud (24-hour lock).
**Visual**: Feedback loop diagram labeled `Detect -> Confirm -> Learn -> Adapt`.

---

## Slide 12 — Feature Deep Dive: Smart Contracts on Soroban
**Sections**:
- Policy Contract: daily caps, per-tx limits, cooldowns, allowlists.
- Guardian Contract: configurable M-of-N approvals with expiry.
- Gatekeeper Contract: risk-tier gating, trusted recipients, history tracking.
**Design**: Three stacked cards with Rust icon, include callout “>800 lines of tested Rust”.

---

## Slide 13 — System Architecture
**Content**:
- Flow: Freighter wallet > Sentinel UI > Risk Engine + AI > Optional Contracts > Horizon > Stellar network.
- Node runtime endpoints `/api/risk/score` and `/api/risk/explain`.
- Storage via local persistence (SQLite/Supabase ready).
**Visual**: Horizontal flow diagram with icons for each service. Use Off White connectors on Midnight Navy background.

---

## Slide 14 — Security Layers Breakdown
**Format**: Grid or infographic.  
**Include**:
- Trigger thresholds (0.30, 0.60) and estimated response times.
- Highlight “Fail-open UX” and “Non-custodial (never touches keys)”.
**Design**: Use gradient shield segments with short blurbs overlaying.

---

## Slide 15 — Demo Journey
**Narrative**:
- Scenario 1 (Low Risk): Frequent recipient, small amount (auto pass).
- Scenario 2 (Medium Risk): New vendor, medium amount (AI explanation + TOTP).
- Scenario 3 (High Risk): Large transfer at 2 AM (AI explanation + Guardian queue + Telegram).
**Design**: Three-column storyboard with screens or icons; add timeline arrow across.

---

## Slide 16 — Integrations & Data Sources
**Content List**:
- Freighter wallet (signature source).
- Horizon API (behavioral data).
- OpenAI (optional AI narrative).
- Telegram Bot API (notifications).
- Supabase/PostgreSQL (production-ready storage path).
**Visual**: Hub-and-spoke diagram with Sentinel core.

---

## Slide 17 — Technical Stats & Codebase Snapshot
**Data Points**:
- TypeScript/React ≈ 3,500 LOC, Rust ≈ 900 LOC, Documentation ≈ 2,000 LOC.
- API routes: 11, React components: 14, Risk features: 6, Smart contracts: 3.
- Test coverage: Vitest suites for risk configs and AI mocks; Soroban contract tests.
**Design**: Metric tiles (rounded cards) with icon + stat + short caption.

---

## Slide 18 — Roadmap & Deployment Readiness
**Sections**:
- Near Term (0–3 months): Deploy policy contract on Testnet, guardian dashboard, Supabase migration.
- Mid Term (3–6 months): Automated guardian approvals, production telemetry, insurance partnerships.
- Long Term: API commercialization, SaaS dashboard, enterprise compliance reporting.
**Visual**: Roadmap lane with milestone flags in Stellar Blue.

---

## Slide 19 — Competitive Edge
**Compare**:
- Traditional wallet security vs. Sentinel multi-layer defense.
- Highlight differentiators: Explainable AI, behavior learning, non-custodial architecture, Soroban enforcement.
**Visual**: Comparison table or radar chart.

---

## Slide 20 — Call to Action
**Content**:
- Ask: “Support Sentinel to secure millions of Stellar transactions.”
- What we need: partnerships, additional guardians, feedback, funding (customize).
- Contact info placeholders and QR link to repo/demo.
**Design**: Full-bleed gradient with centered text, accent with Electric Teal highlight.

---

## Appendix — Optional Slides
- **Implementation Map**: Detailed file tree with key modules (`src/lib/risk.ts`, `src/lib/contracts.ts`, `contracts/*`).
- **API Reference**: Table of REST endpoints with purpose and auth requirements.
- **Contract Invocation Guide**: Pseudocode for policy and guardian calls.
- **Testing Story**: Summary of Vitest suites, contract test scenarios, and manual QA checklist.
- **Production Hardening**: Security checklist (rate limiting, audit trail, key management).

---

## Presenter Notes Templates
- **Story Hook**: “We intercepted a fraudulent transfer by analyzing patterns before funds moved.”
- **Demo Script**: Outline steps for showing low/medium/high risk scenarios live.
- **FAQ Cheatsheet**: Pre-answer questions on scaling (Supabase/Soroban), privacy (no private key data), false positives (learning loop), and deployment status.

---

### Usage Tips
- Export to Google Slides or Pitch by copying each section as a slide with matching layout.
- Leverage animation for layer reveal (risk > explain > enforce) but keep timings under 0.5 s.
- When presenting to technical judges, append appendix slides; for business audiences, tighten to 14 slides by merging deep dives.

