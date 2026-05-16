# ArkScore

ArkScore is a privacy-preserving on-chain credit and investor risk scoring oracle for the LatAm Institucional Hackathon with Avalanche, Arkangeles IFC, and Bankaool.

## Pitch

ArkScore evaluates an EVM wallet with Wavy Node traceability and AI risk scoring, computes an explainable 0-100 institutional credit score, and stores the result on Avalanche Fuji through `CreditScoreRegistry`. Arkangeles can screen investors and borrowers for IFC equity issuance workflows, while Bankaool can use the same traceable risk record for credit underwriting.

## What Is Built

- Next.js 15 App Router dashboard with Tailwind CSS, shadcn-style UI primitives, wagmi, viem, and Avalanche Fuji wallet support.
- Railway-ready Express API with `GET /api/score/:address` and `GET /openapi.json`.
- Wavy Node live integration using `GET /v1/projects/:projectId/addresses/scan-risk`.
- Deterministic mock mode for judging before real Wavy credentials are added.
- Hardhat 3 Solidity `^0.8.24` contract and tests for storing Wavy-backed score records on Fuji.
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
6. Show a decision such as `Approve IFC equity issuance` or `Approve Bankaool loan`.

## Environment

Copy `.env.example` into the relevant app or deployment provider and replace the placeholders:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false

WAVY_NODE_API_KEY=ApiKey wavy_replace_with_wavy_node_api_key
WAVY_NODE_PROJECT_ID=replace_with_wavy_node_project_id
WAVY_NODE_BASE_URL=https://api.wavynode.com/v1
WAVY_NODE_CHAIN_ID=43113
WAVY_NODE_AUTO_REGISTER=true
WAVY_NODE_FOREIGN_USER_PREFIX=arkscore-wallet
WAVY_NODE_MOCK_MODE=auto
ARKSCORE_SUBJECT_HASH_SALT=replace_with_long_random_subject_hash_salt

FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
FUJI_PRIVATE_KEY=
```

`WAVY_NODE_MOCK_MODE=auto` uses live Wavy Node only when both the API key and project id are configured. `ARKSCORE_SUBJECT_HASH_SALT` is used by the backend to derive the privacy-preserving `subjectHash` stored on Fuji instead of the raw wallet address.

## Local Setup

```bash
corepack enable
nvm use
pnpm install
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
pnpm readiness
pnpm smoke:web
pnpm verify:live
pnpm deploy:railway
pnpm --filter @arkscore/contracts scorer:fuji
pnpm finalize:live
```

Use Node.js 22.19.0. The repository pins Node 22 because the verified Next.js 15 production server path uses that runtime.

See `docs/READINESS_AUDIT.md` and `docs/REQUIREMENTS_TRACE.md` for the current judge-readiness checklist and remaining credential-dependent deployment items.

`pnpm readiness` checks local configuration gates without printing secrets. GitHub Actions runs `pnpm verify` and `pnpm readiness` on pushes and pull requests. `pnpm smoke:web` confirms the hosted Vercel demo is public and includes the judge-facing score flow, subject hash, and Store on Fuji path. `pnpm deploy:railway` prints the Railway project/env/deploy commands, and `pnpm deploy:railway:apply` runs them once Railway auth and Wavy credentials are available. `pnpm verify:live` checks reachable deployments; use `pnpm verify:live:strict` after Railway, Wavy Node, subject-hash salt, Fuji, and Vercel environment variables are all configured. The Railway API publishes its integration contract at `/openapi.json`. `pnpm finalize:live` prints the final Vercel env/deploy commands, and `pnpm finalize:live:apply` applies them.

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
