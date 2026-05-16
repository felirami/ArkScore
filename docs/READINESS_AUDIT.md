# ArkScore Readiness Audit

Status date: May 16, 2026

## Ready

- Monorepo scaffolded with pnpm workspaces, Node.js 22.19.0 pinning, shared TypeScript configs, and environment examples.
- Next.js 15 App Router dashboard builds as a static Vercel export and includes Avalanche Fuji wallet connection, Wavy score intake, composite scoring, institutional decisioning, and on-chain write flow.
- The web test/typecheck scripts clean stale generated `.next/types` before running `next typegen`, keeping repeated local and CI verification runs deterministic.
- The dashboard includes an optional eERC20 privacy-layer card that links to an Ava Labs EncryptedERC demo address when configured.
- Dashboard reads `isScorer(connectedWallet)`, `hasScore(subjectHash)`, and `getScore(subjectHash)` from the Fuji registry, disables score storage until the connected wallet is authorized, labels the on-chain action as store or update based on subject status, and shows whether the stored evidence matches the current Wavy response.
- The Fuji registry stores score records by backend-derived `subjectHash`, so the raw scored wallet address is not included in contract calldata or `ScoreRecorded` events.
- Express API builds for Railway and exposes `GET /`, `GET /openapi.json`, `GET /health`, and `GET /api/score/:address`.
- API tests cover `/health`, subject-hash salt health reporting, `/openapi.json` privacy fields plus Wavy no-result, timeout, and rate-limit responses, no-store score cache headers, a Bankaool score response, invalid institution rejection in mock mode, repeated-client score rate limiting, the live Wavy Node adapter request shape, and gateway-timeout handling for stalled Wavy requests.
- Simulated Railway archive install/build/test passes with `.railwayignore` applied, confirming the pruned backend workspace can deploy from the repository root.
- Wavy Node adapter is live-ready for the official register-then-scan flow: `POST /v1/projects/:projectId/addresses`, then `GET /v1/projects/:projectId/addresses/scan-risk?addresses=:address&chainId=43113`, with an explicit traceability object, backend-derived subject hashing, and deterministic mock mode for judge demos before credentials are added.
- Solidity `CreditScoreRegistry` compiles and passes tests for authorized Wavy-backed score storage, score readback, event emission, same-subject updates, scorer authorization and revocation, ownership transfer, rejected unauthorized writes, invalid addresses, missing records, empty subject hashes, and scores outside the 0-100 scale.
- The Fuji deploy script refuses missing or malformed `FUJI_PRIVATE_KEY`, checks chain id `43113`, verifies the deployed registry owner, and confirms the deployer is authorized as the initial scorer before writing the deployment artifact.
- Deployment docs cover Vercel, Railway, Avalanche Fuji, and optional Ava Labs EncryptedERC demo follow-up.
- GitHub Actions CI installs Node 22/pnpm 11, runs `pnpm verify`, and emits the non-secret `pnpm readiness` report.
- Vercel production is deployed and publicly reachable at `https://arkscore-seven.vercel.app` via deployment `dpl_6hfCRvJu4MEeDvqxfqcyEm3jCotg`.
- Production dashboard smoke test passes in hosted demo fallback mode: `Fetch Wavy score` renders a mock Wavy trace, risk score, composite score, traceability, AI risk scale, subject hash, subject status, evidence hash, and eERC20 privacy slot while Railway credentials are pending.

## Verified Locally

```bash
pnpm verify
```

The API endpoint test suite passes in mock mode, and the isolated Wavy Node adapter tests verify supported-chain lookup, address registration, the live `scan-risk` URL, `x-api-key` header, traceability normalization, duplicate registration handling, upstream error propagation, and timeout conversion to a `504` gateway timeout. Script tests verify that Railway dry-run output redacts secret variables, apply mode refuses missing live credentials before deploy, the Vercel finalizer publishes the expected public environment variables and strict verification command, invalid live-finalizer inputs stop before deployment, the Fuji deployer rejects missing and malformed private keys before deployment, the optional eERC20 probe accepts an unconfigured default but fails strict or no-bytecode cases, the live verifier proves the Fuji registry `hasScore(bytes32)` and `getScore(bytes32)` ABI behavior, malformed registry ABI responses fail the live gate, the submission evidence generator can render without live checks, and the generated evidence report includes configured public deployment targets without printing Wavy or Fuji secrets. These are included in `pnpm verify`.

`pnpm probe:wavy` is available for the final credential handoff. It refuses placeholder Wavy credentials or demo subject-hash salts, forces live Wavy mode, checks Wavy Node `/chains` for the configured chain id, and prints only non-secret scoring evidence: active supported chain, Wavy analysis id, risk score, traceability provider, wallet-risk scan type, AI risk scale, address registration mode, composite score, subject hash, and evidence hash.

`pnpm probe:fuji` is available for the Fuji deployer handoff. It refuses missing or malformed private keys, checks the live Fuji chain id, and prints only the deployer address plus AVAX balance before deployment.

