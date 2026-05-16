# ArkScore Readiness Audit

Status date: May 16, 2026

## Ready

- Monorepo scaffolded with pnpm workspaces, Node.js 22.19.0 pinning, shared TypeScript configs, and environment examples.
- Next.js 15 App Router dashboard builds as a static Vercel export and includes Avalanche Fuji wallet connection, Wavy score intake, composite scoring, institutional decisioning, and on-chain write flow.
- Dashboard reads `isScorer(connectedWallet)` from the Fuji registry and disables score storage until the connected wallet is authorized.
- The Fuji registry stores score records by backend-derived `subjectHash`, so the raw scored wallet address is not included in contract calldata or `ScoreRecorded` events.
- Express API builds for Railway and exposes `GET /`, `GET /openapi.json`, `GET /health`, and `GET /api/score/:address`.
- API tests cover `/health`, subject-hash salt health reporting, `/openapi.json` privacy fields, a Bankaool score response, invalid institution rejection in mock mode, and the live Wavy Node adapter request shape.
- Simulated Railway archive install/build/test passes with `.railwayignore` applied, confirming the pruned backend workspace can deploy from the repository root.
- Wavy Node adapter is live-ready for the official register-then-scan flow: `POST /v1/projects/:projectId/addresses`, then `GET /v1/projects/:projectId/addresses/scan-risk?addresses=:address&chainId=43113`, with backend-derived subject hashing and deterministic mock mode for judge demos before credentials are added.
- Solidity `CreditScoreRegistry` compiles and passes tests for authorized Wavy-backed score storage.
- Deployment docs cover Vercel, Railway, Avalanche Fuji, and optional Ava Labs EncryptedERC demo follow-up.
- GitHub Actions CI installs Node 22/pnpm 11, runs `pnpm verify`, and emits the non-secret `pnpm readiness` report.
- Vercel production is deployed and publicly reachable at `https://arkscore-seven.vercel.app` via deployment `dpl_3rX6XXQ9pF6DTq7RnhUkrZULqY1C`.
- Production dashboard smoke test passes in hosted demo fallback mode: `Fetch Wavy score` renders a mock Wavy trace, risk score, composite score, subject hash, and evidence hash while Railway credentials are pending.

## Verified Locally

```bash
pnpm verify
```

The API endpoint test suite passes in mock mode, and the isolated Wavy Node adapter tests verify address registration, the live `scan-risk` URL, `x-api-key` header, response normalization, duplicate registration handling, and upstream error propagation. Both are included in `pnpm verify`.

`.github/workflows/ci.yml` runs `pnpm verify` and `pnpm readiness` for push, pull request, and manual workflow dispatch events.

`pnpm readiness` produces a non-secret live-gate report covering Vercel reachability, Railway auth, Wavy credentials, Fuji deployer configuration, and frontend deployment variables. It accepts the same Railway API, Fuji registry, and scorer aliases used by the finalization and Hardhat scripts, so the report mirrors the actual handoff flow.

`pnpm smoke:web` checks that the public Vercel deployment is not protected by an auth page and that the shipped Next.js chunks include the hosted score demo, mock Wavy trace, subject hash, evidence hash, scorer status, and Store on Fuji flow.

`pnpm verify:live` checks public deployment behavior. In the current partial-live state it should pass the Vercel frontend check and warn on missing Railway API and Fuji registry inputs; after final deployment, run `pnpm verify:live:strict` to prove the Railway health, production subject-hash salt, OpenAPI, score response, live Wavy source, Fuji registry, and authorized scorer.

`pnpm deploy:railway` is a dry-run Railway deploy planner. `pnpm deploy:railway:apply -- --create-domain` creates or links the Railway project, sets non-secret and Wavy variables, uploads the API, and can generate the service domain when Railway auth is available.

`pnpm finalize:live` is a dry-run finalizer for the Vercel handoff. `pnpm finalize:live:apply` sets `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS`, and `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false`, deploys production, then runs strict live verification.

`pnpm --filter @arkscore/contracts scorer:fuji` authorizes or revokes the wallet that will submit score records from the dashboard. Strict live verification checks `ARKSCORE_SCORER_ADDRESS` with `isScorer(address)`.

## Pending Credentials

- `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` for live Wavy Node traceability and AI risk scoring.
- `ARKSCORE_SUBJECT_HASH_SALT` for environment-specific on-chain subject hashes.
- Railway login or `RAILWAY_TOKEN` for backend deployment.
- `FUJI_PRIVATE_KEY` for an Avalanche Fuji funded deployer account.
- Deployed `CreditScoreRegistry` address for `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS`.
- `NEXT_PUBLIC_API_BASE_URL` on Vercel must be set to the Railway API URL before the live Wavy-backed flow replaces hosted demo fallback mode.
- `ARKSCORE_SCORER_ADDRESS` should be set to the dashboard signing wallet and authorized before the final Store on Fuji demo.

## Deployment Targets

- Vercel frontend: `https://arkscore-seven.vercel.app`
- Railway backend: `TBD`
- Fuji `CreditScoreRegistry`: `TBD`
- Optional eERC20 demo contract: `TBD`
