# Judge Demo Runbook

Use this page when walking through ArkScore for the LatAm Institucional Hackathon judges. For a current environment-aware version, run:

```bash
pnpm judge:demo
```

## Three-Minute Walkthrough

1. Open `https://arkscore-seven.vercel.app`.
2. Connect an Avalanche Fuji wallet.
3. Keep the prefilled demo wallet or paste another EVM wallet address.
4. Select **Arkangeles**, fetch the score, and point to:
   - Wavy risk score on the `0-100` AI scale.
   - Wavy traceability fields.
   - Backend-derived `subjectHash`.
   - Wavy evidence hash.
   - Composite score and IFC equity issuance decision.
5. Select **Bankaool**, fetch the score again, and point to the different credit-underwriting threshold and loan decision.
6. If `CreditScoreRegistry` and an authorized scorer are configured, store or update the score on Fuji and show `getScore(subjectHash)` readback with the evidence match badge.
7. If the optional EncryptedERC demo is configured, open the eERC20 address from the privacy-token card. Otherwise, describe it as the privacy-preserving credit token slot.

## Fallback Mode

The hosted Vercel deployment is judge-usable before Railway and Wavy credentials are available. In fallback mode, the dashboard clearly labels mock Wavy traceability while preserving the same user flow:

```bash
pnpm smoke:web
pnpm audit:requirements
pnpm readiness
pnpm verify:live
```

Expected current partial-live evidence:

- Vercel frontend returns HTTP 200.
- Demo score flow appears in the shipped Next.js bundle.
- Mock scores remain read-only, so Store on Fuji is reserved for live Wavy evidence.
- Requirements audit has no structural failures.
- Readiness reports external credential/deployment warnings only.
- Live verifier warns for missing Railway API and Fuji registry until those are configured.

## Final Live Mode

Once credentials and deployer funds are available, run the live proof sequence:

```bash
pnpm probe:wavy
pnpm probe:fuji
pnpm plan:eerc20
pnpm probe:eerc20
pnpm railway:whoami
pnpm verify:railway
pnpm deploy:railway:apply -- --create-domain
export ARKSCORE_API_URL=https://your-railway-api.up.railway.app
pnpm verify:railway:live
pnpm --filter @arkscore/contracts deploy:fuji
export ARKSCORE_REGISTRY_ADDRESS=0x...
export ARKSCORE_SCORER_ADDRESS=0x...
# If the scorer is not the FUJI_PRIVATE_KEY deployer, set ARKSCORE_SCORER_PRIVATE_KEY.
pnpm --filter @arkscore/contracts scorer:fuji
pnpm record:fuji
pnpm readiness:strict:record
pnpm verify:live:preflight:record
pnpm finalize:live:apply
pnpm verify:live:strict:record
```

If the optional EncryptedERC demo is included, use:

```bash
export ARKSCORE_EERC20_DEMO_ADDRESS=0x...
export ARKSCORE_REQUIRE_EERC20=true
pnpm probe:eerc20:strict
pnpm readiness:strict:record
pnpm verify:live:preflight:record
pnpm verify:live:strict:eerc20:record
```

## What Judges Should Remember

- ArkScore does not store the raw scored wallet address on-chain.
- Wavy Node remains explicit evidence: analysis id, traceability, risk score, and evidence hash.
- The composite score turns that evidence into Arkangeles and Bankaool institution-specific decisions.
- The Fuji registry gives institutions an auditable oracle record keyed by `subjectHash`, and `LatestScoreRecord.json` carries the exact score snapshot needed to recompute the stored evidence hash and prove it was fresh when recorded.
- The optional eERC20 path keeps private credit token balances separate from the public scoring oracle.
