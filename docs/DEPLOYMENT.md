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
pnpm --filter @arkscore/contracts deploy:fuji
```

The deploy script writes `packages/contracts/deployments/fuji/CreditScoreRegistry.json`. After deployment, add the registry address to Vercel:

```bash
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=0x...
```

The deploying wallet is the first authorized scorer. Use `setScorer(address,bool)` from the owner wallet if another institutional signer should write records.

To authorize the wallet that will click `Store on Fuji` in the dashboard:

```bash
ARKSCORE_SCORER_ADDRESS=0x... pnpm --filter @arkscore/contracts scorer:fuji
```

Set `SCORER_AUTHORIZED=false` to revoke a scorer.

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
WAVY_NODE_MOCK_MODE=auto
```

Live scoring calls Wavy Node with:

```text
GET /v1/projects/:projectId/addresses/scan-risk?addresses=:address&chainId=43113
x-api-key: ApiKey ...
```

For judge demos without credentials, set `WAVY_NODE_MOCK_MODE=true`.

After logging in with `railway login` or `railway login --browserless`, preview the Railway commands:

```bash
pnpm deploy:railway
```

To apply them with live Wavy credentials:

```bash
WAVY_NODE_API_KEY="ApiKey ..." \
WAVY_NODE_PROJECT_ID="..." \
pnpm deploy:railway:apply -- --create-domain
```

The helper refuses to apply without Wavy credentials unless `RAILWAY_ALLOW_MOCK=true` is set for a temporary mock deployment. Under the hood, it performs this flow:

```bash
railway init --name arkscore-api --json
railway variable set PORT=4000 --skip-deploys --json
railway variable set ALLOWED_ORIGINS=https://arkscore-seven.vercel.app --skip-deploys --json
railway variable set WAVY_NODE_BASE_URL=https://api.wavynode.com/v1 --skip-deploys --json
railway variable set WAVY_NODE_CHAIN_ID=43113 --skip-deploys --json
railway variable set WAVY_NODE_MOCK_MODE=auto --skip-deploys --json
echo "ApiKey ..." | railway variable set WAVY_NODE_API_KEY --stdin --skip-deploys --json
echo "..." | railway variable set WAVY_NODE_PROJECT_ID --stdin --skip-deploys --json
railway up --detach --json --message "Deploy ArkScore API"
railway domain --service arkscore-api --json
```

If the project already exists, use `railway link <project-id>` instead of `railway init`.

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

The dashboard uses injected wallet providers through wagmi and viem. Core Wallet, MetaMask, Rabby, and other injected EVM wallets can connect to Avalanche Fuji.

Set the Node.js version to `22.x` in Vercel and Railway. The repo includes `.nvmrc`, `.node-version`, and `engines.node` for that runtime.

The web app uses `output: "export"` so Vercel serves it as a static Next.js build. Runtime scoring and chain writes happen client-side against the Railway API and Avalanche Fuji.

If `NEXT_PUBLIC_API_BASE_URL` is not configured on a hosted Vercel deployment, ArkScore falls back to a clearly labeled mock Wavy trace so judges can exercise the dashboard before Railway credentials are available. Set `NEXT_PUBLIC_API_BASE_URL` to the Railway URL and keep `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false` for the live Wavy-backed flow.

Once Railway and Fuji are live, set the Vercel variables and redeploy:

```bash
ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live
ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live:apply
```

`finalize:live` reads `ARKSCORE_REGISTRY_ADDRESS` or the Fuji deployment artifact, sets public Vercel env values, redeploys the frontend, and runs strict live verification.

## Final Smoke Test

```bash
curl https://your-railway-api.up.railway.app/health
curl "https://your-railway-api.up.railway.app/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool"
pnpm readiness
ARKSCORE_API_URL=https://your-railway-api.up.railway.app \
  ARKSCORE_REGISTRY_ADDRESS=0x... \
  pnpm verify:live
```

Use `pnpm readiness:strict` when all live credentials and deployed addresses are expected to be configured; it exits non-zero while Railway, Wavy, Fuji, or frontend live-env gates are still missing.

Use `pnpm verify:live:strict` for final submission verification. It requires the API score source to be `wavy`, confirms the frontend is reachable, checks the Railway score response shape, and verifies that the Fuji registry address has bytecode plus a callable `owner()`.
Set `ARKSCORE_SCORER_ADDRESS` before the strict run to prove the dashboard signing wallet is authorized to store score records.
