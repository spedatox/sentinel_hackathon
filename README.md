Sentinel
========

Sentinel is a behavioural security layer for Stellar Testnet wallets. It studies every outgoing payment, scores risk in real time, explains why, and escalates high risk flows through TOTP step up, guardian approvals, and Telegram notifications without ever touching private keys.

---

Table of Contents
-----------------
1. Product Overview  
2. Feature Tour  
3. System Architecture  
4. Quick Start  
5. Environment Variables  
6. Developer Workflow  
7. Demo Walk-through  
8. REST API Surface  
9. Risk Engine Details  
10. Guardian and Telegram Pipeline  
11. Smart Contracts (Soroban)  
12. Troubleshooting  
13. Roadmap  
14. Reference Docs

---

1. Product Overview
-------------------
Sentinel is built for hackathon demos that want a production story. Connect Freighter (or any WalletConnect compatible wallet), send a test payment, and Sentinel will:

- learn historical behaviour from Horizon,  
- explain anomalies in plain English (rule based or AI generated),  
- require Google Authenticator codes for medium risk events,  
- queue high risk transactions for guardian review, and  
- alert guardians through Telegram.

Each subsystem (web app, risk services, Telegram bot, Soroban contracts) is modular so you can ship the parts you need.

---

2. Feature Tour
---------------
**Behavioural risk engine**
- Ingests the last 60 outbound payments per account from Horizon.
- Computes z score, robust median deviation, percentile breaches, hour probability, 15 minute frequency spikes, recipient concentration, asset mix drift, balance ratio, and more.
- Supports per asset absolute caps and sample size backstops so sparse histories remain safe.
- Emits score, bucket (low, medium, high), suggested decision, machine readable factors, and human reasons.

**Explainable security experience**
- Risk badge surfaces score and sample size.
- Highlight list spells out every factor (for example "recipient is new", "sending 72 percent of balance").
- `/api/risk/explain` returns deterministic copy or invokes OpenAI when `OPENAI_API_KEY` is available.

**Step up authentication (medium risk)**
- Google Authenticator setup with QR codes and status polling.
- Verification modal triggers for scores between 0.2 and 0.5.
- Supports disabling TOTP with explicit confirmation.
- Demo code `123123` remains available for quick presentations.

**Guardian plus Telegram escalation (high risk)**
- Builds unsigned XDR using the mediated threshold helper.
- Stores pending transactions in Supabase (with JSON file fallback).
- Sends Telegram alerts that list every contributing factor and action buttons.
- `/api/guardian/approve` can submit on behalf of the user or return an XDR for wallet signing.

**Multi user storage**
- Primary backend: Supabase Postgres with row level security policies (`supabase-schema.sql`).  
- Secondary backend: local JSON database (`sentinel.db`) used when Supabase env vars are missing.  
- Storage helpers abstract the backend so web and API code remain unchanged.

**AI ready narrative layer**
- Uses OpenAI Responses API for risk summaries and Chat Completions for Telegram copy.  
- Falls back to curated language when the API key is absent.  
- Redacts sensitive values before prompts; tests guard against leakage.

**Soroban contracts (optional hardening)**
- `contracts/gatekeeper` enforces guardian policies.  
- `contracts/guardian` manages guardian authority.  
- `contracts/policy` enables programmable spending rules.  
- Helper scripts (`deploy.sh`, `deploy.ps1`, `deploy.bat`) support fast Testnet deployment.

---

3. System Architecture
----------------------
| Layer | Location | Responsibilities |
| --- | --- | --- |
| UI / Client | Next.js 14 app under `src/app` | Wallet connect, balances, payment form, TOTP modal, Telegram status |
| Risk Services | `/api/risk/score`, `/api/risk/explain`, `src/risk/*` | Feature extraction, scoring, explanation synthesis |
| Guardian Flow | `/api/guardian/*`, `src/lib/xdr.ts`, `src/lib/storage.ts` | Unsigned XDR creation, queueing, approvals, notifications |
| Storage | Supabase + `sentinel.db` | Pending transactions, TOTP secrets, trusted recipients |
| Messaging | `src/lib/telegram.ts`, `/api/telegram/*` | Alerts, inline callbacks, polls |
| Smart Contracts | `contracts/*` | Optional on chain enforcement |
| Documentation | `*.md` in repo root and `/contracts` | Runbooks, quickstarts, checklists |

