# ArkScore Submission Evidence

Generated: 2026-05-16T22:12:15.649Z

## Repository Snapshot

- Branch: `main`
- Commit: `28dfffc`
- Worktree: clean when report was generated

## Deployment Targets

- Vercel frontend: https://arkscore-seven.vercel.app
- Railway backend: `TBD until Railway auth and Wavy credentials are configured`
- Avalanche Fuji `CreditScoreRegistry`: `TBD until FUJI_PRIVATE_KEY is funded and deployed`
- Optional eERC20 demo contract: `TBD unless the EncryptedERC demo is deployed`
- Latest Fuji score record: `TBD until pnpm record:fuji writes LatestScoreRecord.json`

## Evidence Summary

- PASS: Railway archive verifier (`pnpm --silent verify:railway`)
- PASS: Hosted demo smoke (`pnpm --silent smoke:web`)
- PASS: Live deployment verifier (`pnpm --silent verify:live`)
- PASS: Requirements audit (`pnpm --silent audit:requirements`)
- PASS: Judge demo runbook (`pnpm --silent judge:demo`)
- PASS: Readiness gate (`pnpm --silent readiness`)

## Current Scope Status

- Frontend dashboard: production-hosted demo fallback is public and judge-usable.
- Backend API: Railway-ready Express service is built and tested locally, including a pruned Railway archive verifier, but live deployment still needs Railway auth and Wavy credentials.
- Wavy Node: live adapter and probe tooling are present; live proof needs `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID`.
- Fuji registry: Solidity contract and scripts are ready; live proof needs funded `FUJI_PRIVATE_KEY`, deployed registry address, and authorized scorer wallet.
- Privacy model: API returns a backend-derived `subjectHash`; the contract stores hashed subjects, evidence hashes, Wavy analysis ids, and institutional decisions instead of raw scored wallets.

## Final Handoff Commands

```bash
pnpm probe:wavy
pnpm probe:fuji
pnpm plan:eerc20
pnpm probe:eerc20
pnpm railway:whoami
pnpm verify:railway
pnpm deploy:railway:apply -- --create-domain
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
pnpm verify:railway:live
pnpm --filter @arkscore/contracts deploy:fuji
export ARKSCORE_REGISTRY_ADDRESS=0x...
export ARKSCORE_SCORER_ADDRESS=0x...
# If the scorer is not the FUJI_PRIVATE_KEY deployer, set ARKSCORE_SCORER_PRIVATE_KEY.
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm readiness:strict:record
pnpm verify:live:preflight
pnpm finalize:live:apply
pnpm verify:live:strict:record
```

## Check Output

### Railway archive verifier

- Command: `pnpm --silent verify:railway`
- Exit code: `0`

````text
# ArkScore Railway Archive Verification

