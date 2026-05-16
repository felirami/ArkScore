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

The deploy script writes `packages/contracts/deployments/fuji/CreditScoreRegistry.json`. After deployment, add the registry address to Vercel:

```bash
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=0x...
```

The deploying wallet is the first authorized scorer. Use `setScorer(address,bool)` from the owner wallet if another institutional signer should write records.

`pnpm probe:fuji` checks that `FUJI_PRIVATE_KEY` is present, formatted as a 32-byte hex key, connected to Avalanche Fuji chain id `43113`, and funded with Fuji AVAX before deployment. It prints the deployer address and balance, but never prints the private key.

To authorize the wallet that will click `Store on Fuji` in the dashboard:

```bash
ARKSCORE_SCORER_ADDRESS=0x... pnpm --filter @arkscore/contracts scorer:fuji
```

Set `SCORER_AUTHORIZED=false` to revoke a scorer.

After Railway is deployed with live Wavy credentials, prove the full oracle path from API response to Fuji storage:

```bash
ARKSCORE_API_URL=https://your-railway-api.up.railway.app \
ARKSCORE_REGISTRY_ADDRESS=0x... \
ARKSCORE_TEST_WALLET=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \
ARKSCORE_INSTITUTION=bankaool \
pnpm record:fuji
```

`pnpm record:fuji` uses the configured `FUJI_PRIVATE_KEY` signer, requires that signer to be authorized with `isScorer`, fetches `/api/score/:address`, refuses `source: "mock"` unless `ARKSCORE_ALLOW_MOCK_RECORD=true`, calls `recordScore`, then verifies `hasScore(subjectHash)` and `getScore(subjectHash)` match the live Wavy risk score, composite score, decision, evidence hash, analysis id, and institution.

## Railway API

Use the repository root as the Railway service root so the `@arkscore/shared` workspace package is available during the build. The root `railway.toml` runs the API package through pnpm filters.

```bash
pnpm install
pnpm --filter @arkscore/api build
pnpm --filter @arkscore/api start
```

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
WAVY_NODE_MOCK_MODE=auto
ARKSCORE_SUBJECT_HASH_SALT=replace_with_long_random_subject_hash_salt
RAILWAY_PROJECT_NAME=arkscore-api
RAILWAY_PROJECT_ID=
RAILWAY_SERVICE=arkscore-api
RAILWAY_ENVIRONMENT=production
RAILWAY_WORKSPACE=
RAILWAY_TOKEN=
```

Live scoring follows the Wavy Node quickstart sequence: register the wallet for project monitoring, then run the risk scan.

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

`ARKSCORE_SUBJECT_HASH_SALT` should be a long random backend-only value. ArkScore returns the derived `subjectHash` to the dashboard, and the Fuji registry stores that hash instead of the raw scored wallet address.

For judge demos without credentials, set `WAVY_NODE_MOCK_MODE=true`.

After logging in with `railway login` or `railway login --browserless`, preview the Railway commands:

```bash
pnpm deploy:railway
```

To apply them with live Wavy credentials:

```bash
WAVY_NODE_API_KEY="ApiKey ..." \
WAVY_NODE_PROJECT_ID="..." \
ARKSCORE_SUBJECT_HASH_SALT="$(openssl rand -hex 32)" \
pnpm deploy:railway:apply -- --create-domain
```

Before deploying Railway, you can prove the Wavy credentials locally without printing the API key:

```bash
WAVY_NODE_API_KEY="ApiKey ..." \
WAVY_NODE_PROJECT_ID="..." \
ARKSCORE_SUBJECT_HASH_SALT="$(openssl rand -hex 32)" \
pnpm probe:wavy
```

`probe:wavy` forces `WAVY_NODE_MOCK_MODE=false`, checks Wavy Node `/chains` for the configured `WAVY_NODE_CHAIN_ID`, scores `ARKSCORE_TEST_WALLET` or the default demo wallet, and prints the active supported chain, Wavy analysis id, live risk score, traceability provider, wallet-risk scan type, AI risk scale, address registration mode, composite score, subject hash, and evidence hash.

The helper refuses to apply without Wavy credentials unless `RAILWAY_ALLOW_MOCK=true` is set for a temporary mock deployment. Under the hood, it performs this flow with explicit project, service, and environment targeting so a stale local Railway link cannot silently receive the deploy:

```bash
railway whoami --json
railway init --name arkscore-api --json
railway variable set PORT=4000 --environment production --service arkscore-api --skip-deploys --json
railway variable set ALLOWED_ORIGINS=https://arkscore-seven.vercel.app --environment production --service arkscore-api --skip-deploys --json
railway variable set WAVY_NODE_BASE_URL=https://api.wavynode.com/v1 --environment production --service arkscore-api --skip-deploys --json
railway variable set WAVY_NODE_CHAIN_ID=43113 --environment production --service arkscore-api --skip-deploys --json
railway variable set WAVY_NODE_TIMEOUT_MS=15000 --environment production --service arkscore-api --skip-deploys --json
railway variable set WAVY_NODE_AUTO_REGISTER=true --environment production --service arkscore-api --skip-deploys --json
railway variable set WAVY_NODE_FOREIGN_USER_PREFIX=arkscore-wallet --environment production --service arkscore-api --skip-deploys --json
railway variable set WAVY_NODE_MOCK_MODE=auto --environment production --service arkscore-api --skip-deploys --json
echo "ApiKey ..." | railway variable set WAVY_NODE_API_KEY --environment production --service arkscore-api --stdin --skip-deploys --json
echo "..." | railway variable set WAVY_NODE_PROJECT_ID --environment production --service arkscore-api --stdin --skip-deploys --json
echo "..." | railway variable set ARKSCORE_SUBJECT_HASH_SALT --environment production --service arkscore-api --stdin --skip-deploys --json
railway up --detach --json --environment production --service arkscore-api --message "Deploy ArkScore API"
railway domain --environment production --service arkscore-api --json
```

If the project already exists, set `RAILWAY_PROJECT_ID` so the helper uses `railway link --project <project-id> --environment production --service arkscore-api --json` instead of `railway init`.

## Vercel Frontend

Use either the repository root or `apps/web` as the Vercel project root. Both `vercel.json` files install from the workspace root and build only `@arkscore/web`.

```bash
pnpm install
pnpm --filter @arkscore/web build
```

Vercel variables:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-railway-api.up.railway.app
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=0x...
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
ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live
ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live:apply
```