`pnpm probe:eerc20` is available for the optional EncryptedERC handoff. It is optional by default, but when an eERC20 address is configured it checks Avalanche Fuji chain id `43113` and verifies deployed bytecode without touching token state. `pnpm probe:eerc20:strict` and `ARKSCORE_REQUIRE_EERC20=true` fail if the address is missing.

`.github/workflows/ci.yml` runs `pnpm verify` and `pnpm readiness` for push, pull request, and manual workflow dispatch events.

`pnpm readiness` produces a non-secret live-gate report covering Vercel reachability, Vercel CLI auth, Railway auth, Wavy credentials, Fuji deployer configuration, and frontend deployment variables. It accepts the same Railway API, Fuji registry, and scorer aliases used by the finalization and Hardhat scripts, so the report mirrors the actual handoff flow.

`pnpm smoke:web` checks that the public Vercel deployment is not protected by an auth page and that the shipped Next.js chunks include the hosted score demo, mock Wavy trace, traceability, AI risk scale, subject hash, subject status, evidence hash, scorer status, Store on Fuji flow, and on-chain readback evidence match.

`pnpm submission:evidence:write` writes a non-secret `docs/SUBMISSION_EVIDENCE.md` packet with the current commit, public deployment targets from the configured environment or Fuji deployment artifact, hosted smoke, live verifier, readiness output, and final handoff commands. When `ARKSCORE_REQUIRE_EERC20=true`, the generated handoff commands use `pnpm probe:eerc20:strict`, `ARKSCORE_REQUIRE_EERC20=true pnpm finalize:live:apply`, and `pnpm verify:live:strict:eerc20`.

`pnpm verify:live` checks public deployment behavior. In the current partial-live state it should pass the Vercel frontend check and warn on missing Railway API and Fuji registry inputs; after final deployment, run `pnpm verify:live:strict` to prove the hosted Vercel bundle contains the configured Railway API URL and Fuji registry address, plus Railway health, live Wavy credential mode, production subject-hash salt, OpenAPI, no-store and rate-limited score response, live Wavy source, Fuji registry bytecode, `hasScore(bytes32)`, `getScore(bytes32)`, and authorized scorer. If the EncryptedERC demo is included, run `pnpm verify:live:strict:eerc20`.

`pnpm deploy:railway` is a dry-run Railway deploy planner. `pnpm deploy:railway:apply -- --create-domain` runs `pnpm probe:wavy` in live mode before touching Railway, checks Railway auth, creates or links the Railway project, targets the configured service and environment when setting variables, uploads the API, and can generate the service domain when Railway auth is available.

`pnpm finalize:live` is a dry-run finalizer for the Vercel handoff. `pnpm finalize:live:apply` checks Vercel auth, links the checkout to `VERCEL_PROJECT_NAME` under `VERCEL_SCOPE`, probes any configured eERC20 address before publishing it, sets `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS`, and `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false`, deploys production, then runs strict live verification against the static bundle and live services. When `ARKSCORE_REQUIRE_EERC20=true`, the finalizer prints and runs `pnpm probe:eerc20:strict` plus `pnpm verify:live:strict:eerc20`.

`pnpm --filter @arkscore/contracts scorer:fuji` authorizes or revokes the wallet that will submit score records from the dashboard. Strict live verification checks `ARKSCORE_SCORER_ADDRESS` with `isScorer(address)`.

`pnpm record:fuji` is available for the final end-to-end oracle proof. It fetches a Railway score for `ARKSCORE_TEST_WALLET`, requires live Wavy mode unless `ARKSCORE_ALLOW_MOCK_RECORD=true` is set, writes the returned subject hash and evidence hash to `CreditScoreRegistry`, then reads the record back from Fuji and verifies it matches the API response.

## Pending Credentials

- `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` for live Wavy Node traceability and AI risk scoring.
- `ARKSCORE_SUBJECT_HASH_SALT` for environment-specific on-chain subject hashes.
- Railway login or `RAILWAY_TOKEN` for backend deployment.
- `FUJI_PRIVATE_KEY` for an Avalanche Fuji funded deployer account.
- Deployed `CreditScoreRegistry` address for `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS`.
- `NEXT_PUBLIC_API_BASE_URL` on Vercel must be set to the Railway API URL before the live Wavy-backed flow replaces hosted demo fallback mode.
- `NEXT_PUBLIC_EERC20_DEMO_ADDRESS` can be set after optional EncryptedERC deployment; live verification checks bytecode when it is configured.
- `ARKSCORE_SCORER_ADDRESS` should be set to the dashboard signing wallet and authorized before the final Store on Fuji demo.
- `pnpm record:fuji` should be run after Railway, Wavy, Fuji, and scorer authorization are configured to produce the final non-secret storage proof.

## Deployment Targets

- Vercel frontend: `https://arkscore-seven.vercel.app`
- Railway backend: `TBD`
- Fuji `CreditScoreRegistry`: `TBD`
- Optional eERC20 demo contract: `TBD`