---

4. Quick Start
--------------
**Prerequisites**
- Node.js 20 or higher
- npm 10 or higher
- Freighter or any WalletConnect compatible wallet on Stellar Testnet
- Optional: OpenAI API key, Telegram bot token, Supabase project, Rust toolchain for Soroban

**Install and run**
```bash
# Install dependencies
npm install

# Start the Next.js dev server
npm run dev
```
Visit `http://localhost:3000`, connect your wallet, and explore the dashboard.

---

5. Environment Variables
------------------------
Create `.env.local` in the app root (and `.env` inside `contracts` if you deploy Soroban). Key variables:

| Name | Purpose | Required | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Network passphrase | Yes | Default is `Test SDF Network ; September 2015` |
| `OPENAI_API_KEY` | AI generated explanations | No | Enables AI narrative mode |
| `OPENAI_MODEL` | Override OpenAI model | No | Defaults to `gpt-4o-mini` |
| `TELEGRAM_BOT_TOKEN` | Telegram alerts | No | Required for guardian notifications |
| `TELEGRAM_CHAT_ID` | Default chat id | No | Alerts skipped when missing |
| `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` | Multi user storage | No | Activates Postgres backend |
| `SUPABASE_ANON_KEY` | Frontend Supabase client | No | Needed for RLS aware UI |
| `RISK_WEIGHTS_JSON`, `RISK_ABSOLUTE_CAPS_JSON`, etc. | Risk tuning | No | Override defaults per environment |
| `GUARDIAN_SIGNER_SECRET` | Backend signing helper | No | Only used if server submits transactions itself |

Sensitive values are never logged and are redacted before hitting OpenAI.

---

6. Developer Workflow
---------------------
| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint (Next.js + TypeScript rules) |
| `npm run test` | Run Vitest unit suite |

Tip for Windows PowerShell: if scripts are blocked, run `Set-ExecutionPolicy -Scope Process Bypass` for the current session.

Suggested loop: run the dev server, trigger each risk bucket (change amount, recipient, memo), approve or deny via Telegram, then run lint and tests before pushing a PR.

---

7. Demo Walk-through
--------------------
1. Connect your wallet via the sidebar. Sentinel stores the key locally so the session resumes automatically.  
2. Review the dashboard: balances, recent payments, and Telegram status update in real time.  
3. Submit a payment. The client calls `/api/risk/score` and displays the badge plus narrative.  
4. For low risk transfers Sentinel executes immediately.  
5. For medium risk transfers a TOTP modal appears. Enter a Google Authenticator code (or demo code) to continue.  
6. For high risk transfers the flow queues an unsigned XDR, sends a Telegram alert, and waits for guardian approval.  
7. Approve via Telegram (`/api/guardian/approve` is called behind the scenes). Sentinel either submits the transaction or returns an XDR for manual signing.  
8. Telegram sends a post transaction confirmation so the user can mark the transfer safe, feeding future risk decisions.

---

