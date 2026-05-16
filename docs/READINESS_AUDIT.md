# ArkScore Readiness Audit

Status date: May 16, 2026

## Ready

- Monorepo scaffolded with pnpm workspaces, Node.js 22.19.0 pinning, shared TypeScript configs, and environment examples.
- Next.js 15 App Router dashboard builds as a static Vercel export and includes Avalanche Fuji wallet connection, Wavy score intake, composite scoring, institutional decisioning, and on-chain write flow.
- Express API builds for Railway and exposes `GET /health` plus `GET /api/score/:address`.
- API tests cover `/health`, a Bankaool score response, and invalid institution rejection in mock mode.
- Simulated Railway archive install/build/test passes with `.railwayignore` applied, confirming the pruned backend workspace can deploy from the repository root.
- Wavy Node adapter is live-ready for `GET /v1/projects/:projectId/addresses/scan-risk?addresses=:address&chainId=43113` with deterministic mock mode for judge demos before credentials are added.
- Solidity `CreditScoreRegistry` compiles and passes tests for authorized Wavy-backed score storage.
- Deployment docs cover Vercel, Railway, Avalanche Fuji, and optional Ava Labs EncryptedERC demo follow-up.
- Vercel production is deployed and publicly reachable at `https://arkscore-seven.vercel.app`.
- Production dashboard smoke test passes in hosted demo fallback mode: `Fetch Wavy score` renders a mock Wavy trace, risk score, composite score, and evidence hash while Railway credentials are pending.

## Verified Locally

```bash
pnpm verify
```

The API endpoint test suite passes in mock mode and is included in `pnpm verify`.

`pnpm readiness` produces a non-secret live-gate report covering Vercel reachability, Railway auth, Wavy credentials, Fuji deployer configuration, and frontend deployment variables.

`pnpm verify:live` checks public deployment behavior. In the current partial-live state it should pass the Vercel frontend check and warn on missing Railway API and Fuji registry inputs; after final deployment, run `pnpm verify:live:strict`.

`pnpm finalize:live` is a dry-run finalizer for the Vercel handoff. `pnpm finalize:live:apply` sets `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS`, and `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false`, deploys production, then runs strict live verification.

## Pending Credentials

- `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` for live Wavy Node traceability and AI risk scoring.
- Railway login or `RAILWAY_TOKEN` for backend deployment.
- `FUJI_PRIVATE_KEY` for an Avalanche Fuji funded deployer account.
- Deployed `CreditScoreRegistry` address for `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS`.
- `NEXT_PUBLIC_API_BASE_URL` on Vercel must be set to the Railway API URL before the live Wavy-backed flow replaces hosted demo fallback mode.

## Deployment Targets

- Vercel frontend: `https://arkscore-seven.vercel.app`
- Railway backend: `TBD`
- Fuji `CreditScoreRegistry`: `TBD`
- Optional eERC20 demo contract: `TBD`
