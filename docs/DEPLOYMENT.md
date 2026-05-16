# Deployment Guide

## Avalanche Fuji

- RPC: `https://api.avax-test.network/ext/bc/C/rpc`
- Chain ID: `43113`
- Native token: AVAX
- Explorer: `https://testnet.snowtrace.io`

```bash
cp packages/contracts/.env.example packages/contracts/.env
pnpm --filter @arkscore/contracts compile
pnpm --filter @arkscore/contracts test
pnpm probe:fuji
pnpm --filter @arkscore/contracts deploy:fuji
```

The deploy script refuses to run without a 32-byte `FUJI_PRIVATE_KEY`, checks the live chain id is Avalanche Fuji `43113`, deploys `CreditScoreRegistry`, verifies the deployer is both `owner()` and an authorized initial scorer, then writes `packages/contracts/deployments/fuji/CreditScoreRegistry.json`. After deployment, add the registry address to Vercel:

```bash
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=0x...
```

If the optional Ava Labs EncryptedERC demo is deployed, expose it to the dashboard with:

```bash
NEXT_PUBLIC_EERC20_DEMO_ADDRESS=0x...
```

Before including that address in the pitch, prove it has deployed Fuji bytecode:

```bash
ARKSCORE_EERC20_DEMO_ADDRESS=0x... pnpm probe:eerc20
```

Use `pnpm probe:eerc20:strict` or `ARKSCORE_REQUIRE_EERC20=true` when the optional privacy-token demo is required for a final evidence packet.

The deploying wallet is the first authorized scorer. Use `setScorer(address,bool)` from the owner wallet if another institutional signer should write records. If that scorer is different from the deployer, keep `FUJI_PRIVATE_KEY` set to the owner key while authorizing it, then set `ARKSCORE_SCORER_PRIVATE_KEY` or `FUJI_SCORER_PRIVATE_KEY` to the scorer key before running `pnpm record:fuji`.

`pnpm probe:fuji` checks that `FUJI_PRIVATE_KEY` is present, formatted as a 32-byte hex key, connected to Avalanche Fuji chain id `43113`, and funded with Fuji AVAX before deployment. It prints the deployer address and balance, but never prints the private key.

To authorize the wallet that will click `Store on Fuji` in the dashboard:

```bash
ARKSCORE_SCORER_ADDRESS=0x... pnpm --filter @arkscore/contracts scorer:fuji
```

`scorer:fuji` requires a valid `FUJI_PRIVATE_KEY` owner key, checks that the connected network is Fuji `43113`, sends `setScorer(address,bool)`, then reads `isScorer(address)` back and fails if the post-transaction state does not match the requested authorization. Set `SCORER_AUTHORIZED=false` to revoke a scorer; any other non-empty value must be `true` or `false`.

After Railway is deployed with live Wavy credentials, prove the full oracle path from API response to Fuji storage:

```bash
ARKSCORE_API_URL=https://your-railway-api.up.railway.app \
ARKSCORE_REGISTRY_ADDRESS=0x... \
ARKSCORE_SCORER_ADDRESS=0x... \
ARKSCORE_TEST_WALLET=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \
ARKSCORE_INSTITUTION=bankaool \
pnpm record:fuji
```

`pnpm record:fuji` signs with `ARKSCORE_SCORER_PRIVATE_KEY`, `FUJI_SCORER_PRIVATE_KEY`, or `FUJI_PRIVATE_KEY` in that order, requires that signer to be authorized with `isScorer`, and refuses to continue if `ARKSCORE_SCORER_ADDRESS` or `SCORER_ADDRESS` is configured but does not match the private key that will submit the transaction. It requires `ARKSCORE_API_URL` or `NEXT_PUBLIC_API_BASE_URL` to be a public HTTPS Railway API URL, fetches `/api/score/:address`, refuses `source: "mock"` unless `ARKSCORE_ALLOW_MOCK_RECORD=true`, calls `recordScore`, verifies `hasScore(subjectHash)` and `getScore(subjectHash)` match the live Wavy risk score, composite score, decision, evidence hash, analysis id, and institution, then writes `packages/contracts/deployments/fuji/LatestScoreRecord.json` as non-secret submission evidence. Set `ARKSCORE_SCORE_RECORD_ARTIFACT` only when you want that proof written to a custom path.