`finalize:live` reads `ARKSCORE_REGISTRY_ADDRESS`, `CREDIT_SCORE_REGISTRY_ADDRESS`, `REGISTRY_ADDRESS`, or the Fuji deployment artifact, checks Vercel CLI auth for `VERCEL_SCOPE`, links the local checkout to `VERCEL_PROJECT_NAME`, sets public Vercel env values, redeploys the frontend, and runs strict live verification. It also accepts `SCORER_ADDRESS` as a fallback for `ARKSCORE_SCORER_ADDRESS` during strict verification.

The strict verifier fetches the hosted Vercel page plus its Next.js chunks and proves the production bundle contains the configured Railway API URL and Fuji registry address. If either value is missing from the static bundle, redeploy Vercel after setting the public env vars.

## Final Smoke Test

```bash
curl https://your-railway-api.up.railway.app/health
curl https://your-railway-api.up.railway.app/openapi.json
curl "https://your-railway-api.up.railway.app/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool"
pnpm readiness
ARKSCORE_API_URL=https://your-railway-api.up.railway.app \
  ARKSCORE_REGISTRY_ADDRESS=0x... \
  ARKSCORE_SCORER_ADDRESS=0x... \
  pnpm verify:live
ARKSCORE_API_URL=https://your-railway-api.up.railway.app \
  ARKSCORE_REGISTRY_ADDRESS=0x... \
  ARKSCORE_INSTITUTION=bankaool \
  pnpm record:fuji
```

Use `pnpm readiness:strict` when all live credentials and deployed addresses are expected to be configured; it exits non-zero while Railway, Wavy, Fuji, or frontend live-env gates are still missing. The readiness gate accepts `ARKSCORE_API_URL` or `NEXT_PUBLIC_API_BASE_URL` for the Railway API, and the same registry/scorer aliases accepted by `finalize:live`.

Use `pnpm verify:live:strict` for final submission verification. It requires the API score source to be `wavy`, confirms the frontend is reachable and rebuilt with the live public env values, checks the Railway health, live Wavy credential mode, production subject-hash salt, OpenAPI, and score response shape, and verifies that the Fuji registry address has bytecode plus callable `owner()` and `hasScore(bytes32)` functions.
Set `ARKSCORE_SCORER_ADDRESS` or `SCORER_ADDRESS` before the strict run to prove the dashboard signing wallet is authorized to store score records.
