# ArkScore

ArkScore is a privacy-preserving on-chain credit and investor risk scoring oracle for the LatAm Institucional Hackathon with Avalanche, Arkangeles IFC, and Bankaool.

## Live Submission Links

- Live frontend: [`https://arkscore-seven.vercel.app`](https://arkscore-seven.vercel.app)
- Live backend: [`https://arkscore-api-production.up.railway.app`](https://arkscore-api-production.up.railway.app)
- Backend OpenAPI: [`https://arkscore-api-production.up.railway.app/openapi.json`](https://arkscore-api-production.up.railway.app/openapi.json)
- Fuji `CreditScoreRegistry`: [`0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code)
- Fuji demo proof transaction: [`0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2`](https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2)
- Latest proof artifact: [`packages/contracts/deployments/fuji/LatestScoreRecord.json`](packages/contracts/deployments/fuji/LatestScoreRecord.json)
- Pitch deck: [`PITCH-DECK.md`](PITCH-DECK.md)

## 60-Second Demo Video Script

0-10s: "ArkScore helps Arkangeles and Bankaool turn wallet risk into an auditable credit decision. The app is live on Vercel, the API is live on Railway, and the scoring proof is stored on Avalanche Fuji."

10-25s: "I connect a Fuji wallet, enter a test wallet, and fetch a score. The dashboard shows Wavy-style risk traceability, the ArkScore composite score, the institution decision, the subject hash, and the evidence hash."

25-40s: "For this submitted proof, Wavy Node's tracker-service was temporarily failing, so the backend is clearly labeled mock mode. The API-to-contract path still runs end-to-end against live infrastructure."

40-55s: "I store the score on the deployed `CreditScoreRegistry`, then read it back from Fuji. The transaction is visible on Snowscan, and the stored evidence matches the API response."

55-60s: "This becomes a per-query SaaS scoring rail for institutional underwriting, with eERC20 privacy as the next layer for confidential credit notes."

## Pitch

ArkScore evaluates an EVM wallet with Wavy Node traceability and AI risk scoring, computes an explainable 0-100 institutional credit score, and stores the result on Avalanche Fuji through `CreditScoreRegistry`. Arkangeles can screen investors and borrowers for IFC equity issuance workflows, while Bankaool can use the same traceable risk record for credit underwriting.

## What Is Built

- Next.js 15 App Router dashboard with Tailwind CSS, shadcn-style UI primitives, wagmi, viem, Avalanche Fuji wallet support, and a clean static export build for Vercel.
- Railway-ready Express API with `GET /api/score/:address` and `GET /openapi.json`.
- Wavy Node live integration using address registration, investigation creation, and `GET /v1/projects/:projectId/addresses/scan-risk`, with a first-class traceability object plus AI risk score scale.
- Deterministic read-only mock mode for judging before real Wavy credentials are added.
- Hardhat 3 Solidity `^0.8.24` contract, Solhint linting, and tests for storing Wavy-backed score records on Fuji.
- Optional eERC20 demo slot for an Ava Labs EncryptedERC privacy-preserving credit token address.
- Deployment notes for Vercel, Railway, Fuji, and optional Ava Labs EncryptedERC eERC20 demo work.

## Project Structure

```text
apps/
  web/        Next.js 15 dashboard and wallet demo
  api/        Railway Express API for Wavy Node score proxy
packages/
  contracts/ Hardhat contracts, tests, and Fuji deployment scripts
  shared/    Shared TypeScript score model and decision logic
config/
  tsconfig/  Shared TypeScript configs
docs/
  Deployment, requirements trace, eERC20, and hackathon submission notes
```

## Demo Flow

1. Connect an Avalanche Fuji wallet.
2. Enter a wallet address.
3. Fetch Wavy Node traceability and AI risk score.
4. Compute the ArkScore composite credit score.
5. Store the score, evidence hash, Wavy analysis id, and institutional decision on-chain.
6. Read the Fuji registry record back and show whether the stored evidence matches the current Wavy response.
7. Show a decision such as `Approve IFC equity issuance` or `Approve Bankaool loan`.

## Environment

Copy `.env.example` into the relevant app or deployment provider and replace the placeholders. For frontend-only local work, copy `apps/web/.env.local.example` to `apps/web/.env.local`; it contains only public `NEXT_PUBLIC_*` values.

```bash
NEXT_PUBLIC_API_BASE_URL=https://arkscore-api-production.up.railway.app
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46
NEXT_PUBLIC_EERC20_DEMO_ADDRESS=
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false

WAVY_NODE_API_KEY=ApiKey wavy_replace_with_wavy_node_api_key
WAVY_NODE_PROJECT_ID=replace_with_wavy_node_project_id
WAVY_NODE_BASE_URL=https://api.wavynode.com/v1
WAVY_NODE_CHAIN_ID=43114
WAVY_NODE_TIMEOUT_MS=15000
WAVY_NODE_ANALYSIS_POLL_INTERVAL_MS=2000
WAVY_NODE_ANALYSIS_POLL_TIMEOUT_MS=90000
WAVY_NODE_AUTO_REGISTER=true
WAVY_NODE_FOREIGN_USER_PREFIX=arkscore-wallet
WAVY_NODE_MOCK_MODE=auto
WAVY_NODE_INTEGRATION_SECRET=replace_with_wavy_node_integration_secret
WAVY_NODE_INTEGRATION_TIME_TOLERANCE_MS=300000
WAVY_NODE_INTEGRATION_USER_DATA_JSON={"givenName":"replace_with_given_name","email":"replace_with_email@example.com"}
ARKSCORE_SCORE_RATE_LIMIT_MAX=120
ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS=60000
ARKSCORE_SUBJECT_HASH_SALT=replace_with_long_random_subject_hash_salt
ARKSCORE_REQUIRE_EERC20=false

FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
FUJI_PRIVATE_KEY=
ARKSCORE_SCORER_ADDRESS=
ARKSCORE_SCORER_PRIVATE_KEY=
FUJI_SCORER_PRIVATE_KEY=
```

`WAVY_NODE_MOCK_MODE=auto` uses live Wavy Node only when both the API key and project id are configured. `WAVY_NODE_CHAIN_ID=43114` is the Wavy-supported Avalanche mainnet analysis chain; ArkScore still stores the resulting proof on the Avalanche Fuji registry (`43113`). `WAVY_NODE_INTEGRATION_SECRET` verifies signed Wavy callbacks, and `WAVY_NODE_INTEGRATION_USER_DATA_JSON` is the compliance user-data object returned from `GET /users/:foreignUserId`; fill it with the fields required by the legislations enabled in your Wavy Node project. `ARKSCORE_SUBJECT_HASH_SALT` is used by the backend to derive the privacy-preserving `subjectHash` stored on Fuji instead of the raw wallet address. `ARKSCORE_SCORE_RATE_LIMIT_MAX` and `ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS` protect the live Wavy score endpoint from repeated client bursts. `FUJI_PRIVATE_KEY` deploys and owns the Fuji registry; set `ARKSCORE_SCORER_PRIVATE_KEY` or `FUJI_SCORER_PRIVATE_KEY` only when `pnpm record:fuji` should submit from an authorized scorer wallet that is different from the deployer.

## Local Setup

```bash
corepack enable
nvm use
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter @arkscore/api dev
pnpm --filter @arkscore/web dev
```

The web app builds as a static Next.js export for Vercel, with all scoring calls made from the browser to the Railway API.

## Verification

```bash
pnpm --filter @arkscore/shared build
pnpm --filter @arkscore/api build
pnpm --filter @arkscore/contracts compile
pnpm --filter @arkscore/contracts test
pnpm --filter @arkscore/web build
pnpm -r lint
pnpm verify
pnpm verify:railway
pnpm audit:requirements
pnpm judge:demo
pnpm readiness
pnpm readiness:strict:record
pnpm probe:wavy
pnpm probe:fuji
pnpm plan:eerc20
pnpm probe:eerc20
pnpm smoke:web
pnpm verify:live
pnpm verify:railway:live
pnpm verify:live:preflight
pnpm verify:live:preflight:record
pnpm submission:evidence
pnpm submission:evidence:full
pnpm railway:login
pnpm railway:whoami
pnpm deploy:railway
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm finalize:live
pnpm finalize:live:apply
pnpm verify:live:strict:record
```

Use Node.js 22.19.0. The repository pins Node 22 because the verified Next.js 15 production server path uses that runtime.

See `docs/READINESS_AUDIT.md` and `docs/REQUIREMENTS_TRACE.md` for the current judge-readiness checklist and remaining credential-dependent deployment items.

`pnpm audit:requirements` maps the hackathon requirements to concrete repo, env, artifact, and script evidence without printing secrets; it warns on malformed, mock, local-API, stale/tampered snapshot, or mismatched score-record artifacts, and `pnpm audit:requirements:strict` exits non-zero while live Railway/Wavy/Fuji proof is still missing. `pnpm judge:demo` prints a secret-safe, environment-aware judge walkthrough for hosted fallback mode or final live proof mode and keeps localhost/private API URLs in fallback mode. `pnpm readiness` checks local configuration gates without printing secrets, including Railway and Vercel CLI auth, the configured `ARKSCORE_WEB_URL` or hosted Vercel default, a public HTTPS Railway API URL, the browser's public Fuji RPC URL, the Wavy Node Avalanche chain id, and the latest Fuji score-record proof when configured. Use `pnpm readiness:strict:record` after `pnpm record:fuji` to make the non-secret Wavy-backed `LatestScoreRecord.json` artifact a final handoff gate. GitHub Actions runs `pnpm verify`, `pnpm audit:requirements`, and `pnpm readiness` on pushes and pull requests. `pnpm verify` also typechecks and tests the root handoff scripts, runs `pnpm verify:railway` to create a Railway-like `.railwayignore` payload that installs, builds, and tests `@arkscore/api`, cleans the web static export before `next build`, runs Solhint for the Solidity registry, and covers API runtime refusal of unsupported Wavy chain IDs, upstream Wavy result mismatch rejection, Railway score evidence hash recomputation, generatedAt-bound recorder evidence hash recomputation, offline score-record snapshot hash and freshness recomputation, Railway redaction, Vercel finalizer command rendering, live registry ABI verification, optional eERC20 planning and bytecode probing, evidence target rendering, readiness score-record validation, requirements audit coverage, judge-demo runbook rendering, and credential-refusal behavior. `pnpm probe:wavy` follows the Wavy Node quickstart shape by requiring Avalanche chain id `43114`, checking `/chains`, forcing live Wavy mode, validating the provided credentials, proving Avalanche support is active, and then fetching a score before Railway deployment. `pnpm probe:fuji` checks the Fuji deployer private key, chain id, and test AVAX balance before contract deployment. `pnpm plan:eerc20` inspects an optional Ava Labs EncryptedERC checkout, checks for Circom, Fuji deployer readiness, and the official standalone/converter deploy scripts, then prints the Fuji deployment and ArkScore proof commands without exposing secrets. `pnpm probe:eerc20` checks an optional EncryptedERC demo address for deployed Fuji bytecode, and `pnpm probe:eerc20:strict` or `ARKSCORE_REQUIRE_EERC20=true` makes that optional address a final-pitch gate. `pnpm --filter @arkscore/contracts deploy:fuji` refuses malformed deployer keys or non-Fuji chains and verifies the deployed owner plus initial scorer before writing the artifact. `pnpm --filter @arkscore/contracts scorer:fuji` now refuses missing or malformed owner keys, rejects invalid `SCORER_AUTHORIZED` values, checks Fuji chain id, and fails if the post-transaction `isScorer` state does not match the requested authorization. `pnpm smoke:web` confirms the hosted Vercel demo is public and includes the judge-facing score flow, traceability, AI risk scale, subject hash, subject status, Store on Fuji path, the read-only mock guard, live-Wavy-required call to action, and on-chain readback evidence match. `pnpm submission:evidence:write` writes a non-secret `docs/SUBMISSION_EVIDENCE.md` packet with the current commit, public deployment targets from the configured environment or Fuji deployment artifact, latest Fuji score-record proof and exact score snapshot when available, Railway archive verifier output, hosted smoke, live verifier, requirements audit, judge demo runbook, readiness output, and final handoff commands; `pnpm submission:evidence:write:full` includes `pnpm verify` output in that packet for a final all-gates submission snapshot. The evidence generator refuses malformed, mock, stale, or snapshot-tampered score-record artifacts so stale files cannot become submission proof. Those commands export the public Railway URL and Fuji addresses once for the remaining final steps, and when `ARKSCORE_REQUIRE_EERC20=true`, they switch to the strict eERC20 probe, strict readiness, finalize, and verifier path. `pnpm railway:login`, `pnpm railway:login:browserless`, and `pnpm railway:whoami` wrap the Railway CLI through `pnpm dlx @railway/cli`, so a global Railway binary is not required. `pnpm deploy:railway` prints the Railway auth, project/env/service, service-creation, variable, deploy, domain, and post-deploy verifier commands, and `pnpm deploy:railway:apply` runs `pnpm verify:railway` plus `pnpm probe:wavy` first in live mode, refuses unsupported `WAVY_NODE_CHAIN_ID` values before mutating Railway, creates the named Railway service on fresh projects before setting service-scoped variables, ignores stale local `WAVY_NODE_MOCK_MODE=true`, forces the deployed Railway variable to `WAVY_NODE_MOCK_MODE=false` unless `RAILWAY_ALLOW_MOCK=true`, applies the Railway deployment once credentials are proven, extracts the generated Railway domain when available, and retries `pnpm verify:railway:live` before Fuji/Vercel finalization. That live verifier proves deployed API health, OpenAPI contract with the served API origin in `servers`, no-store score headers, rate-limit headers, production subject-hash salt, Avalanche-pinned Wavy chain id, generatedAt-bound recomputed evidence hash, and live Wavy `source: "wavy"` response before moving to Fuji/Vercel finalization. `pnpm record:fuji` requires a public HTTPS Railway API URL, fetches a live Railway score, refuses mock responses by default, recomputes the generatedAt-bound score evidence hash before storage, signs with `ARKSCORE_SCORER_PRIVATE_KEY`, `FUJI_SCORER_PRIVATE_KEY`, or `FUJI_PRIVATE_KEY`, refuses configured scorer/private-key mismatches, writes that exact subject hash and evidence hash to Fuji, verifies `hasScore` plus `getScore` against the API response, and writes `packages/contracts/deployments/fuji/LatestScoreRecord.json` with the exact score snapshot as non-secret evidence for the submission packet unless `ARKSCORE_SCORE_RECORD_ARTIFACT` points to a custom path. `pnpm verify:live` checks reachable deployments and automatically verifies `LatestScoreRecord.json` against Fuji when that artifact exists; the score-record verifier rejects mock records, unsupported Wavy chains, local artifact API URLs, stale or tampered score snapshots, mismatched registry/scorer fields, and on-chain readback differences. Use `pnpm verify:live:preflight` before `pnpm record:fuji` to prove Railway live Wavy mode, Fuji registry ABI, authorized scorer, and optional eERC20 without inspecting the static frontend, then use `pnpm verify:live:preflight:record` before final Vercel env/deploy mutation so the latest Fuji score-record artifact remains required, and use `pnpm verify:live:strict:record` after Vercel is rebuilt, or `pnpm verify:live:strict:eerc20:record` when the optional privacy-token demo is included. The Railway API publishes its integration contract at `/openapi.json`. `pnpm finalize:live` refuses local development API URLs, rejects local public Fuji RPC URLs, publishes the public Fuji RPC env, then prints the final Vercel auth, link, preflight, env, deploy, and verification commands; apply mode retries final strict verification until the production deployment is reachable, and when `LatestScoreRecord.json`, a custom `ARKSCORE_SCORE_RECORD_ARTIFACT`, or `ARKSCORE_REQUIRE_SCORE_RECORD=true` is present, it upgrades preflight and final verification to record-required gates before applying Vercel changes.

The readiness, finalization, and live verification scripts accept the same Fuji registry aliases used by the Hardhat tooling: `ARKSCORE_REGISTRY_ADDRESS`, `CREDIT_SCORE_REGISTRY_ADDRESS`, `REGISTRY_ADDRESS`, or the generated `packages/contracts/deployments/fuji/CreditScoreRegistry.json` artifact.

Strict live verification and `pnpm record:fuji` both require the Railway score `generatedAt` timestamp to be recent and included in the recomputed evidence hash before accepting or storing a response, so a replayed score cannot satisfy the final evidence path by editing its timestamp. The final score-record artifact also embeds the exact API score snapshot, and validators recompute that snapshot's generatedAt-bound hash and compare its timestamp with the artifact timestamp before accepting it as proof.

## Live Demo Proof (Mock Mode – May 16 2026)

Wavy Node's upstream tracker was temporarily failing with `tracker-service::analyze: fetch failed`, so this proof intentionally used ArkScore's mock Wavy mode on the live Railway backend. The full demo path still ran end-to-end through the deployed API, live Fuji `CreditScoreRegistry`, transaction receipt, and on-chain readback verification.

- Proof time: May 16, 2026 at 10:13:38 PM America/Santiago (`2026-05-17T02:13:38Z`)
- Railway API: [`https://arkscore-api-production.up.railway.app`](https://arkscore-api-production.up.railway.app)
- Score endpoint: [`/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool`](https://arkscore-api-production.up.railway.app/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool)
- Test wallet: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`
- Source: `mock` Wavy trace while upstream Wavy analysis is down
- Mock Wavy risk score: `2/100` (`minimal`)
- Composite score: `100/100`
- Decision: `APPROVE_BANKAOOL_LOAN`
- Subject hash: `0x32f3df1721bff1ad75a4ceb1be8a3df74f1ef10a68920cbcc861adf384135da6`
- Evidence hash: `0xc590063bfede4e2fc12a02ce437d43bd1182e7e070c7c9091b1bd5ff54ead0e4`
- Fuji `CreditScoreRegistry`: [`0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code)
- Fuji transaction: [`0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2`](https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2)
- Fuji block: `55449102`
- Recorder artifact: `packages/contracts/deployments/fuji/LatestScoreRecord.json`

Recorder output confirmed `recordScore` was submitted, Fuji returned a receipt, and `getScore(subjectHash)` matched the API response.

## Submission Placeholders

- Live demo: `https://arkscore-seven.vercel.app`
- Vercel frontend: `https://arkscore-seven.vercel.app`
- Railway backend: `https://arkscore-api-production.up.railway.app`
- Fuji `CreditScoreRegistry`: [`0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code) (Snowtrace API verified)
- Optional eERC20 demo contract: `TBD`

## References

- Wavy Node docs: https://docs.wavynode.com
- Avalanche Fuji RPC: https://api.avax-test.network/ext/bc/C/rpc
- Ava Labs EncryptedERC: https://github.com/ava-labs/EncryptedERC