## Railway API

Use the repository root as the Railway service root so the `@arkscore/shared` workspace package is available during the build. The root `railway.toml` runs the API package through pnpm filters.

```bash
pnpm install
pnpm verify:railway
pnpm --filter @arkscore/api build
pnpm --filter @arkscore/api start
```

`pnpm verify:railway` creates a temporary Railway-like payload with `.railwayignore` applied, confirms `apps/api`, `packages/shared`, and shared `config/tsconfig` files are present, confirms frontend/contracts/docs/env files are excluded, then runs a frozen pnpm install, API build, and API tests from that pruned workspace.

Railway variables:

```bash
PORT=4000
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
WAVY_NODE_API_KEY=ApiKey wavy_replace_with_wavy_node_api_key
WAVY_NODE_PROJECT_ID=replace_with_wavy_node_project_id
WAVY_NODE_BASE_URL=https://api.wavynode.com/v1
WAVY_NODE_CHAIN_ID=43113
WAVY_NODE_TIMEOUT_MS=15000
WAVY_NODE_AUTO_REGISTER=true
WAVY_NODE_FOREIGN_USER_PREFIX=arkscore-wallet
WAVY_NODE_MOCK_MODE=false
ARKSCORE_SCORE_RATE_LIMIT_MAX=120
ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS=60000
ARKSCORE_SUBJECT_HASH_SALT=replace_with_long_random_subject_hash_salt
RAILWAY_PROJECT_NAME=arkscore-api
RAILWAY_PROJECT_ID=
RAILWAY_SERVICE=arkscore-api
RAILWAY_ENVIRONMENT=production
RAILWAY_WORKSPACE=
RAILWAY_TOKEN=
```

Live scoring follows the Wavy Node quickstart sequence: register the wallet for project monitoring, then run the risk scan.

`WAVY_NODE_CHAIN_ID` must stay `43113` for Avalanche Fuji so the Wavy score, Railway API response, and Fuji registry proof all describe the same network.

Registration uses a deterministic non-PII `foreign_user_id` based on the wallet address:

```text
POST /v1/projects/:projectId/addresses
x-api-key: ApiKey ...

{
  "address": "0x...",
  "description": "ArkScore on-demand wallet risk score",
  "foreign_user_id": "arkscore-wallet-0x..."
}
```

The risk scan then calls:

```text
GET /v1/projects/:projectId/addresses/scan-risk?addresses=:address&chainId=43113
x-api-key: ApiKey ...
```

`ARKSCORE_SUBJECT_HASH_SALT` should be a long random backend-only value. ArkScore returns the derived `subjectHash` to the dashboard, and the Fuji registry stores that hash instead of the raw scored wallet address. `ARKSCORE_SCORE_RATE_LIMIT_MAX` and `ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS` protect live Wavy scoring calls per client; set `ARKSCORE_SCORE_RATE_LIMIT_MAX=0` only for a controlled local demo where rate limiting should be disabled.

For judge demos without credentials, set `WAVY_NODE_MOCK_MODE=true`.

After logging in with `pnpm railway:login` or `pnpm railway:login:browserless`, preview the Railway commands:

```bash
pnpm deploy:railway
```

Use `pnpm railway:whoami` to confirm the active Railway account. These package scripts wrap `pnpm dlx @railway/cli`, so the deploy flow does not require a globally installed `railway` binary.

To apply them with live Wavy credentials:

```bash
WAVY_NODE_API_KEY="ApiKey ..." \
WAVY_NODE_PROJECT_ID="..." \
ARKSCORE_SUBJECT_HASH_SALT="$(openssl rand -hex 32)" \
pnpm deploy:railway:apply -- --create-domain
```

