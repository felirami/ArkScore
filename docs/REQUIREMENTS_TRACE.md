# Requirements Trace

Status date: May 16, 2026

| Requirement | Current Evidence | Status |
| --- | --- | --- |
| Next.js 15 App Router frontend | `apps/web/package.json` uses `next@15.5.18`; `apps/web/src/app` contains the app router entry points. | Ready |
| Tailwind, shadcn-style UI, wagmi, viem | `apps/web/package.json`, `apps/web/src/components/ui`, `apps/web/src/config/wagmi.ts`, and `apps/web/src/config/chains.ts`. | Ready |
| Vercel deployment | Production alias `https://arkscore-seven.vercel.app` maps to deployment `dpl_FY1yb92NTbchJWeCE7oomtPBvWzQ`; public `curl -I` returns HTTP 200. | Ready |
| Judge-usable dashboard | Browser smoke test on production confirms `Fetch Wavy score` renders `Mock Wavy trace`, `Wavy risk`, and `Evidence hash` with no console errors. | Ready in hosted demo fallback |
| Railway-ready backend | Root `railway.toml` builds and starts `@arkscore/api`; `.railwayignore` excludes unrelated workspaces while retaining `apps/api` and `packages/shared`; simulated pruned Railway archive installs, builds, and tests successfully. | Ready, not deployed |
| Express score API | `apps/api/src/routes/score.ts` exposes `GET /api/score/:address`; `apps/api/src/app.test.ts` covers health, Bankaool score response, and invalid institution handling. | Ready |
| Wavy Node integration | `apps/api/src/services/wavy-node.ts` calls `/projects/:projectId/addresses/scan-risk` with `x-api-key` and Fuji `chainId=43113`; mock mode is deterministic when credentials are absent. | Live-ready, credentials pending |
| Solidity `CreditScoreRegistry` | `packages/contracts/contracts/CreditScoreRegistry.sol`; Hardhat tests pass for authorized score storage and rejected unauthorized writes. | Ready, not deployed |
| Avalanche Fuji config | `packages/contracts/hardhat.config.ts` uses `https://api.avax-test.network/ext/bc/C/rpc` and chain id `43113`. | Ready |
| On-chain dashboard write | `apps/web/src/components/score-dashboard.tsx` calls `recordScore` through wagmi/viem when `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS` is configured. | Ready, contract address pending |
| Arkangeles and Bankaool copy | Dashboard and docs explicitly use Arkangeles IFC equity issuance and Bankaool credit underwriting language. | Ready |
| Optional eERC20 path | `docs/EERC20_DEMO.md` points to Ava Labs EncryptedERC standalone/converter deployment flow. | Documented, not deployed |

## Remaining Proof Needed

- Railway API URL from a successful `pnpm deploy:railway:apply -- --create-domain` or equivalent `railway up` deployment.
- Live `/health` response from the Railway API.
- Live Wavy Node score response with `source: "wavy"` after `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` are configured.
- Fuji `CreditScoreRegistry` address from `pnpm --filter @arkscore/contracts deploy:fuji`; the deploy script writes `packages/contracts/deployments/fuji/CreditScoreRegistry.json`.
- Vercel environment update for `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS`, followed by a production redeploy through `pnpm finalize:live:apply`.
- Final `pnpm verify:live:strict` run proving the public frontend, Railway API, live Wavy `source: "wavy"` response, and Fuji registry contract are all reachable.
