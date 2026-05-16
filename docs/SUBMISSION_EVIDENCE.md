# ArkScore Submission Evidence

Generated: 2026-05-16T17:32:54.800Z

## Repository Snapshot

- Branch: `main`
- Commit: `cac5916`
- Worktree: clean when report was generated

## Deployment Targets

- Vercel frontend: https://arkscore-seven.vercel.app
- Railway backend: `TBD until Railway auth and Wavy credentials are configured`
- Avalanche Fuji `CreditScoreRegistry`: `TBD until FUJI_PRIVATE_KEY is funded and deployed`
- Optional eERC20 demo contract: `TBD unless the EncryptedERC demo is deployed`

## Evidence Summary

- PASS: Hosted demo smoke (`pnpm --silent smoke:web`)
- PASS: Live deployment verifier (`pnpm --silent verify:live`)
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
pnpm deploy:railway:apply -- --create-domain
pnpm --filter @arkscore/contracts deploy:fuji
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live:apply
pnpm verify:live:strict
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
[warn] Railway CLI auth: not authenticated; run railway login or provide RAILWAY_TOKEN
[pass] Vercel CLI auth: authenticated for felirami
[pass] Vercel production URL: https://arkscore-seven.vercel.app returned 200

## Summary

- Passing: 10
- Warnings: 7
- Failing: 0
- Report id: 11bb2d9d6e74
```