In live mode, `deploy:railway:apply` runs `pnpm verify:railway` and `pnpm probe:wavy` before it touches Railway variables or uploads the service, so a broken deploy archive, invalid Wavy credentials, non-Fuji `WAVY_NODE_CHAIN_ID`, inactive Fuji support, or a weak subject-hash salt fail locally first. It also forces the deployed Railway variable `WAVY_NODE_MOCK_MODE=false` unless `RAILWAY_ALLOW_MOCK=true` is explicitly set for a temporary mock deployment.

Before deploying Railway, you can prove the Wavy credentials locally without printing the API key:

```bash
WAVY_NODE_API_KEY="ApiKey ..." \
WAVY_NODE_PROJECT_ID="..." \
ARKSCORE_SUBJECT_HASH_SALT="$(openssl rand -hex 32)" \
pnpm probe:wavy
```

`probe:wavy` forces `WAVY_NODE_MOCK_MODE=false`, requires `WAVY_NODE_CHAIN_ID=43113`, checks Wavy Node `/chains` for Avalanche Fuji, scores `ARKSCORE_TEST_WALLET` or the default demo wallet, and prints the active supported chain, Wavy analysis id, live risk score, traceability provider, wallet-risk scan type, AI risk scale, address registration mode, composite score, subject hash, and evidence hash.

The helper refuses non-Fuji `WAVY_NODE_CHAIN_ID` values before Railway mutation, and refuses to apply without Wavy credentials unless `RAILWAY_ALLOW_MOCK=true` is set for a temporary mock deployment. Under the hood, it performs this flow with explicit project, service, and environment targeting so a stale local Railway link cannot silently receive the deploy:

```bash
pnpm verify:railway
pnpm probe:wavy
pnpm dlx @railway/cli whoami --json
pnpm dlx @railway/cli init --name arkscore-api --json
pnpm dlx @railway/cli add --service arkscore-api --json
pnpm dlx @railway/cli variable set PORT=4000 --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set ALLOWED_ORIGINS=https://arkscore-seven.vercel.app --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set WAVY_NODE_BASE_URL=https://api.wavynode.com/v1 --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set WAVY_NODE_CHAIN_ID=43113 --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set WAVY_NODE_TIMEOUT_MS=15000 --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set WAVY_NODE_AUTO_REGISTER=true --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set WAVY_NODE_FOREIGN_USER_PREFIX=arkscore-wallet --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set WAVY_NODE_MOCK_MODE=false --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set ARKSCORE_SCORE_RATE_LIMIT_MAX=120 --environment production --service arkscore-api --skip-deploys --json
pnpm dlx @railway/cli variable set ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS=60000 --environment production --service arkscore-api --skip-deploys --json
echo "ApiKey ..." | pnpm dlx @railway/cli variable set WAVY_NODE_API_KEY --environment production --service arkscore-api --stdin --skip-deploys --json
echo "..." | pnpm dlx @railway/cli variable set WAVY_NODE_PROJECT_ID --environment production --service arkscore-api --stdin --skip-deploys --json
echo "..." | pnpm dlx @railway/cli variable set ARKSCORE_SUBJECT_HASH_SALT --environment production --service arkscore-api --stdin --skip-deploys --json
pnpm dlx @railway/cli up --detach --json --environment production --service arkscore-api --message "Deploy ArkScore API"
pnpm dlx @railway/cli domain --environment production --service arkscore-api --json
```

If the project already exists, set `RAILWAY_PROJECT_ID` so the helper uses `pnpm dlx @railway/cli link --project <project-id> --environment production --service arkscore-api --json` instead of `init` plus `add`.

After Railway prints the service URL or generated domain, prove the deployed API before continuing to Fuji/Vercel finalization:

```bash
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
pnpm verify:railway:live
```

