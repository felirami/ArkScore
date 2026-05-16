# ArkScore

ArkScore is a privacy-preserving on-chain credit and investor risk scoring oracle for the LatAm Institucional Hackathon with Avalanche, Arkangeles IFC, and Bankaool.

## Pitch

ArkScore evaluates an EVM wallet with Wavy Node traceability and AI risk scoring, computes an explainable 0-100 institutional credit score, and stores the result on Avalanche Fuji through `CreditScoreRegistry`. Arkangeles can screen investors and borrowers for IFC equity issuance workflows, while Bankaool can use the same traceable risk record for credit underwriting.

## What Is Built

- Next.js 15 App Router dashboard with Tailwind CSS, shadcn-style UI primitives, wagmi, viem, and Avalanche Fuji wallet support.
- Railway-ready Express API with `GET /api/score/:address` and `GET /openapi.json`.
- Wavy Node live integration using `GET /v1/projects/:projectId/addresses/scan-risk`, with a first-class traceability object plus AI risk score scale.
- Deterministic mock mode for judging before real Wavy credentials are added.
- Hardhat 3 Solidity `^0.8.24` contract and tests for storing Wavy-backed score records on Fuji.
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
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=
NEXT_PUBLIC_EERC20_DEMO_ADDRESS=
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false

WAVY_NODE_API_KEY=ApiKey wavy_replace_with_wavy_node_api_key
WAVY_NODE_PROJECT_ID=replace_with_wavy_node_project_id
WAVY_NODE_BASE_URL=https://api.wavynode.com/v1
WAVY_NODE_CHAIN_ID=43113
WAVY_NODE_AUTO_REGISTER=true
WAVY_NODE_FOREIGN_USER_PREFIX=arkscore-wallet
WAVY_NODE_MOCK_MODE=auto
ARKSCORE_SCORE_RATE_LIMIT_MAX=120
ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS=60000
ARKSCORE_SUBJECT_HASH_SALT=replace_with_long_random_subject_hash_salt
ARKSCORE_REQUIRE_EERC20=false

FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
FUJI_PRIVATE_KEY=
```

`WAVY_NODE_MOCK_MODE=auto` uses live Wavy Node only when both the API key and project id are configured. `ARKSCORE_SUBJECT_HASH_SALT` is used by the backend to derive the privacy-preserving `subjectHash` stored on Fuji instead of the raw wallet address. `ARKSCORE_SCORE_RATE_LIMIT_MAX` and `ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS` protect the live Wavy score endpoint from repeated client bursts.

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
pnpm submission:evidence
pnpm railway:login
pnpm railway:whoami
pnpm deploy:railway
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm finalize:live
```

Use Node.js 22.19.0. The repository pins Node 22 because the verified Next.js 15 production server path uses that runtime.

See `docs/READINESS_AUDIT.md` and `docs/REQUIREMENTS_TRACE.md` for the current judge-readiness checklist and remaining credential-dependent deployment items.

