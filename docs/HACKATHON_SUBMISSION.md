# Hackathon Submission Notes

## One-liner

ArkScore turns Wavy Node wallet traceability and AI risk into an auditable Avalanche Fuji credit score oracle for Arkangeles and Bankaool.

## Demo Script

1. Connect an Avalanche Fuji wallet.
2. Enter a wallet address to score.
3. Fetch Wavy Node risk and traceability data.
4. Compute an ArkScore composite credit score.
5. Store the decision on-chain with `CreditScoreRegistry`.
6. Read the stored registry record back and show the evidence match badge.
7. Show an institutional decision:
   - Arkangeles: approve or review IFC equity issuance participation.
   - Bankaool: approve, review, or decline a credit underwriting request.

## Technical Differentiators

- Wavy Node risk is preserved as a first-class field, not hidden inside the composite score.
- A deterministic evidence hash is stored on-chain with the Wavy analysis id.
- The scored wallet is represented on-chain by a backend-derived `subjectHash`, keeping the raw wallet address out of registry calldata and events.
- The same score engine supports Arkangeles and Bankaool with different approval thresholds.
- Mock mode keeps the demo reliable before the final Wavy project id and API key are available.
- `pnpm probe:wavy` gives the team a pre-deployment proof that live Wavy credentials can reach Wavy `/chains`, the configured chain is Avalanche Fuji `43113` and active, and Wavy returns an analysis id, risk score, traceability fields, subject hash, and evidence hash without exposing the API key.
- `pnpm verify:railway:live` gives the team a post-deployment proof that the Railway API itself is serving live Wavy-backed health, OpenAPI, score, no-store cache, and rate-limit responses before Fuji/Vercel finalization.
- `pnpm probe:fuji` gives the team a pre-deployment proof that the Fuji deployer key is valid, funded, and pointed at chain id 43113 without exposing the private key.
- `pnpm record:fuji` gives judges a CLI-verifiable proof that a live Wavy-backed Railway score was written by the configured authorized scorer, read back through `CreditScoreRegistry`, and captured as a non-secret `LatestScoreRecord.json` artifact for the submission evidence packet.
- `pnpm readiness:strict:record` makes that `LatestScoreRecord.json` proof a required final-readiness gate before the Vercel handoff is sealed.
- The dashboard also reads `getScore(subjectHash)` after storage and shows the stored score, submitter, update time, analysis id, institution, and evidence match status.
- The dashboard has an optional eERC20 card for the EncryptedERC privacy-preserving credit token demo; `pnpm plan:eerc20`, `pnpm probe:eerc20:strict`, and `pnpm verify:live:strict:eerc20:record` plan and prove deployed Fuji bytecode when that address is part of the final pitch.
- Authorized scorer permissions keep the registry closer to an institutional oracle model.
- `pnpm audit:requirements` gives judges a non-secret requirement-by-requirement map of ready components and remaining live proofs.
- `pnpm judge:demo` prints a current environment-aware walkthrough for fallback demos and final live proof mode.
- `pnpm submission:evidence:write` generates `docs/SUBMISSION_EVIDENCE.md`, a non-secret evidence packet with the current commit, hosted demo smoke, live verifier, requirements audit, readiness output, and final handoff commands.

## Links

- Live demo: `https://arkscore-seven.vercel.app`
- Submission evidence: `docs/SUBMISSION_EVIDENCE.md`
- Judge demo runbook: `docs/JUDGE_DEMO.md`
- Frontend repository path: `apps/web`
- Backend repository path: `apps/api`
- Contracts repository path: `packages/contracts`
- Fuji contract address: `TBD`
- Optional eERC20 address: `TBD`