8. REST API Surface
-------------------
| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/risk/score` | POST | Score a transaction. Requires `account` and `tx` payload. |
| `/api/risk/explain` | POST | Generate explanation text for factors and score. |
| `/api/guardian/prepare` | POST | Queue a high risk transaction, build unsigned XDR, notify Telegram. |
| `/api/guardian/approve` | POST | Approve queued transaction and return result or follow up XDR. |
| `/api/auth/totp/setup` | POST | Begin Google Authenticator setup (returns QR URI and secret). |
| `/api/auth/totp/verify` | POST | Confirm a 6 digit code to finish setup. |
| `/api/auth/totp/status` | POST | Check status or disable TOTP for an account. |
| `/api/telegram/test` | GET | Send a test alert (for config validation). |
| `/api/telegram/poll` | GET | Polling endpoint for bot updates when webhooks are not available. |
| `/api/telegram/webhook` | POST | Primary webhook for Telegram inline buttons. |
| `/api/telegram/notify` | POST | Internal endpoint for low risk notifications. |

All endpoints respond with JSON. Errors follow `{ "error": "message" }` for easy handling.

---

9. Risk Engine Details
----------------------
Risk logic lives in `src/risk`. Highlights:

- `featureExtract.ts` trims history by age and count, calculates mean, std deviation, median, MAD, percentile, hour probability, and frequency spike ratios.  
- `score.ts` applies weight vectors from `config.ts`, adds safeguards (absolute caps, sparse history detection), and emits the score plus discrete decision (`allow`, `require_step_up`, `block`).  
- `risk.ts` provides a higher level helper used by the API, adding balance ratio, reason strings, and integration with Horizon helpers.  
- Vitest coverage (`tests/risk/*.spec.ts`) guards against regressions when tuning weights or adding factors.

Current factors: z score, robust deviation, percentile breach, new recipient, off hours flag, frequency spike, recipient concentration, asset mix delta, balance ratio, fast outflow indicator, and unknown contract flag.

---

10. Guardian and Telegram Pipeline
----------------------------------
1. `/api/guardian/prepare` normalises factors, stores the unsigned XDR, and builds a factor list for messaging.  
2. `notifyTelegramRisk` produces AI generated or template copy that lists every risk driver and next step.  
3. Telegram inline buttons trigger webhook handlers to approve, lock, or mark the transfer safe.  
4. `/api/guardian/approve` records decisions and either completes the transaction or returns an XDR for the wallet to sign.  
5. `notifyTransactionComplete` sends confirmation and encourages the user to label the outcome, teaching Sentinel what looks safe.

---

11. Smart Contracts (Soroban)
-----------------------------
Contracts in `contracts/` add on chain defence in depth. They are optional but useful for advanced demos.

| Contract | Path | Purpose |
| --- | --- | --- |
| Guardian core | `contracts/guardian/src/lib.rs` | Maintains guardian list and approvals |
| Gatekeeper | `contracts/gatekeeper/src/lib.rs` | Enforces policy before releasing funds |
| Policy | `contracts/policy/src/lib.rs` | Implements spending limits and rate rules |

Deploy to Testnet:
```bash
cargo install --locked soroban-cli   # if not already installed
cd contracts
./deploy.sh                          # use deploy.ps1 or deploy.bat on Windows
```
Detailed guides live in `contracts/README.md`, `DEPLOY_NOW.md`, and `GUARDIAN_MULTISIG_SETUP.md`.

---

12. Troubleshooting
-------------------
| Problem | Fix |
| --- | --- |
| `npm run lint` blocked on Windows | Run PowerShell as admin and execute `Set-ExecutionPolicy -Scope Process Bypass` |
| Risk score always 0 | Ensure the wallet has history and Horizon calls are succeeding (check dev console) |
| Telegram alerts missing | Provide both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, then call `/api/telegram/test` |
| TOTP verification fails | Sync your device clock or call `/api/auth/totp/status` with `{ "action": "disable" }` to reset |
| Supabase errors | Confirm URL and service role key and that the SQL schema has been applied |
| OpenAI errors | API key missing or quota exceeded; Sentinel will use rule based copy automatically |

---

13. Roadmap
-----------
- Wallet deep linking for Freighter and Lobstr.  
- Guardian dashboard listing pending approvals.  
- Shared policy logic between off chain risk engine and on chain contracts.  
- Streaming risk telemetry into Supabase for analytics dashboards.  
- Passkey or hardware token support for step up authentication.  

Ideas welcome. Open an issue or ship a PR.

---

14. Reference Docs
------------------
- `IMPLEMENTATION_SUMMARY.md` - component by component guide.  
- `PROJECT_SUMMARY.md` - high level pitch for judges.  
- `QUICKSTART.md` and `QUICK_START_MULTI_USER.md` - onboarding scripts.  
- `TELEGRAM_*` guides - bot setup, testing, and webhooks.  
- `SENTINEL_COMPLETE_GUIDE.md` - end to end documentation.  
- `SUPABASE_MIGRATION_*` - migrate from local storage to hosted Postgres.  
- `WEBHOOK_SETUP.md` - configure Telegram webhook endpoints.

Happy hacking and ping us when Sentinel blocks something spooky in your demo!