[pass] Required payload entry: package.json
[pass] Required payload entry: pnpm-lock.yaml
[pass] Required payload entry: pnpm-workspace.yaml
[pass] Required payload entry: railway.toml
[pass] Required payload entry: .railwayignore
[pass] Required payload entry: config/tsconfig/base.json
[pass] Required payload entry: config/tsconfig/node.json
[pass] Required payload entry: apps/api/package.json
[pass] Required payload entry: apps/api/src/server.ts
[pass] Required payload entry: apps/api/src/app.test.ts
[pass] Required payload entry: packages/shared/package.json
[pass] Required payload entry: packages/shared/src/index.ts
[pass] Excluded payload entry: .env
[pass] Excluded payload entry: .env.example
[pass] Excluded payload entry: apps/api/.env
[pass] Excluded payload entry: apps/api/.env.example
[pass] Excluded payload entry: apps/web
[pass] Excluded payload entry: packages/contracts
[pass] Excluded payload entry: docs
[pass] Excluded payload entry: node_modules
[pass] Railway ignore pattern: node_modules
[pass] Railway ignore pattern: **/node_modules
[pass] Railway ignore pattern: .env
[pass] Railway ignore pattern: .env.*
[pass] Railway ignore pattern: apps/web
[pass] Railway ignore pattern: packages/contracts
[pass] Railway ignore pattern: docs
[pass] Railway watch pattern: /apps/api/**
[pass] Railway watch pattern: /packages/shared/**
[pass] Railway watch pattern: /config/**

$ pnpm install --frozen-lockfile
Scope: all 3 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +247
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 247, reused 247, downloaded 0, added 247, done

devDependencies:
+ prettier 3.8.3
+ tsx 4.22.0
+ typescript 6.0.3

Done in 994ms using pnpm v11.1.2

$ pnpm --filter @arkscore/api build
CLI Building entry: src/server.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Target: es2022
CLI Cleaning output folder
ESM Build start
ESM dist/server.js 32.53 KB
ESM ⚡️ Build success in 403ms

$ tsup src/server.ts --format esm --clean

$ pnpm --filter @arkscore/api test
TAP version 13
# Subtest: health reports mock scoring mode when credentials are absent
ok 1 - health reports mock scoring mode when credentials are absent
  ---
  duration_ms: 20.9955
  type: 'test'
  ...
# Subtest: openapi document describes the public scoring contract
ok 2 - openapi document describes the public scoring contract
  ---
  duration_ms: 4.986458
  type: 'test'
  ...
# Subtest: openapi document honors Railway forwarded origin headers
ok 3 - openapi document honors Railway forwarded origin headers
  ---
  duration_ms: 2.283875
  type: 'test'
  ...
# Subtest: score endpoint returns a Bankaool-ready mock Wavy response
ok 4 - score endpoint returns a Bankaool-ready mock Wavy response
  ---
  duration_ms: 2.496792
  type: 'test'
  ...
# Subtest: score endpoint rejects unsupported institutions
ok 5 - score endpoint rejects unsupported institutions
  ---
  duration_ms: 2.087375
  type: 'test'
  ...
# Subtest: score endpoint rate limits repeated clients
ok 6 - score endpoint rate limits repeated clients
  ---
  duration_ms: 6.23175
  type: 'test'
  ...
# Subtest: API config defaults Wavy Node scoring to Avalanche Fuji
ok 7 - API config defaults Wavy Node scoring to Avalanche Fuji
  ---
  duration_ms: 0.390958
  type: 'test'
  ...
# Subtest: API config refuses non-Fuji Wavy Node chain IDs
ok 8 - API config refuses non-Fuji Wavy Node chain IDs
  ---
  duration_ms: 0.446834
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 756.193125
TAP version 13
# Subtest: fetchWavySupportedChains requests the Wavy chains endpoint
ok 1 - fetchWavySupportedChains requests the Wavy chains endpoint
  ---
  duration_ms: 8.395542
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult registers then scans the wallet
ok 2 - fetchWavyRiskResult registers then scans the wallet
  ---
  duration_ms: 0.632125
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult treats duplicate address registration as reusable
ok 3 - fetchWavyRiskResult treats duplicate address registration as reusable
  ---
  duration_ms: 0.939333
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult rejects upstream chain mismatches
ok 4 - fetchWavyRiskResult rejects upstream chain mismatches
  ---
  duration_ms: 0.50925
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult rejects upstream address mismatches
ok 5 - fetchWavyRiskResult rejects upstream address mismatches
  ---
  duration_ms: 0.962083
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult preserves upstream Wavy Node errors
ok 6 - fetchWavyRiskResult preserves upstream Wavy Node errors
  ---
  duration_ms: 0.355792
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
ok 7 - fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
  ---
  duration_ms: 0.135125
  type: 'test'
  ...
1..7
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 147.018833

$ NODE_ENV=test WAVY_NODE_MOCK_MODE=true ARKSCORE_SCORE_RATE_LIMIT_MAX=4 tsx --test src/app.test.ts src/config/env.test.ts && NODE_ENV=test WAVY_NODE_MOCK_MODE=false WAVY_NODE_API_KEY=wavy_test_key WAVY_NODE_PROJECT_ID=project_test tsx --test src/services/wavy-node.test.ts && tsc --noEmit

## Summary

- Passing: Railway payload install/build/test completed
- Payload: removed
````

### Hosted demo smoke

- Command: `pnpm --silent smoke:web`
- Exit code: `0`

````text
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
````

### Live deployment verifier

- Command: `pnpm --silent verify:live`
- Exit code: `0`

````text
# ArkScore Live Verification

[pass] Vercel web: https://arkscore-seven.vercel.app returned 200 and ArkScore HTML
[warn] Railway API: missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL
[warn] Fuji registry contract: missing ARKSCORE_REGISTRY_ADDRESS or NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS

## Summary

- Passing: 1
- Warnings: 2
- Failing: 0
- Report id: e02aaaeefbe1
````

### Requirements audit

- Command: `pnpm --silent audit:requirements`
- Exit code: `0`

````text
# ArkScore Requirements Audit

[pass] Next.js 15 App Router frontend: next 15.5.18, app router entrypoints present
[pass] Tailwind, shadcn-style UI, wagmi, viem: frontend dependencies and local UI primitives are present
[pass] Vercel frontend deployment config: vercel.json builds the static export and web public env example is present
[pass] Express score API: Express dependency, score route, health, and OpenAPI route are present
[pass] Railway backend deployment config: railway.toml builds, starts, healthchecks, watches shared config, and registers the archive verifier
[pass] Wavy Node traceability and AI risk score: adapter includes chains/register/scan-risk flow, Fuji-only runtime config, upstream result matching, and 0-100 traceability fields
[pass] Hardhat Solidity score registry: CreditScoreRegistry stores hashed score records with scorer authorization
[pass] Avalanche Fuji network config: Hardhat uses the official Fuji RPC and chain id 43113
[pass] Privacy-preserving subject hashing: API derives salted subjectHash and contract keys records by bytes32
[pass] Wallet score to on-chain dashboard flow: dashboard fetches scores, computes decisions, writes, and reads back Fuji evidence
[pass] Arkangeles and Bankaool institutional copy: frontend and decision labels cover IFC equity issuance and Bankaool loans
[pass] Optional eERC20 privacy-token path: planner/probe/dashboard slot ready; demo address not configured
[pass] Hackathon documentation packet: README, deployment, audit, trace, judge demo, submission, evidence, and eERC20 docs exist
[warn] Railway live deployment proof: missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL
[warn] Live Wavy credential proof: missing WAVY_NODE_API_KEY, WAVY_NODE_PROJECT_ID, ARKSCORE_SUBJECT_HASH_SALT
[warn] Fuji registry deployment proof: missing deployed registry address or Fuji deployment artifact
[warn] Authorized scorer proof: missing ARKSCORE_SCORER_ADDRESS or SCORER_ADDRESS
[pass] Latest on-chain score record proof: not configured yet; run pnpm record:fuji after live deployment
[pass] Final live verification and evidence path: strict record verifier, Railway API verifier, generatedAt-bound score hash checks, finalizer, readiness, and evidence scripts are registered

## Summary

- Passing: 15
- Warnings: 4
- Failing: 0
- Report id: 2100b2a4518a
````

### Judge demo runbook

- Command: `pnpm --silent judge:demo`
- Exit code: `0`

````text
# ArkScore Judge Demo Runbook

## Current Mode

- Frontend: https://arkscore-seven.vercel.app
- Score source: hosted fallback demo until Railway/Wavy credentials are configured
- Fuji registry: not configured yet
- Authorized scorer: not configured yet
- Latest score record proof: not recorded yet
- Optional eERC20: not configured
- Demo posture: judge-usable fallback with live proof blockers listed below

## Three-Minute Walkthrough

1. Open https://arkscore-seven.vercel.app.
2. Connect an Avalanche Fuji wallet.
3. Keep the demo wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045, or paste any EVM wallet.
4. Select Arkangeles, fetch the score, and point to Wavy risk, traceability, subject hash, evidence hash, composite score, and IFC equity issuance decision.
5. Switch to Bankaool, fetch again, and point to the credit-underwriting decision and changed institutional threshold.
6. Show the disabled Store on Fuji path and explain that the registry address is published during the final Fuji deployment.
7. Show the eERC20 privacy-token card as the optional EncryptedERC deployment slot.

## Proof Commands

```bash
pnpm smoke:web
pnpm audit:requirements
pnpm readiness
pnpm verify:live
pnpm probe:wavy
pnpm probe:fuji
pnpm plan:eerc20
pnpm probe:eerc20
pnpm railway:whoami
pnpm verify:railway
pnpm deploy:railway:apply -- --create-domain
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
pnpm verify:railway:live
pnpm --filter @arkscore/contracts deploy:fuji
export ARKSCORE_REGISTRY_ADDRESS=0x...
export ARKSCORE_SCORER_ADDRESS=0x...
# If the scorer is not the FUJI_PRIVATE_KEY deployer, set ARKSCORE_SCORER_PRIVATE_KEY.
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm readiness:strict:record
pnpm verify:live:preflight
pnpm finalize:live:apply
pnpm verify:live:strict:record
```

## Current Blockers

- Railway API URL is missing.
- WAVY_NODE_API_KEY is missing.
- WAVY_NODE_PROJECT_ID is missing.
- ARKSCORE_SUBJECT_HASH_SALT is missing.
- FUJI_PRIVATE_KEY is missing.
- Fuji CreditScoreRegistry address is missing.
- Authorized scorer address is missing.
- Latest Fuji score record artifact is missing.
````

### Readiness gate

- Command: `pnpm --silent readiness`
- Exit code: `0`

````text
# ArkScore Readiness Check

[pass] Node.js runtime: using 22.19.0
[pass] Next.js App Router entry: apps/web/src/app/page.tsx
[pass] Frontend public env example: apps/web/.env.local.example
[pass] Railway score endpoint: apps/api/src/routes/score.ts
[pass] Railway OpenAPI endpoint: apps/api/src/routes/openapi.ts
[pass] CreditScoreRegistry contract: packages/contracts/contracts/CreditScoreRegistry.sol
[pass] Railway root deployment config: railway.toml
[pass] Vercel root deployment config: vercel.json
[warn] Wavy Node credentials: required for live Wavy Node source=wavy responses; missing WAVY_NODE_API_KEY, WAVY_NODE_PROJECT_ID
[pass] Wavy Node chain ID: required so Wavy Node scores the same Avalanche Fuji network stored by the oracle; using default 43113
[warn] Subject hash salt: required to keep on-chain subject hashes environment-specific; missing ARKSCORE_SUBJECT_HASH_SALT
[warn] Fuji deployer key: required to deploy CreditScoreRegistry to Avalanche Fuji; missing FUJI_PRIVATE_KEY
[warn] Frontend API URL: required to point Vercel at the public HTTPS Railway API during finalization; missing ARKSCORE_API_URL, NEXT_PUBLIC_API_BASE_URL
[pass] Frontend Fuji RPC URL: required so the Vercel dashboard can read and write Avalanche Fuji from the browser; using default https://api.avax-test.network/ext/bc/C/rpc
[warn] Frontend registry address: required to enable Store on Fuji and set Vercel public env; missing ARKSCORE_REGISTRY_ADDRESS, CREDIT_SCORE_REGISTRY_ADDRESS, REGISTRY_ADDRESS, NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS, packages/contracts/deployments/fuji/CreditScoreRegistry.json
[pass] Optional eERC20 demo address: optional EncryptedERC privacy token demo address; not configured
[warn] Demo scorer address: required to prove the dashboard signer can store scores on Fuji; missing ARKSCORE_SCORER_ADDRESS, SCORER_ADDRESS
[pass] Latest Fuji score record: not configured yet; run pnpm record:fuji for final submission proof
[warn] Railway CLI auth: not authenticated; run pnpm railway:login, pnpm railway:login:browserless, or provide RAILWAY_TOKEN
[pass] Vercel CLI auth: authenticated for felirami
[pass] Vercel production URL: https://arkscore-seven.vercel.app returned 200

## Summary

- Passing: 14
- Warnings: 7
- Failing: 0
- Report id: 8c6150f2c4fc
````
