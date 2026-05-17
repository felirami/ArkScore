# ArkScore Submission Evidence

Generated: 2026-05-17

## Public links

- Live demo: https://arkscore-seven.vercel.app
- GitHub repository: https://github.com/felirami/ArkScore
- Railway backend: https://arkscore-api-production.up.railway.app
- Backend OpenAPI: https://arkscore-api-production.up.railway.app/openapi.json
- Avalanche Fuji `CreditScoreRegistry`: https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code
- Fuji proof transaction: https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2
- Builder Hub submission draft: docs/BUILDER_HUB_SUBMISSION.md
- Hackathon submission notes: docs/HACKATHON_SUBMISSION.md

## Live verification performed

### Website

Command:

```bash
pnpm --filter @arkscore/web typecheck
pnpm --filter @arkscore/web build
vercel --prod --yes
```

Result:

- Typecheck passed.
- Production static export build passed.
- Vercel production deployment completed and aliased to https://arkscore-seven.vercel.app.
- Browser smoke verified the hosted page renders the new hackathon criteria section.
- Browser interaction fetched a live Wavy-backed score and rendered the institutional decision panel.
- Browser console had no JavaScript errors during the smoke test.

### Backend / Wavy Node

Command:

```bash
ARKSCORE_API_URL=https://arkscore-api-production.up.railway.app pnpm verify:railway:live
```

Result:

- Railway health passed.
- OpenAPI passed.
- Wavy chain config passed: Avalanche `43114`.
- Fuji registry proof chain config passed: `43113`.
- Live Wavy mode passed: credentials configured and mock mode disabled.
- Live score endpoint passed with fresh Wavy-backed response, evidence hash, no-store headers, and rate limiting.

### Hosted demo smoke

Command:

```bash
ARKSCORE_WEB_URL=https://arkscore-seven.vercel.app pnpm smoke:web
```

Result:

- Public page returned 200.
- ArkScore, Avalanche Fuji, Wavy score flow, subject hash, evidence hash, traceability, scorer status, subject status, Store on Fuji, On-chain readback, and Evidence match UI strings were present in the deployed bundle.

## Demo score observed in production

Endpoint:

```text
https://arkscore-api-production.up.railway.app/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=arkangeles
```

Observed through the hosted UI:

- Source: Live Wavy Node
- Wavy risk: 11/100
- ArkScore credit score: 89/100
- Decision: Approve IFC equity issuance
- Analysis id: `wavy-address-51-0xd8da6bf26964af9d7eed9e03e53415d37aa96045`
- Risk reason: `Wavy Node project address risk snapshot.`

## Built during hackathon

- Vercel web dashboard.
- Railway scoring API.
- Wavy Node integration: address registration, scan-risk, project address risk snapshot fallback, wallet report fallback.
- Avalanche Fuji `CreditScoreRegistry` contract and deployed proof path.
- Privacy-preserving `subjectHash` model.
- Evidence hash and institutional decision model.
- Contract readback / evidence-match UI.
- Submission docs, readiness scripts, probes, and evidence files.

## Evaluation criteria evidence

- Propuesta de valor: institution-ready wallet-to-credit decision workflow for Arkangeles and Bankaool.
- Complejidad técnica: full-stack app, live provider integration, scoring engine, Solidity contract, hosted deployments, verification scripts.
- Avalanche-specific components: Fuji contract, Fuji wallet flow, on-chain evidence hashes, scorer authorization, Snowscan-verifiable records.
- Factibilidad: deployed public frontend/backend and repeatable API/contract path.
- Ejecución: repository contains implementation, docs, live deployment links, and verification commands.
