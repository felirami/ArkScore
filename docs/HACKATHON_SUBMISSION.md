# Hackathon Submission Notes

## One-liner

ArkScore converts Wavy Node wallet traceability into an auditable Avalanche credit decision oracle for Arkangeles and Bankaool.

## Core pitch

ArkScore lets an institution enter an EVM wallet, fetch live Wavy Node risk/traceability, compute a 0-100 ArkScore credit score, and anchor the result on Avalanche Fuji. The on-chain record stores a privacy-preserving subject hash, Wavy risk score, composite credit score, decision enum, evidence hash, Wavy analysis id, institution, submitter, and timestamp — not the raw wallet address.

## Demo Script

1. Open the live demo: `https://arkscore-seven.vercel.app`.
2. Connect an Avalanche Fuji wallet.
3. Enter a wallet address or use the default wallet.
4. Select Arkangeles or Bankaool.
5. Fetch the Wavy-backed ArkScore decision.
6. Show Wavy risk, ArkScore credit score, recommendation, subject hash, analysis id, evidence hash, and risk reason.
7. Store the score on Fuji or show an existing on-chain readback from `CreditScoreRegistry`.
8. Open Snowscan to show the deployed contract or proof transaction.

## Evaluation criteria alignment

### Propuesta de valor

ArkScore gives LatAm institutions a practical underwriting primitive: wallet risk becomes an explainable credit/equity-issuance decision with a verifiable audit trail. Arkangeles can screen investor/borrower participation in IFC equity issuance workflows; Bankaool can reuse the same risk record for credit underwriting.

### Complejidad técnica

- Next.js dashboard with wallet connection, Wavy score intake, institution-specific decisions, Fuji writes, and contract readback.
- Railway Express API with Wavy Node integration, OpenAPI, rate limiting, privacy-preserving subject hashes, evidence hashes, and live fallback handling.
- Shared TypeScript score schemas and deterministic composite scoring.
- Solidity `CreditScoreRegistry` with scorer authorization, score storage, and readback verification.
- Hardhat, tests, probes, readiness checks, live verifiers, and submission evidence scripts.

### Uso de componentes específicos de Avalanche

- Avalanche Fuji `CreditScoreRegistry` deployed at `0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`.
- Fuji wallet/contract flow through wagmi and viem.
- On-chain storage of Wavy-backed evidence hashes, analysis ids, institutional decisions, timestamps, and scorer authorization.
- Avalanche wallet risk evaluation through Wavy-supported Avalanche chain data, with the proof anchored on Fuji.
- Optional eERC20/EncryptedERC extension path documented for privacy-preserving credit tokens.

### Factibilidad

The architecture is feasible as a SaaS/API product: per-wallet scoring, institution-specific thresholds, privacy-preserving identity, provider traceability, production frontend/backend, and independently verifiable on-chain audit records.

### Ejecución

Built during this hackathon:

- Live Vercel frontend.
- Live Railway scoring API.
- Wavy Node address registration, scan-risk path, project risk snapshot fallback, and wallet report fallback.
- Avalanche Fuji score registry contract and proof transaction.
- Score/evidence hash model.
- Contract readback and evidence-match UI.
- Readiness/probe/submission evidence scripts and docs.

## Technical Differentiators

- Wavy risk is preserved as a first-class field instead of being hidden inside a composite score.
- The scored wallet is keyed by backend-derived `subjectHash`, keeping raw wallets out of registry calldata/events.
- Evidence hashes bind the generated score response to the stored on-chain record.
- Same score engine supports Arkangeles and Bankaool with different approval thresholds.
- Live Wavy fallback path keeps the demo reliable when Wavy investigation polling fails: ArkScore can use Wavy project address risk snapshots or Wavy wallet reports before falling back to errors.
- `pnpm probe:wavy`, `pnpm probe:fuji`, `pnpm verify:railway:live`, `pnpm readiness`, and `pnpm submission:evidence:write` provide repeatable, secret-safe judge evidence.

## Links

- Live demo: `https://arkscore-seven.vercel.app`
- Railway API: `https://arkscore-api-production.up.railway.app`
- Backend OpenAPI: `https://arkscore-api-production.up.railway.app/openapi.json`
- GitHub repo: `https://github.com/felirami/ArkScore`
- Submission evidence: `docs/SUBMISSION_EVIDENCE.md`
- Builder Hub submission draft: `docs/BUILDER_HUB_SUBMISSION.md`
- Hackathon readiness checklist: `docs/HACKATHON_READINESS_CHECKLIST.md`
- Judge demo runbook: `docs/JUDGE_DEMO.md`
- Frontend path: `apps/web`
- Backend path: `apps/api`
- Contracts path: `packages/contracts`
- Fuji contract: `0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`
- Fuji explorer: `https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code`
- Demo proof tx: `https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2`
- Optional eERC20 address: `TBD`