`verify:railway:live` is the API-only strict live gate. It skips the Vercel bundle and Fuji contract checks, then verifies Railway `/health`, production subject-hash salt mode, live Wavy mode, `/openapi.json` with the served API origin in `servers`, score response shape, no-store score cache headers, and score rate-limit headers.

## Vercel Frontend

Use either the repository root or `apps/web` as the Vercel project root. Both `vercel.json` files install from the workspace root and build only `@arkscore/web`.

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter @arkscore/web build
```

For production, set the same public values in Vercel. `NEXT_PUBLIC_API_BASE_URL` must point to the public HTTPS Railway API URL, `NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL` must point to a public HTTPS Fuji RPC, `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS` must point to the deployed Fuji registry, and `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false` keeps the final dashboard in live Wavy mode. Local development URLs such as `http://localhost:4000` are intentionally rejected by the finalizer and readiness gate for production handoff.

Vercel variables:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-railway-api.up.railway.app
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_EERC20_DEMO_ADDRESS=0x...
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false
```

Local finalizer variables:

```bash
VERCEL_SCOPE=feliramis-projects
VERCEL_PROJECT_NAME=arkscore
```

The dashboard uses injected wallet providers through wagmi and viem. Core Wallet, MetaMask, Rabby, and other injected EVM wallets can connect to Avalanche Fuji.

Set the Node.js version to `22.x` in Vercel and Railway. The repo includes `.nvmrc`, `.node-version`, and `engines.node` for that runtime.

The web app uses `output: "export"` so Vercel serves it as a static Next.js build. Runtime scoring and chain writes happen client-side against the Railway API and Avalanche Fuji.

If `NEXT_PUBLIC_API_BASE_URL` is not configured on a hosted Vercel deployment, ArkScore falls back to a clearly labeled mock Wavy trace so judges can exercise the dashboard before Railway credentials are available. Set `NEXT_PUBLIC_API_BASE_URL` to the Railway URL and keep `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false` for the live Wavy-backed flow.

Once Railway and Fuji are live, set the Vercel variables and redeploy:

```bash
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
pnpm finalize:live
pnpm finalize:live:apply
```

`finalize:live` reads `ARKSCORE_REGISTRY_ADDRESS`, `CREDIT_SCORE_REGISTRY_ADDRESS`, `REGISTRY_ADDRESS`, or the Fuji deployment artifact, checks that `NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL` is public HTTPS when configured, checks Vercel CLI auth for `VERCEL_SCOPE`, links the local checkout to `VERCEL_PROJECT_NAME`, runs `pnpm verify:live:preflight` against Railway and Fuji before Vercel env/deploy mutation, sets public Vercel env values including the Fuji RPC URL, redeploys the frontend, and runs strict live verification. If `LatestScoreRecord.json`, a custom `ARKSCORE_SCORE_RECORD_ARTIFACT`, or `ARKSCORE_REQUIRE_SCORE_RECORD=true` is present, it upgrades the preflight to `pnpm verify:live:preflight:record` and the final verifier to `pnpm verify:live:strict:record` or `pnpm verify:live:strict:eerc20:record`. The default artifact path in copied env files stays optional until `pnpm record:fuji` creates it or `ARKSCORE_REQUIRE_SCORE_RECORD=true` is set. If `ARKSCORE_EERC20_DEMO_ADDRESS`, `EERC20_DEMO_ADDRESS`, or `NEXT_PUBLIC_EERC20_DEMO_ADDRESS` is present, it also publishes `NEXT_PUBLIC_EERC20_DEMO_ADDRESS`. It accepts `SCORER_ADDRESS` as a fallback for `ARKSCORE_SCORER_ADDRESS` during preflight and strict verification.

`pnpm verify:live:preflight` uses the same strict live gates as final verification but skips the static Vercel bundle check, so it can prove Railway health, live Wavy source, production subject-hash salt, OpenAPI, score shape, Fuji bytecode, registry ABI, authorized scorer, and optional eERC20 bytecode before Vercel env values are changed. The strict verifier fetches the hosted Vercel page plus its Next.js chunks and proves the production bundle contains the configured Railway API URL, Fuji registry address, public Fuji RPC URL when configured, and optional eERC20 demo address when provided. If a required public value is missing from the static bundle, redeploy Vercel after setting the public env vars.

## Final Smoke Test

```bash
curl https://your-railway-api.up.railway.app/health
curl https://your-railway-api.up.railway.app/openapi.json
curl "https://your-railway-api.up.railway.app/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool"
pnpm audit:requirements
pnpm judge:demo
pnpm readiness
pnpm plan:eerc20
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
export ARKSCORE_REGISTRY_ADDRESS=0x...
export ARKSCORE_SCORER_ADDRESS=0x...
export ARKSCORE_EERC20_DEMO_ADDRESS=0x...
pnpm verify:live
ARKSCORE_INSTITUTION=bankaool pnpm record:fuji
pnpm readiness:strict:record
```

Use `pnpm audit:requirements` for a requirement-by-requirement handoff report. It exits zero while only live proofs are missing, and `pnpm audit:requirements:strict` exits non-zero until Railway, Wavy, Fuji, scorer, and score-record evidence are configured.

Use `pnpm verify:railway` before `pnpm deploy:railway:apply` when you want a standalone proof that the repository-root Railway payload can install, build, and test the API with only the files Railway should receive. Export `ARKSCORE_API_URL=https://your-railway-api.up.railway.app`, then use `pnpm verify:railway:live` immediately after Railway deployment to prove the uploaded API is serving live Wavy responses before contract deployment and frontend finalization.