`pnpm audit:requirements` maps the hackathon requirements to concrete repo, env, artifact, and script evidence without printing secrets; `pnpm audit:requirements:strict` exits non-zero while live Railway/Wavy/Fuji proof is still missing. `pnpm judge:demo` prints a secret-safe, environment-aware judge walkthrough for hosted fallback mode or final live proof mode and keeps localhost/private API URLs in fallback mode. `pnpm readiness` checks local configuration gates without printing secrets, including Railway and Vercel CLI auth, the configured `ARKSCORE_WEB_URL` or hosted Vercel default, a public HTTPS Railway API URL, and the latest Fuji score-record proof when configured. Use `pnpm readiness:strict:record` after `pnpm record:fuji` to make the non-secret Wavy-backed `LatestScoreRecord.json` artifact a final handoff gate. GitHub Actions runs `pnpm verify`, `pnpm audit:requirements`, and `pnpm readiness` on pushes and pull requests. `pnpm verify` also typechecks and tests the root handoff scripts, runs `pnpm verify:railway` to create a Railway-like `.railwayignore` payload that installs, builds, and tests `@arkscore/api`, and covers Railway redaction, Vercel finalizer command rendering, live registry ABI verification, optional eERC20 planning and bytecode probing, evidence target rendering, readiness score-record validation, requirements audit coverage, judge-demo runbook rendering, and credential-refusal behavior. `pnpm probe:wavy` follows the Wavy Node quickstart shape by checking `/chains`, forcing live Wavy mode, validating the provided credentials, proving the configured chain is active, and then fetching a score before Railway deployment. `pnpm probe:fuji` checks the Fuji deployer private key, chain id, and test AVAX balance before contract deployment. `pnpm plan:eerc20` inspects an optional Ava Labs EncryptedERC checkout, checks for Circom, Fuji deployer readiness, and the official standalone/converter deploy scripts, then prints the Fuji deployment and ArkScore proof commands without exposing secrets. `pnpm probe:eerc20` checks an optional EncryptedERC demo address for deployed Fuji bytecode, and `pnpm probe:eerc20:strict` or `ARKSCORE_REQUIRE_EERC20=true` makes that optional address a final-pitch gate. `pnpm --filter @arkscore/contracts deploy:fuji` refuses malformed deployer keys or non-Fuji chains and verifies the deployed owner plus initial scorer before writing the artifact. `pnpm smoke:web` confirms the hosted Vercel demo is public and includes the judge-facing score flow, traceability, AI risk scale, subject hash, subject status, Store on Fuji path, and on-chain readback evidence match. `pnpm submission:evidence:write` writes a non-secret `docs/SUBMISSION_EVIDENCE.md` packet with the current commit, public deployment targets from the configured environment or Fuji deployment artifact, latest Fuji score-record proof when available, Railway archive verifier output, hosted smoke, live verifier, requirements audit, judge demo runbook, readiness output, and final handoff commands; it refuses malformed or mock score-record artifacts so stale files cannot become submission proof. Those commands export the public Railway URL and Fuji addresses once for the remaining final steps, and when `ARKSCORE_REQUIRE_EERC20=true`, they switch to the strict eERC20 probe, strict readiness, finalize, and verifier path. `pnpm railway:login`, `pnpm railway:login:browserless`, and `pnpm railway:whoami` wrap the Railway CLI through `pnpm dlx @railway/cli`, so a global Railway binary is not required. `pnpm deploy:railway` prints the Railway auth, project/env/service, variable, deploy, and domain commands, and `pnpm deploy:railway:apply` runs `pnpm verify:railway` plus `pnpm probe:wavy` first in live mode, then applies the Railway deployment once credentials are proven. After Railway returns the service URL, export `ARKSCORE_API_URL=https://your-railway-api.up.railway.app` and run `pnpm verify:railway:live` to prove the deployed API health, OpenAPI contract with the served API origin in `servers`, no-store score headers, rate-limit headers, production subject-hash salt, and live Wavy `source: "wavy"` response before moving to Fuji/Vercel finalization. `pnpm record:fuji` requires a public HTTPS Railway API URL, fetches a live Railway score, refuses mock responses by default, writes that exact subject hash and evidence hash to Fuji, verifies `hasScore` plus `getScore` against the API response, and writes `packages/contracts/deployments/fuji/LatestScoreRecord.json` as non-secret evidence for the submission packet unless `ARKSCORE_SCORE_RECORD_ARTIFACT` points to a custom path. `pnpm verify:live` checks reachable deployments and automatically verifies `LatestScoreRecord.json` against Fuji when that artifact exists; the score-record verifier rejects mock records, non-Fuji chains, local artifact API URLs, mismatched registry/scorer fields, and on-chain readback differences. Use `pnpm verify:live:preflight` before final Vercel env/deploy mutation to prove Railway live Wavy mode, Fuji registry ABI, authorized scorer, and optional eERC20 without inspecting the static frontend, then use `pnpm verify:live:strict:record` after Vercel is rebuilt, or `pnpm verify:live:strict:eerc20:record` when the optional privacy-token demo is included. The Railway API publishes its integration contract at `/openapi.json`. `pnpm finalize:live` refuses local development API URLs, then prints the final Vercel auth, link, preflight, env, deploy, and verification commands; when `LatestScoreRecord.json`, a custom `ARKSCORE_SCORE_RECORD_ARTIFACT`, or `ARKSCORE_REQUIRE_SCORE_RECORD=true` is present, it upgrades preflight and final verification to record-required gates before applying Vercel changes.

The readiness, finalization, and live verification scripts accept the same Fuji registry aliases used by the Hardhat tooling: `ARKSCORE_REGISTRY_ADDRESS`, `CREDIT_SCORE_REGISTRY_ADDRESS`, `REGISTRY_ADDRESS`, or the generated `packages/contracts/deployments/fuji/CreditScoreRegistry.json` artifact.

## Submission Placeholders

- Live demo: `https://arkscore-seven.vercel.app`
- Vercel frontend: `https://arkscore-seven.vercel.app`
- Railway backend: `TBD`
- Fuji `CreditScoreRegistry`: `TBD`
- Optional eERC20 demo contract: `TBD`

## References

- Wavy Node docs: https://docs.wavynode.com
- Avalanche Fuji RPC: https://api.avax-test.network/ext/bc/C/rpc
- Ava Labs EncryptedERC: https://github.com/ava-labs/EncryptedERC
