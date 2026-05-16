# ArkScore Submission Evidence

Generated: 2026-05-16T18:51:22.974Z

## Repository Snapshot

- Branch: `main`
- Commit: `9f8e124`
- Worktree: clean when report was generated

## Deployment Targets

- Vercel frontend: https://arkscore-seven.vercel.app
- Railway backend: `TBD until Railway auth and Wavy credentials are configured`
- Avalanche Fuji `CreditScoreRegistry`: `TBD until FUJI_PRIVATE_KEY is funded and deployed`
- Optional eERC20 demo contract: `TBD unless the EncryptedERC demo is deployed`
- Latest Fuji score record: `TBD until pnpm record:fuji writes LatestScoreRecord.json`

## Evidence Summary

- PASS: Hosted demo smoke (`pnpm --silent smoke:web`)
- PASS: Live deployment verifier (`pnpm --silent verify:live`)
- PASS: Requirements audit (`pnpm --silent audit:requirements`)
- PASS: Readiness gate (`pnpm --silent readiness`)

## Current Scope Status

- Frontend dashboard: production-hosted demo fallback is public and judge-usable.
- Backend API: Railway-ready Express service is built and tested locally, but live deployment still needs Railway auth and Wavy credentials.
- Wavy Node: live adapter and probe tooling are present; live proof needs `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID`.
- Fuji registry: Solidity contract and scripts are ready; live proof needs funded `FUJI_PRIVATE_KEY`, deployed registry address, and authorized scorer wallet.
- Privacy model: API returns a backend-derived `subjectHash`; the contract stores hashed subjects, evidence hashes, Wavy analysis ids, and institutional decisions instead of raw scored wallets.

## Final Handoff Commands

```bash
pnpm probe:wavy
pnpm probe:fuji
pnpm plan:eerc20
pnpm probe:eerc20
pnpm deploy:railway:apply -- --create-domain
pnpm --filter @arkscore/contracts deploy:fuji
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm readiness:strict:record
ARKSCORE_API_URL=https://your-railway-api.up.railway.app ARKSCORE_REGISTRY_ADDRESS=0x... ARKSCORE_SCORER_ADDRESS=0x... pnpm verify:live:preflight
ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live:apply
pnpm verify:live:strict:record
```

## Check Output

### Hosted demo smoke

- Command: `pnpm --silent smoke:web`
- Exit code: `0`

```text
# ArkScore Hosted Demo Smoke

[pass] Public page: https://arkscore-seven.vercel.app returned 200
[pass] HTML contains ArkScore: ArkScore
[pass] HTML contains Avalanche Fuji: Avalanche Fuji
[pass] HTML contains eERC20: eERC20
[pass] HTML contains Private credit token demo: Private credit token demo
[pass] HTML excludes Authentication Required: Authentication Required
[pass] Next.js chunks: 10 script chunks discovered
[pass] Bundle contains Fetch Wavy score: Fetch Wavy score
[pass] Bundle contains Mock Wavy trace: Mock Wavy trace
[pass] Bundle contains Wavy risk: Wavy risk
[pass] Bundle contains Subject hash: Subject hash
[pass] Bundle contains Evidence hash: Evidence hash
[pass] Bundle contains Traceability: Traceability
[pass] Bundle contains AI risk scale: AI risk scale
[pass] Bundle contains Scorer status: Scorer status
[pass] Bundle contains Subject status: Subject status
[pass] Bundle contains Store on Fuji: Store on Fuji
[pass] Bundle contains On-chain readback: On-chain readback
[pass] Bundle contains Evidence match: Evidence match

## Summary

- Passing: 19
- Failing: 0
- Report id: ff68c0bfd56c
```

### Live deployment verifier

- Command: `pnpm --silent verify:live`
- Exit code: `0`

```text
# ArkScore Live Verification

[pass] Vercel web: https://arkscore-seven.vercel.app returned 200 and ArkScore HTML
[warn] Railway API: missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL
[warn] Fuji registry contract: missing ARKSCORE_REGISTRY_ADDRESS or NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS

## Summary

- Passing: 1
- Warnings: 2
- Failing: 0
- Report id: e02aaaeefbe1
```

### Requirements audit

- Command: `pnpm --silent audit:requirements`
- Exit code: `0`