Use `pnpm judge:demo` for a concise, environment-aware walkthrough before presenting to judges. It prints fallback/live mode, the click path, proof commands, and current blockers without exposing secrets.

Use `pnpm readiness:strict` when all live credentials and deployed addresses are expected to be configured; it exits non-zero while Railway, Wavy, Fuji, or frontend live-env gates are still missing. Use `pnpm readiness:strict:record` after `pnpm record:fuji` to additionally require the non-secret `LatestScoreRecord.json` proof, and to require that proof to be Wavy-backed even if a temporary mock record was allowed earlier. The readiness gate accepts `ARKSCORE_WEB_URL` for the submitted frontend URL, `ARKSCORE_API_URL` or `NEXT_PUBLIC_API_BASE_URL` for the public HTTPS Railway API, `NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL` for the browser Fuji RPC, the Wavy Node Fuji chain id `43113`, and the same registry/scorer aliases accepted by `finalize:live`. Use `--skip-cli-auth` only for deterministic local tests where Vercel/Railway CLI auth should be skipped while the configured web URL is still probed.

Use `pnpm plan:eerc20` before the optional EncryptedERC handoff. It checks the local `../EncryptedERC` checkout, official standalone/converter deploy scripts, Circom availability, Fuji deployer key shape, and configured ArkScore eERC20 address, then prints the Fuji deploy/probe/final-verifier commands with secrets redacted.

Use `pnpm verify:live:preflight` immediately before `pnpm finalize:live:apply` if you want a standalone proof that the live API and Fuji registry are ready before the frontend is republished.

Use `pnpm verify:live:strict:record` for final submission verification after `pnpm record:fuji`. It requires the API score source to be `wavy`, confirms the frontend is reachable and rebuilt with the live public env values, checks the Railway health, live Wavy credential mode, production subject-hash salt, OpenAPI, score response shape, and no-store score cache headers, verifies that the Fuji registry address has bytecode plus callable `owner()`, `hasScore(bytes32)`, and `getScore(bytes32)` functions, and proves `LatestScoreRecord.json` still matches the on-chain record. Use `pnpm verify:live:strict:eerc20:record` or `ARKSCORE_REQUIRE_EERC20=true` when the optional EncryptedERC demo is part of the judged flow.
Set `ARKSCORE_SCORER_ADDRESS` or `SCORER_ADDRESS` before the strict run to prove the dashboard signing wallet is authorized to store score records.
