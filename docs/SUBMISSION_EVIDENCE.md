# ArkScore Submission Evidence

Generated: 2026-05-16T23:54:29.197Z

## Repository Snapshot

- Branch: `main`
- Commit: `2ecfab3`
- Worktree: clean when report was generated

## Deployment Targets

- Vercel frontend: https://arkscore-seven.vercel.app
- Railway backend: `TBD until Railway auth and Wavy credentials are configured`
- Avalanche Fuji `CreditScoreRegistry`: `TBD until FUJI_PRIVATE_KEY is funded and deployed`
- Optional eERC20 demo contract: `TBD unless the EncryptedERC demo is deployed`
- Latest Fuji score record: `TBD until pnpm record:fuji writes LatestScoreRecord.json`

## Evidence Summary

- PASS: Full repo verification (`pnpm --silent verify`)
- PASS: Railway archive verifier (`pnpm --silent verify:railway`)
- PASS: Hosted demo smoke (`pnpm --silent smoke:web`)
- WARN: Live deployment verifier (`pnpm --silent verify:live`)
- WARN: Requirements audit (`pnpm --silent audit:requirements`)
- WARN: Judge demo runbook (`pnpm --silent judge:demo`)
- WARN: Readiness gate (`pnpm --silent readiness`)

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
# If deploy:railway:apply did not print and verify a generated API URL, export it manually.
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
pnpm verify:railway:live
pnpm --filter @arkscore/contracts deploy:fuji
export ARKSCORE_REGISTRY_ADDRESS=0x...
export ARKSCORE_SCORER_ADDRESS=0x...
# If the scorer is not the FUJI_PRIVATE_KEY deployer, set ARKSCORE_SCORER_PRIVATE_KEY.
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm readiness:strict:record
pnpm verify:live:preflight:record
pnpm finalize:live:apply
pnpm verify:live:strict:record
```

## Check Output

### Full repo verification

- Command: `pnpm --silent verify`
- Exit code: `0`
- Status: `PASS`

````text
TAP version 13
# Subtest: root package exposes Railway CLI handoff scripts
ok 1 - root package exposes Railway CLI handoff scripts
  ---
  duration_ms: 1.213458
  type: 'test'
  ...
# Subtest: web env example documents public deployment variables
ok 2 - web env example documents public deployment variables
  ---
  duration_ms: 0.366958
  type: 'test'
  ...
# Subtest: Railway dry run prints redacted secret variable commands
ok 3 - Railway dry run prints redacted secret variable commands
  ---
  duration_ms: 349.298125
  type: 'test'
  ...
# Subtest: Railway fresh project dry run creates the target service before variables
ok 4 - Railway fresh project dry run creates the target service before variables
  ---
  duration_ms: 341.291667
  type: 'test'
  ...
# Subtest: Railway live dry run overrides stale local mock mode
ok 5 - Railway live dry run overrides stale local mock mode
  ---
  duration_ms: 395.968292
  type: 'test'
  ...
# Subtest: Railway deploy refuses non-Fuji Wavy chain IDs
ok 6 - Railway deploy refuses non-Fuji Wavy chain IDs
  ---
  duration_ms: 346.103417
  type: 'test'
  ...
# Subtest: Railway dry run skips Wavy probe for explicit mock deployment
ok 7 - Railway dry run skips Wavy probe for explicit mock deployment
  ---
  duration_ms: 345.3545
  type: 'test'
  ...
# Subtest: Railway apply refuses missing live credentials unless mock is explicit
ok 8 - Railway apply refuses missing live credentials unless mock is explicit
  ---
  duration_ms: 336.604167
  type: 'test'
  ...
# Subtest: Railway apply verifies the generated service domain before handoff
ok 9 - Railway apply verifies the generated service domain before handoff
  ---
  duration_ms: 1135.925167
  type: 'test'
  ...
# Subtest: Wavy probe refuses non-Fuji chain IDs before live calls
ok 10 - Wavy probe refuses non-Fuji chain IDs before live calls
  ---
  duration_ms: 344.103167
  type: 'test'
  ...
# Subtest: submission evidence can render without executing live checks
ok 11 - submission evidence can render without executing live checks
  ---
  duration_ms: 380.187541
  type: 'test'
  ...
# Subtest: submission evidence marks warning-bearing checks as WARN
ok 12 - submission evidence marks warning-bearing checks as WARN
  ---
  duration_ms: 1093.703875
  type: 'test'
  ...
# Subtest: submission evidence full mode includes monorepo verification
ok 13 - submission evidence full mode includes monorepo verification
  ---
  duration_ms: 651.626333
  type: 'test'
  ...
# Subtest: submission evidence renders configured public deployment targets only
ok 14 - submission evidence renders configured public deployment targets only
  ---
  duration_ms: 395.431792
  type: 'test'
  ...
# Subtest: submission evidence ignores local API URLs as deployment targets
ok 15 - submission evidence ignores local API URLs as deployment targets
  ---
  duration_ms: 388.561042
  type: 'test'
  ...
# Subtest: submission evidence includes the latest Fuji score record proof
ok 16 - submission evidence includes the latest Fuji score record proof
  ---
  duration_ms: 378.035917
  type: 'test'
  ...
# Subtest: submission evidence refuses an invalid latest Fuji score record proof
ok 17 - submission evidence refuses an invalid latest Fuji score record proof
  ---
  duration_ms: 373.121
  type: 'test'
  ...
# Subtest: submission evidence refuses a stale latest Fuji score record snapshot
ok 18 - submission evidence refuses a stale latest Fuji score record snapshot
  ---
  duration_ms: 383.884084
  type: 'test'
  ...
# Subtest: readiness reports a configured latest Fuji score record proof
ok 19 - readiness reports a configured latest Fuji score record proof
  ---
  duration_ms: 345.8315
  type: 'test'
  ...
# Subtest: readiness strict record warns when the score record proof is missing
ok 20 - readiness strict record warns when the score record proof is missing
  ---
  duration_ms: 340.159542
  type: 'test'
  ...
# Subtest: readiness strict record rejects mock score record proof even with override
ok 21 - readiness strict record rejects mock score record proof even with override
  ---
  duration_ms: 363.358416
  type: 'test'
  ...
# Subtest: readiness treats the default score record artifact path as optional until strict record
ok 22 - readiness treats the default score record artifact path as optional until strict record
  ---
  duration_ms: 349.315709
  type: 'test'
  ...
# Subtest: readiness probes the configured production web URL
ok 23 - readiness probes the configured production web URL
  ---
  duration_ms: 359.222542
  type: 'test'
  ...
# Subtest: readiness warns when the frontend API URL is local-only
ok 24 - readiness warns when the frontend API URL is local-only
  ---
  duration_ms: 339.429042
  type: 'test'
  ...
# Subtest: readiness reports the default public Fuji RPC URL
ok 25 - readiness reports the default public Fuji RPC URL
  ---
  duration_ms: 334.891958
  type: 'test'
  ...
# Subtest: readiness reports the default Wavy Node Fuji chain ID
ok 26 - readiness reports the default Wavy Node Fuji chain ID
  ---
  duration_ms: 336.508958
  type: 'test'
  ...
# Subtest: readiness warns when Wavy Node chain ID is not Fuji
ok 27 - readiness warns when Wavy Node chain ID is not Fuji
  ---
  duration_ms: 336.465125
  type: 'test'
  ...
# Subtest: readiness warns when the frontend Fuji RPC URL is local-only
ok 28 - readiness warns when the frontend Fuji RPC URL is local-only
  ---
  duration_ms: 332.351625
  type: 'test'
  ...
# Subtest: requirements audit maps repo readiness without leaking secrets
ok 29 - requirements audit maps repo readiness without leaking secrets
  ---
  duration_ms: 348.016666
  type: 'test'
  ...
# Subtest: requirements audit warns when score record proof uses a local API URL
ok 30 - requirements audit warns when score record proof uses a local API URL
  ---
  duration_ms: 350.224459
  type: 'test'
  ...
# Subtest: requirements audit warns when score record proof mismatches configured scorer
ok 31 - requirements audit warns when score record proof mismatches configured scorer
  ---
  duration_ms: 341.711
  type: 'test'
  ...
# Subtest: requirements audit strict mode fails while live proof is missing
ok 32 - requirements audit strict mode fails while live proof is missing
  ---
  duration_ms: 333.971917
  type: 'test'
  ...
# Subtest: judge demo runbook renders fallback blockers without leaking secrets
ok 33 - judge demo runbook renders fallback blockers without leaking secrets
  ---
  duration_ms: 339.470041
  type: 'test'
  ...
# Subtest: judge demo runbook treats local API URLs as fallback blockers
ok 34 - judge demo runbook treats local API URLs as fallback blockers
  ---
  duration_ms: 339.405792
  type: 'test'
  ...
# Subtest: judge demo runbook renders live proof mode when configured
ok 35 - judge demo runbook renders live proof mode when configured
  ---
  duration_ms: 346.5875
  type: 'test'
  ...
# Subtest: judge demo runbook keeps fallback posture while live credentials are missing
ok 36 - judge demo runbook keeps fallback posture while live credentials are missing
  ---
  duration_ms: 339.017291
  type: 'test'
  ...
# Subtest: judge demo runbook treats required eERC20 as a final proof blocker
ok 37 - judge demo runbook treats required eERC20 as a final proof blocker
  ---
  duration_ms: 335.115708
  type: 'test'
  ...
# Subtest: judge demo runbook treats invalid score record proof as a live blocker
ok 38 - judge demo runbook treats invalid score record proof as a live blocker
  ---
  duration_ms: 334.9115
  type: 'test'
  ...
# Subtest: submission evidence renders strict eERC20 handoff when required
ok 39 - submission evidence renders strict eERC20 handoff when required
  ---
  duration_ms: 377.042375
  type: 'test'
  ...
# Subtest: Vercel finalizer dry run prints public env and strict verification commands
ok 40 - Vercel finalizer dry run prints public env and strict verification commands
  ---
  duration_ms: 356.941041
  type: 'test'
  ...
# Subtest: Vercel finalizer apply retries final verification after deploy
ok 41 - Vercel finalizer apply retries final verification after deploy
  ---
  duration_ms: 680.104333
  type: 'test'
  ...
# Subtest: Vercel finalizer apply preserves score-record gates around deploy
ok 42 - Vercel finalizer apply preserves score-record gates around deploy
  ---
  duration_ms: 664.701459
  type: 'test'
  ...
# Subtest: Vercel finalizer ignores empty primary aliases and uses fallback env
ok 43 - Vercel finalizer ignores empty primary aliases and uses fallback env
  ---
  duration_ms: 334.671208
  type: 'test'
  ...
# Subtest: Vercel finalizer dry run prints strict eERC20 verification when required
ok 44 - Vercel finalizer dry run prints strict eERC20 verification when required
  ---
  duration_ms: 335.053208
  type: 'test'
  ...
# Subtest: Vercel finalizer dry run uses record verification when artifact is configured
ok 45 - Vercel finalizer dry run uses record verification when artifact is configured
  ---
  duration_ms: 339.03875
  type: 'test'
  ...
# Subtest: Vercel finalizer does not require the missing default score record path
ok 46 - Vercel finalizer does not require the missing default score record path
  ---
  duration_ms: 335.288708
  type: 'test'
  ...
# Subtest: Vercel finalizer dry run uses eERC20 record verification when both are required
ok 47 - Vercel finalizer dry run uses eERC20 record verification when both are required
  ---
  duration_ms: 336.570834
  type: 'test'
  ...
# Subtest: Vercel finalizer refuses a missing required score record artifact
ok 48 - Vercel finalizer refuses a missing required score record artifact
  ---
  duration_ms: 335.455459
  type: 'test'
  ...
# Subtest: Vercel finalizer refuses missing API URL before printing deploy commands
ok 49 - Vercel finalizer refuses missing API URL before printing deploy commands
  ---
  duration_ms: 338.468833
  type: 'test'
  ...
# Subtest: Vercel finalizer refuses local API URLs before printing deploy commands
ok 50 - Vercel finalizer refuses local API URLs before printing deploy commands
  ---
  duration_ms: 341.82875
  type: 'test'
  ...
# Subtest: Vercel finalizer refuses local public Fuji RPC URLs before printing deploy commands
ok 51 - Vercel finalizer refuses local public Fuji RPC URLs before printing deploy commands
  ---
  duration_ms: 378.568041
  type: 'test'
  ...
# Subtest: Vercel finalizer refuses invalid registry address
ok 52 - Vercel finalizer refuses invalid registry address
  ---
  duration_ms: 342.97925
  type: 'test'
  ...
# Subtest: Vercel finalizer refuses a missing required eERC20 demo address
ok 53 - Vercel finalizer refuses a missing required eERC20 demo address
  ---
  duration_ms: 361.170833
  type: 'test'
  ...
# Subtest: eERC20 probe is optional by default when no address is configured
ok 54 - eERC20 probe is optional by default when no address is configured
  ---
  duration_ms: 345.035916
  type: 'test'
  ...
# Subtest: eERC20 planner prints official Fuji handoff commands without secrets
ok 55 - eERC20 planner prints official Fuji handoff commands without secrets
  ---
  duration_ms: 340.910833
  type: 'test'
  ...
# Subtest: eERC20 planner recognizes a local EncryptedERC Fuji checkout
ok 56 - eERC20 planner recognizes a local EncryptedERC Fuji checkout
  ---
  duration_ms: 342.693542
  type: 'test'
  ...
# Subtest: eERC20 strict probe refuses a missing optional demo address
ok 57 - eERC20 strict probe refuses a missing optional demo address
  ---
  duration_ms: 339.954625
  type: 'test'
  ...
# Subtest: eERC20 probe verifies deployed Fuji bytecode
ok 58 - eERC20 probe verifies deployed Fuji bytecode
  ---
  duration_ms: 351.101583
  type: 'test'
  ...
# Subtest: eERC20 probe fails when the configured address has no Fuji bytecode
ok 59 - eERC20 probe fails when the configured address has no Fuji bytecode
  ---
  duration_ms: 353.051833
  type: 'test'
  ...
# Subtest: live verifier fails when eERC20 is required but missing
ok 60 - live verifier fails when eERC20 is required but missing
  ---
  duration_ms: 350.487708
  type: 'test'
  ...
# Subtest: Fuji registry deployer refuses missing private key before deployment
ok 61 - Fuji registry deployer refuses missing private key before deployment
  ---
  duration_ms: 501.156042
  type: 'test'
  ...
# Subtest: Fuji registry deployer refuses malformed private key with project error
ok 62 - Fuji registry deployer refuses malformed private key with project error
  ---
  duration_ms: 452.734542
  type: 'test'
  ...
# Subtest: Fuji scorer authorizer refuses missing private key before network calls
ok 63 - Fuji scorer authorizer refuses missing private key before network calls
  ---
  duration_ms: 444.037625
  type: 'test'
  ...
# Subtest: Fuji scorer authorizer refuses malformed private key with project error
ok 64 - Fuji scorer authorizer refuses malformed private key with project error
  ---
  duration_ms: 444.018875
  type: 'test'
  ...
# Subtest: Fuji scorer authorizer refuses invalid authorization flag before network calls
ok 65 - Fuji scorer authorizer refuses invalid authorization flag before network calls
  ---
  duration_ms: 470.8105
  type: 'test'
  ...
# Subtest: Fuji score recorder refuses local API URLs before touching Fuji
ok 66 - Fuji score recorder refuses local API URLs before touching Fuji
  ---
  duration_ms: 520.179625
  type: 'test'
  ...
# Subtest: Fuji score recorder refuses configured scorer mismatch before live calls
ok 67 - Fuji score recorder refuses configured scorer mismatch before live calls
  ---
  duration_ms: 558.493458
  type: 'test'
  ...
# Subtest: live verifier proves registry getScore readback ABI
ok 68 - live verifier proves registry getScore readback ABI
  ---
  duration_ms: 391.681375
  type: 'test'
  ...
# Subtest: live verifier proves the latest Fuji score record artifact
ok 69 - live verifier proves the latest Fuji score record artifact
  ---
  duration_ms: 384.128792
  type: 'test'
  ...
# Subtest: live verifier fails when the latest Fuji score record differs on-chain
ok 70 - live verifier fails when the latest Fuji score record differs on-chain
  ---
  duration_ms: 383.882708
  type: 'test'
  ...
# Subtest: live verifier rejects mock latest Fuji score record artifacts
ok 71 - live verifier rejects mock latest Fuji score record artifacts
  ---
  duration_ms: 387.5845
  type: 'test'
  ...
# Subtest: live verifier rejects local API URLs in score record artifacts
ok 72 - live verifier rejects local API URLs in score record artifacts
  ---
  duration_ms: 396.116375
  type: 'test'
  ...
# Subtest: live verifier rejects score record artifacts with tampered score snapshots
ok 73 - live verifier rejects score record artifacts with tampered score snapshots
  ---
  duration_ms: 403.553667
  type: 'test'
  ...
# Subtest: live verifier rejects score record artifacts with stale score snapshots
ok 74 - live verifier rejects score record artifacts with stale score snapshots
  ---
  duration_ms: 384.70825
  type: 'test'
  ...
# Subtest: live verifier preflight skips Vercel and proves API plus registry
ok 75 - live verifier preflight skips Vercel and proves API plus registry
  ---
  duration_ms: 384.422
  type: 'test'
  ...
# Subtest: live verifier preflight ignores empty primary aliases
ok 76 - live verifier preflight ignores empty primary aliases
  ---
  duration_ms: 393.765834
  type: 'test'
  ...
# Subtest: live verifier fails when Railway health reports a non-Fuji Wavy chain
ok 77 - live verifier fails when Railway health reports a non-Fuji Wavy chain
  ---
  duration_ms: 401.345125
  type: 'test'
  ...
# Subtest: live verifier fails when the Railway score evidence hash is stale
ok 78 - live verifier fails when the Railway score evidence hash is stale
  ---
  duration_ms: 398.478875
  type: 'test'
  ...
# Subtest: live verifier fails when the Railway score response is stale
ok 79 - live verifier fails when the Railway score response is stale
  ---
  duration_ms: 401.765875
  type: 'test'
  ...
# Subtest: live verifier fails when the Railway score timestamp is not evidence-hashed
ok 80 - live verifier fails when the Railway score timestamp is not evidence-hashed
  ---
  duration_ms: 389.724833
  type: 'test'
  ...
# Subtest: live verifier proves configured public Fuji RPC in the hosted bundle
ok 81 - live verifier proves configured public Fuji RPC in the hosted bundle
  ---
  duration_ms: 389.636291
  type: 'test'
  ...
# Subtest: live verifier strict mode rejects local public Fuji RPC URLs
ok 82 - live verifier strict mode rejects local public Fuji RPC URLs
  ---
  duration_ms: 350.956459
  type: 'test'
  ...
# Subtest: live verifier fails when OpenAPI omits the served API origin
ok 83 - live verifier fails when OpenAPI omits the served API origin
  ---
  duration_ms: 386.833292
  type: 'test'
  ...
# Subtest: live verifier strict mode rejects local API URLs by default
ok 84 - live verifier strict mode rejects local API URLs by default
  ---
  duration_ms: 361.930875
  type: 'test'
  ...
# Subtest: live verifier fails when registry hasScore ABI returns malformed data
ok 85 - live verifier fails when registry hasScore ABI returns malformed data
  ---
  duration_ms: 400.333291
  type: 'test'
  ...
# Subtest: live verifier fails when registry getScore ABI returns a zero-hash record
ok 86 - live verifier fails when registry getScore ABI returns a zero-hash record
  ---
  duration_ms: 383.627125
  type: 'test'
  ...
1..86
# tests 86
# suites 0
# pass 86
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 33643.203167
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

Done in 1s using pnpm v11.1.2

$ pnpm --filter @arkscore/api build
CLI Building entry: src/server.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Target: es2022
CLI Cleaning output folder
ESM Build start
ESM dist/server.js 32.53 KB
ESM ⚡️ Build success in 409ms

$ tsup src/server.ts --format esm --clean

$ pnpm --filter @arkscore/api test
TAP version 13
# Subtest: health reports mock scoring mode when credentials are absent
ok 1 - health reports mock scoring mode when credentials are absent
  ---
  duration_ms: 19.48225
  type: 'test'
  ...
# Subtest: openapi document describes the public scoring contract
ok 2 - openapi document describes the public scoring contract
  ---
  duration_ms: 3.785208
  type: 'test'
  ...
# Subtest: openapi document honors Railway forwarded origin headers
ok 3 - openapi document honors Railway forwarded origin headers
  ---
  duration_ms: 2.135958
  type: 'test'
  ...
# Subtest: score endpoint returns a Bankaool-ready mock Wavy response
ok 4 - score endpoint returns a Bankaool-ready mock Wavy response
  ---
  duration_ms: 2.406917
  type: 'test'
  ...
# Subtest: score endpoint rejects unsupported institutions
ok 5 - score endpoint rejects unsupported institutions
  ---
  duration_ms: 2.070125
  type: 'test'
  ...
# Subtest: score endpoint rate limits repeated clients
ok 6 - score endpoint rate limits repeated clients
  ---
  duration_ms: 6.377167
  type: 'test'
  ...
# Subtest: API config defaults Wavy Node scoring to Avalanche Fuji
ok 7 - API config defaults Wavy Node scoring to Avalanche Fuji
  ---
  duration_ms: 0.355834
  type: 'test'
  ...
# Subtest: API config refuses non-Fuji Wavy Node chain IDs
ok 8 - API config refuses non-Fuji Wavy Node chain IDs
  ---
  duration_ms: 0.435542
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
# duration_ms 659.675709
TAP version 13
# Subtest: fetchWavySupportedChains requests the Wavy chains endpoint
ok 1 - fetchWavySupportedChains requests the Wavy chains endpoint
  ---
  duration_ms: 8.741875
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult registers then scans the wallet
ok 2 - fetchWavyRiskResult registers then scans the wallet
  ---
  duration_ms: 0.619375
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult treats duplicate address registration as reusable
ok 3 - fetchWavyRiskResult treats duplicate address registration as reusable
  ---
  duration_ms: 0.90725
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult rejects upstream chain mismatches
ok 4 - fetchWavyRiskResult rejects upstream chain mismatches
  ---
  duration_ms: 0.494084
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult rejects upstream address mismatches
ok 5 - fetchWavyRiskResult rejects upstream address mismatches
  ---
  duration_ms: 1.024916
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult preserves upstream Wavy Node errors
ok 6 - fetchWavyRiskResult preserves upstream Wavy Node errors
  ---
  duration_ms: 0.368417
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
ok 7 - fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
  ---
  duration_ms: 0.146125
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
# duration_ms 153.562958

$ NODE_ENV=test WAVY_NODE_MOCK_MODE=true ARKSCORE_SCORE_RATE_LIMIT_MAX=4 tsx --test src/app.test.ts src/config/env.test.ts && NODE_ENV=test WAVY_NODE_MOCK_MODE=false WAVY_NODE_API_KEY=wavy_test_key WAVY_NODE_PROJECT_ID=project_test tsx --test src/services/wavy-node.test.ts && tsc --noEmit

## Summary

- Passing: Railway payload install/build/test completed
- Payload: removed
Scope: 4 of 5 workspace projects
packages/contracts lint$ solhint 'contracts/**/*.sol'
packages/shared lint$ eslint src --max-warnings=0
packages/contracts lint: Done
packages/shared lint: Done
apps/api lint$ eslint src --max-warnings=0
apps/web lint$ eslint src next.config.ts postcss.config.mjs --max-warnings=0
apps/api lint: Done
apps/web lint: Done
Scope: 4 of 5 workspace projects
packages/contracts test$ hardhat test
packages/shared test$ tsc --noEmit
packages/contracts test: No contracts to compile
packages/shared test: Done
packages/contracts test: Running Solidity tests
packages/contracts test: Running Mocha tests
packages/contracts test:   CreditScoreRegistry
packages/contracts test:     ✔ records a Wavy-backed score from an authorized scorer (231ms)
packages/contracts test:     ✔ overwrites an existing subject score with the latest Wavy evidence
packages/contracts test:     ✔ manages institutional scorers through the owner account
packages/contracts test:     ✔ transfers ownership and authorizes the new owner as a scorer
packages/contracts test:     ✔ blocks unapproved scorers
packages/contracts test:     ✔ rejects an empty subject hash
packages/contracts test:     ✔ rejects scores outside the 0-100 scale
packages/contracts test:     ✔ rejects missing score reads
packages/contracts test:     ✔ rejects invalid owner and scorer addresses
packages/contracts test:   9 passing (277ms)
packages/contracts test: 9 passing (9 mocha)
packages/contracts test: Done
apps/api test$ NODE_ENV=test WAVY_NODE_MOCK_MODE=true ARKSCORE_SCORE_RATE_LIMIT_MAX=4 tsx --test src/app.test.ts src/config/env.test.ts && NODE_ENV=test WAVY_NODE_MOCK_MODE=false WAVY_NODE_API_KEY=wavy_test_key WAVY_NODE_PROJECT_ID=project_test tsx --test src/services/wavy-node.test.ts && tsc --noEmit
apps/web test$ pnpm clean:typegen && next typegen && tsc --noEmit
apps/api test: TAP version 13
apps/web test: $ node -e "require('node:fs').rmSync('.next/types', { recursive: true, force: true })"
apps/api test: # Subtest: health reports mock scoring mode when credentials are absent
apps/api test: ok 1 - health reports mock scoring mode when credentials are absent
apps/api test:   ---
apps/api test:   duration_ms: 19.905125
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: openapi document describes the public scoring contract
apps/api test: ok 2 - openapi document describes the public scoring contract
apps/api test:   ---
apps/api test:   duration_ms: 4.094833
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: openapi document honors Railway forwarded origin headers
apps/api test: ok 3 - openapi document honors Railway forwarded origin headers
apps/api test:   ---
apps/api test:   duration_ms: 2.306167
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: score endpoint returns a Bankaool-ready mock Wavy response
apps/api test: ok 4 - score endpoint returns a Bankaool-ready mock Wavy response
apps/api test:   ---
apps/api test:   duration_ms: 2.594583
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: score endpoint rejects unsupported institutions
apps/api test: ok 5 - score endpoint rejects unsupported institutions
apps/api test:   ---
apps/api test:   duration_ms: 2.157792
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: score endpoint rate limits repeated clients
apps/api test: ok 6 - score endpoint rate limits repeated clients
apps/api test:   ---
apps/api test:   duration_ms: 6.864583
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: API config defaults Wavy Node scoring to Avalanche Fuji
apps/api test: ok 7 - API config defaults Wavy Node scoring to Avalanche Fuji
apps/api test:   ---
apps/api test:   duration_ms: 0.331875
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: API config refuses non-Fuji Wavy Node chain IDs
apps/api test: ok 8 - API config refuses non-Fuji Wavy Node chain IDs
apps/api test:   ---
apps/api test:   duration_ms: 0.416834
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: 1..8
apps/api test: # tests 8
apps/api test: # suites 0
apps/api test: # pass 8
apps/api test: # fail 0
apps/api test: # cancelled 0
apps/api test: # skipped 0
apps/api test: # todo 0
apps/api test: # duration_ms 262.491708
apps/api test: TAP version 13
apps/api test: # Subtest: fetchWavySupportedChains requests the Wavy chains endpoint
apps/api test: ok 1 - fetchWavySupportedChains requests the Wavy chains endpoint
apps/api test:   ---
apps/api test:   duration_ms: 8.509958
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: fetchWavyRiskResult registers then scans the wallet
apps/api test: ok 2 - fetchWavyRiskResult registers then scans the wallet
apps/api test:   ---
apps/api test:   duration_ms: 0.69225
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: fetchWavyRiskResult treats duplicate address registration as reusable
apps/api test: ok 3 - fetchWavyRiskResult treats duplicate address registration as reusable
apps/api test:   ---
apps/api test:   duration_ms: 0.934583
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: fetchWavyRiskResult rejects upstream chain mismatches
apps/api test: ok 4 - fetchWavyRiskResult rejects upstream chain mismatches
apps/api test:   ---
apps/api test:   duration_ms: 0.579917
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: fetchWavyRiskResult rejects upstream address mismatches
apps/api test: ok 5 - fetchWavyRiskResult rejects upstream address mismatches
apps/api test:   ---
apps/api test:   duration_ms: 1.088292
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: fetchWavyRiskResult preserves upstream Wavy Node errors
apps/api test: ok 6 - fetchWavyRiskResult preserves upstream Wavy Node errors
apps/api test:   ---
apps/api test:   duration_ms: 0.399542
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: # Subtest: fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
apps/api test: ok 7 - fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
apps/api test:   ---
apps/api test:   duration_ms: 0.160833
apps/api test:   type: 'test'
apps/api test:   ...
apps/api test: 1..7
apps/api test: # tests 7
apps/api test: # suites 0
apps/api test: # pass 7
apps/api test: # fail 0
apps/api test: # cancelled 0
apps/api test: # skipped 0
apps/api test: # todo 0
apps/api test: # duration_ms 150.563959
apps/web test: Generating route types...
apps/web test: ✓ Route types generated successfully
apps/api test: Done
apps/web test: Done
Scope: 4 of 5 workspace projects
packages/contracts build$ hardhat compile
packages/shared build$ tsup src/index.ts --format esm --dts --clean
packages/shared build: CLI Building entry: src/index.ts
packages/shared build: CLI Using tsconfig: tsconfig.json
packages/shared build: CLI tsup v8.5.1
packages/shared build: CLI Target: es2022
packages/shared build: CLI Cleaning output folder
packages/shared build: ESM Build start
packages/contracts build: No contracts to compile
packages/shared build: ESM dist/index.js 4.08 KB
packages/shared build: ESM ⚡️ Build success in 32ms
packages/contracts build: Done
packages/shared build: DTS Build start
packages/shared build: DTS ⚡️ Build success in 310ms
packages/shared build: DTS dist/index.d.ts 3.26 KB
packages/shared build: Done
apps/web build$ pnpm clean:export && next build
apps/api build$ tsup src/server.ts --format esm --clean
apps/api build: CLI Building entry: src/server.ts
apps/api build: CLI Using tsconfig: tsconfig.json
apps/api build: CLI tsup v8.5.1
apps/api build: CLI Target: es2022
apps/api build: CLI Cleaning output folder
apps/api build: ESM Build start
apps/api build: ESM dist/server.js 32.53 KB
apps/api build: ESM ⚡️ Build success in 14ms
apps/api build: Done
apps/web build: $ node -e "require('node:fs').rmSync('out', { recursive: true, force: true })"
apps/web build:    ▲ Next.js 15.5.18
apps/web build:    Creating an optimized production build ...
apps/web build:  ✓ Compiled successfully in 1592ms
apps/web build:    Linting and checking validity of types ...
apps/web build:    Collecting page data ...
apps/web build:    Generating static pages (0/4) ...
apps/web build:    Generating static pages (1/4)
apps/web build:    Generating static pages (2/4)
apps/web build:    Generating static pages (3/4)
apps/web build:  ✓ Generating static pages (4/4)
apps/web build:    Finalizing page optimization ...
apps/web build:    Collecting build traces ...
apps/web build:    Exporting (0/2) ...
apps/web build:  ✓ Exporting (2/2)
apps/web build: Route (app)                                 Size  First Load JS
apps/web build: ┌ ○ /                                    73.2 kB         193 kB
apps/web build: └ ○ /_not-found                            998 B         103 kB
apps/web build: + First Load JS shared by all             102 kB
apps/web build:   ├ chunks/1403cfaa-6db8521358bcd91a.js  54.2 kB
apps/web build:   ├ chunks/159-dbdd15f2e58ea87e.js       45.9 kB
apps/web build:   └ other shared chunks (total)          1.96 kB
apps/web build: ○  (Static)  prerendered as static content
apps/web build: Done
Scope: 4 of 5 workspace projects
packages/contracts typecheck$ tsc --noEmit
packages/shared typecheck$ tsc --noEmit
packages/shared typecheck: Done
packages/contracts typecheck: Done
apps/api typecheck$ tsc --noEmit
apps/web typecheck$ pnpm clean:typegen && next typegen && tsc --noEmit
apps/web typecheck: $ node -e "require('node:fs').rmSync('.next/types', { recursive: true, force: true })"
apps/api typecheck: Done
apps/web typecheck: Generating route types...
apps/web typecheck: ✓ Route types generated successfully
apps/web typecheck: Done

$ tsc --noEmit --skipLibCheck --module NodeNext --moduleResolution NodeNext --target ES2022 --types node scripts/*.ts
$ tsx --test scripts/*.test.ts
$ tsx scripts/verify-railway-archive.ts
````

### Railway archive verifier

- Command: `pnpm --silent verify:railway`
- Exit code: `0`
- Status: `PASS`

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

Done in 936ms using pnpm v11.1.2

$ pnpm --filter @arkscore/api build
CLI Building entry: src/server.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Target: es2022
CLI Cleaning output folder
ESM Build start
ESM dist/server.js 32.53 KB
ESM ⚡️ Build success in 407ms

$ tsup src/server.ts --format esm --clean

$ pnpm --filter @arkscore/api test
TAP version 13
# Subtest: health reports mock scoring mode when credentials are absent
ok 1 - health reports mock scoring mode when credentials are absent
  ---
  duration_ms: 19.481958
  type: 'test'
  ...
# Subtest: openapi document describes the public scoring contract
ok 2 - openapi document describes the public scoring contract
  ---
  duration_ms: 3.913708
  type: 'test'
  ...
# Subtest: openapi document honors Railway forwarded origin headers
ok 3 - openapi document honors Railway forwarded origin headers
  ---
  duration_ms: 2.169708
  type: 'test'
  ...
# Subtest: score endpoint returns a Bankaool-ready mock Wavy response
ok 4 - score endpoint returns a Bankaool-ready mock Wavy response
  ---
  duration_ms: 2.460458
  type: 'test'
  ...
# Subtest: score endpoint rejects unsupported institutions
ok 5 - score endpoint rejects unsupported institutions
  ---
  duration_ms: 2.07775
  type: 'test'
  ...
# Subtest: score endpoint rate limits repeated clients
ok 6 - score endpoint rate limits repeated clients
  ---
  duration_ms: 6.447292
  type: 'test'
  ...
# Subtest: API config defaults Wavy Node scoring to Avalanche Fuji
ok 7 - API config defaults Wavy Node scoring to Avalanche Fuji
  ---
  duration_ms: 0.379458
  type: 'test'
  ...
# Subtest: API config refuses non-Fuji Wavy Node chain IDs
ok 8 - API config refuses non-Fuji Wavy Node chain IDs
  ---
  duration_ms: 0.460208
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
# duration_ms 659.400708
TAP version 13
# Subtest: fetchWavySupportedChains requests the Wavy chains endpoint
ok 1 - fetchWavySupportedChains requests the Wavy chains endpoint
  ---
  duration_ms: 8.186208
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult registers then scans the wallet
ok 2 - fetchWavyRiskResult registers then scans the wallet
  ---
  duration_ms: 0.64625
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult treats duplicate address registration as reusable
ok 3 - fetchWavyRiskResult treats duplicate address registration as reusable
  ---
  duration_ms: 0.980959
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult rejects upstream chain mismatches
ok 4 - fetchWavyRiskResult rejects upstream chain mismatches
  ---
  duration_ms: 0.508459
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult rejects upstream address mismatches
ok 5 - fetchWavyRiskResult rejects upstream address mismatches
  ---
  duration_ms: 0.957584
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult preserves upstream Wavy Node errors
ok 6 - fetchWavyRiskResult preserves upstream Wavy Node errors
  ---
  duration_ms: 0.377292
  type: 'test'
  ...
# Subtest: fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
ok 7 - fetchWavyRiskResult converts Wavy timeouts into a gateway timeout
  ---
  duration_ms: 0.140333
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
# duration_ms 157.507375

$ NODE_ENV=test WAVY_NODE_MOCK_MODE=true ARKSCORE_SCORE_RATE_LIMIT_MAX=4 tsx --test src/app.test.ts src/config/env.test.ts && NODE_ENV=test WAVY_NODE_MOCK_MODE=false WAVY_NODE_API_KEY=wavy_test_key WAVY_NODE_PROJECT_ID=project_test tsx --test src/services/wavy-node.test.ts && tsc --noEmit

## Summary

- Passing: Railway payload install/build/test completed
- Payload: removed
````

### Hosted demo smoke

- Command: `pnpm --silent smoke:web`
- Exit code: `0`
- Status: `PASS`

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
[pass] Bundle contains Mock scores are read-only: Mock scores are read-only
[pass] Bundle contains Live Wavy required: Live Wavy required
[pass] Bundle contains Only live Wavy Node scores can be stored on Fuji: Only live Wavy Node scores can be stored on Fuji
[pass] Bundle contains On-chain readback: On-chain readback
[pass] Bundle contains Evidence match: Evidence match

## Summary

- Passing: 22
- Failing: 0
- Report id: 8c1d84adcf6b
````

### Live deployment verifier

- Command: `pnpm --silent verify:live`
- Exit code: `0`
- Status: `WARN`

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
- Status: `WARN`

````text
# ArkScore Requirements Audit

[pass] Next.js 15 App Router frontend: next 15.5.18, app router entrypoints present
[pass] Tailwind, shadcn-style UI, wagmi, viem: frontend dependencies and local UI primitives are present
[pass] Vercel frontend deployment config: vercel.json builds a clean static export and web public env example is present
[pass] Express score API: Express dependency, score route, health, and OpenAPI route are present
[pass] Railway backend deployment config: railway.toml builds, starts, healthchecks, watches shared config, registers the archive verifier, and retries the live Railway verifier after deploy
[pass] Wavy Node traceability and AI risk score: adapter includes chains/register/scan-risk flow, Fuji-only runtime config, upstream result matching, and 0-100 traceability fields
[pass] Hardhat Solidity score registry: CreditScoreRegistry stores hashed score records with scorer authorization and Solhint linting
[pass] Avalanche Fuji network config: Hardhat uses the official Fuji RPC and chain id 43113
[pass] Privacy-preserving subject hashing: API derives salted subjectHash and contract keys records by bytes32
[pass] Wallet score to on-chain dashboard flow: dashboard fetches scores, computes decisions, blocks mock score writes, writes live Wavy scores, and reads back Fuji evidence
[pass] Arkangeles and Bankaool institutional copy: frontend and decision labels cover IFC equity issuance and Bankaool loans
[pass] Optional eERC20 privacy-token path: planner/probe/dashboard slot ready; demo address not configured
[pass] Hackathon documentation packet: README, deployment, audit, trace, judge demo, submission, evidence, and eERC20 docs exist
[warn] Railway live deployment proof: missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL
[warn] Live Wavy credential proof: missing WAVY_NODE_API_KEY, WAVY_NODE_PROJECT_ID, ARKSCORE_SUBJECT_HASH_SALT
[warn] Fuji registry deployment proof: missing deployed registry address or Fuji deployment artifact
[warn] Authorized scorer proof: missing ARKSCORE_SCORER_ADDRESS or SCORER_ADDRESS
[pass] Latest on-chain score record proof: not configured yet; run pnpm record:fuji after live deployment
[pass] Final live verification and evidence path: strict record verifier, Railway API verifier, generatedAt-bound score hash checks, offline score snapshot freshness proof, retrying Vercel finalizer, readiness, and evidence scripts are registered

## Summary

- Passing: 15
- Warnings: 4
- Failing: 0
- Report id: 15012e472482
````

### Judge demo runbook

- Command: `pnpm --silent judge:demo`
- Exit code: `0`
- Status: `WARN`

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
# The Railway deploy helper verifies the generated API URL when it can extract it.
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
pnpm verify:railway:live
pnpm --filter @arkscore/contracts deploy:fuji
export ARKSCORE_REGISTRY_ADDRESS=0x...
export ARKSCORE_SCORER_ADDRESS=0x...
# If the scorer is not the FUJI_PRIVATE_KEY deployer, set ARKSCORE_SCORER_PRIVATE_KEY.
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm readiness:strict:record
pnpm verify:live:preflight:record
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
- Status: `WARN`

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