```text
# ArkScore Requirements Audit

[pass] Next.js 15 App Router frontend: next 15.5.18, app router entrypoints present
[pass] Tailwind, shadcn-style UI, wagmi, viem: frontend dependencies and local UI primitives are present
[pass] Vercel frontend deployment config: vercel.json builds and serves the Next.js static export
[pass] Express score API: Express dependency, score route, health, and OpenAPI route are present
[pass] Railway backend deployment config: railway.toml builds, starts, and healthchecks the API service
[pass] Wavy Node traceability and AI risk score: adapter includes chains/register/scan-risk flow and 0-100 traceability fields
[pass] Hardhat Solidity score registry: CreditScoreRegistry stores hashed score records with scorer authorization
[pass] Avalanche Fuji network config: Hardhat uses the official Fuji RPC and chain id 43113
[pass] Privacy-preserving subject hashing: API derives salted subjectHash and contract keys records by bytes32
[pass] Wallet score to on-chain dashboard flow: dashboard fetches scores, computes decisions, writes, and reads back Fuji evidence
[pass] Arkangeles and Bankaool institutional copy: frontend and decision labels cover IFC equity issuance and Bankaool loans
[pass] Optional eERC20 privacy-token path: planner/probe/dashboard slot ready; demo address not configured
[pass] Hackathon documentation packet: README, deployment, audit, trace, submission, evidence, and eERC20 docs exist
[warn] Railway live deployment proof: missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL
[warn] Live Wavy credential proof: missing WAVY_NODE_API_KEY, WAVY_NODE_PROJECT_ID, ARKSCORE_SUBJECT_HASH_SALT
[warn] Fuji registry deployment proof: missing deployed registry address or Fuji deployment artifact
[warn] Authorized scorer proof: missing ARKSCORE_SCORER_ADDRESS or SCORER_ADDRESS
[pass] Latest on-chain score record proof: not configured yet; run pnpm record:fuji after live deployment
[pass] Final live verification and evidence path: strict record verifier, finalizer, readiness, and evidence scripts are registered

## Summary

- Passing: 15
- Warnings: 4
- Failing: 0
- Report id: 76491c38a8cd
```

### Readiness gate

- Command: `pnpm --silent readiness`
- Exit code: `0`

```text
# ArkScore Readiness Check

[pass] Node.js runtime: using 22.19.0
[pass] Next.js App Router entry: apps/web/src/app/page.tsx
[pass] Railway score endpoint: apps/api/src/routes/score.ts
[pass] Railway OpenAPI endpoint: apps/api/src/routes/openapi.ts
[pass] CreditScoreRegistry contract: packages/contracts/contracts/CreditScoreRegistry.sol
[pass] Railway root deployment config: railway.toml
[pass] Vercel root deployment config: vercel.json
[warn] Wavy Node credentials: required for live Wavy Node source=wavy responses; missing WAVY_NODE_API_KEY, WAVY_NODE_PROJECT_ID
[warn] Subject hash salt: required to keep on-chain subject hashes environment-specific; missing ARKSCORE_SUBJECT_HASH_SALT
[warn] Fuji deployer key: required to deploy CreditScoreRegistry to Avalanche Fuji; missing FUJI_PRIVATE_KEY
[warn] Frontend API URL: required to point Vercel at the Railway API during finalization; missing ARKSCORE_API_URL, NEXT_PUBLIC_API_BASE_URL
[warn] Frontend registry address: required to enable Store on Fuji and set Vercel public env; missing ARKSCORE_REGISTRY_ADDRESS, CREDIT_SCORE_REGISTRY_ADDRESS, REGISTRY_ADDRESS, NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS, packages/contracts/deployments/fuji/CreditScoreRegistry.json
[pass] Optional eERC20 demo address: optional EncryptedERC privacy token demo address; not configured
[warn] Demo scorer address: required to prove the dashboard signer can store scores on Fuji; missing ARKSCORE_SCORER_ADDRESS, SCORER_ADDRESS
[pass] Latest Fuji score record: not configured yet; run pnpm record:fuji for final submission proof
[warn] Railway CLI auth: not authenticated; run railway login or provide RAILWAY_TOKEN
[pass] Vercel CLI auth: authenticated for felirami
[pass] Vercel production URL: https://arkscore-seven.vercel.app returned 200

## Summary

- Passing: 11
- Warnings: 7
- Failing: 0
- Report id: da7cb1931d12
```
