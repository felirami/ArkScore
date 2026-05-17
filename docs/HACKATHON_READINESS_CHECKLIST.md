# ArkScore Hackathon Readiness Checklist

Generated: 2026-05-17T11:20:57Z

## Submission links

- GitHub repository: https://github.com/felirami/ArkScore
- Vercel frontend: https://arkscore-seven.vercel.app
- Railway backend: https://arkscore-api-production.up.railway.app
- Avalanche Fuji CreditScoreRegistry: `0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`
- Fuji explorer: https://testnet.snowtrace.io/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46
- Optional eERC20 demo: not configured for the current submission

## Quality gates completed locally

- [x] Node and pnpm versions checked: Node `v22.21.0`, pnpm `11.1.2`
- [x] Full monorepo verification passed with `pnpm verify`
- [x] Script typecheck passed
- [x] Script test suite passed: 86/86 tests
- [x] Railway archive verification passed
- [x] Workspace lint passed for contracts, shared package, API, and web app
- [x] Workspace tests passed for contracts, shared package, API, and web app
- [x] Workspace builds passed for contracts, shared package, API, and web app
- [x] Workspace typecheck passed for contracts, shared package, API, and web app

## Local runtime checks completed

- [x] API dev server started in mock mode on `http://127.0.0.1:4100`
- [x] `GET /health` returned HTTP 200 and `ok: true`
- [x] `GET /` returned service metadata and documented `/openapi.json`, `/health`, and `/api/score/{address}`
- [x] `GET /openapi.json` returned OpenAPI `3.1.0` with `/api/score/{address}`, `/health`, `/users/{foreignUserId}`, and `/webhook`
- [x] `GET /api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool` returned a valid score response with subject hash, Wavy traceability, composite score, and institutional decision
- [x] Web dev server started on `http://127.0.0.1:3100` against the local API
- [x] Browser smoke verified the homepage renders ArkScore, Avalanche Fuji, Bankaool, Wavy Node, eERC20, wallet intake, and decision panels
- [x] Browser click on `Fetch Wavy score` rendered a decision card with Wavy risk, credit score, subject hash, analysis id, evidence hash, and read-only mock-score warning
- [x] Browser console had no JavaScript errors

## Deployment checks completed

- [x] GitHub repo is public: https://github.com/felirami/ArkScore
- [x] GitHub default branch is `main`
- [x] Vercel CLI authenticated as `felirami`
- [x] Vercel project `feliramis-projects/arkscore` exists
- [x] Vercel project settings match repo config: root `.`, Node 22.x, build `pnpm --filter @arkscore/web build`, output `apps/web/out`, install `pnpm install --frozen-lockfile`
- [x] Latest Vercel production deployment listed as Ready
- [x] Hosted demo smoke passed for `https://arkscore-seven.vercel.app`
- [x] Railway CLI authenticated
- [x] Railway project `arkscore-api`, environment `production`, service `arkscore-api` is Online
- [x] Railway public backend URL is `https://arkscore-api-production.up.railway.app`
- [x] Railway live verifier reached backend health, OpenAPI, score route, Wavy chain config, registry chain config, and subject-hash-salt config
- [x] Fuji registry bytecode and read ABI checks passed for `0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`

## Must-fix before final hackathon submit

- [ ] Vercel production bundle is currently missing the Railway API URL `arkscore-api-production.up.railway.app`; set `NEXT_PUBLIC_API_BASE_URL` in Vercel production and redeploy.
- [ ] Vercel production bundle is currently missing the Fuji registry address `0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`; set `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS` in Vercel production and redeploy.
- [ ] Railway backend is still serving mock-mode score responses; configure working Wavy Node credentials in Railway if a live Wavy proof is required for judging.
- [ ] Set/prove `ARKSCORE_SCORER_ADDRESS` for final live verification so the dashboard signer can be shown as authorized on Fuji.
- [ ] Replace the current default `LatestScoreRecord.json` mock artifact by running a fresh live `pnpm record:fuji` after Railway is serving live Wavy responses.

## Recommended finalization sequence

```bash
export ARKSCORE_WEB_URL=https://arkscore-seven.vercel.app
export ARKSCORE_API_URL=https://arkscore-api-production.up.railway.app
export ARKSCORE_REGISTRY_ADDRESS=0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46

pnpm verify
pnpm smoke:web
pnpm verify:railway:live

# After Railway Wavy credentials and scorer are ready:
pnpm probe:wavy
pnpm probe:fuji
pnpm record:fuji
pnpm readiness:strict:record
pnpm verify:live:preflight:record
pnpm finalize:live:apply
pnpm verify:live:strict:record
pnpm submission:evidence:write:full
```

## Judge-facing positioning

- Lead with: ArkScore converts Wavy Node traceability and AI risk scoring into a privacy-preserving Avalanche Fuji credit oracle for Arkangeles and Bankaool.
- Show that raw wallets are not stored on-chain; the registry keys records by backend-derived `subjectHash` and stores evidence hashes plus Wavy analysis ids.
- Emphasize institutional workflows: Arkangeles IFC equity issuance decisions and Bankaool credit underwriting decisions share one scoring engine with different thresholds.
- Be transparent if the final demo is still in fallback mode: mock scores are intentionally read-only, and Fuji writes are gated until live Wavy-backed scores are present.
