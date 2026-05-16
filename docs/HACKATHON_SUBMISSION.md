# Hackathon Submission Notes

## One-liner

ArkScore turns Wavy Node wallet traceability and AI risk into an auditable Avalanche Fuji credit score oracle for Arkangeles and Bankaool.

## Demo Script

1. Connect an Avalanche Fuji wallet.
2. Enter a wallet address to score.
3. Fetch Wavy Node risk and traceability data.
4. Compute an ArkScore composite credit score.
5. Store the decision on-chain with `CreditScoreRegistry`.
6. Show an institutional decision:
   - Arkangeles: approve or review IFC equity issuance participation.
   - Bankaool: approve, review, or decline a credit underwriting request.

## Technical Differentiators

- Wavy Node risk is preserved as a first-class field, not hidden inside the composite score.
- A deterministic evidence hash is stored on-chain with the Wavy analysis id.
- The scored wallet is represented on-chain by a backend-derived `subjectHash`, keeping the raw wallet address out of registry calldata and events.
- The same score engine supports Arkangeles and Bankaool with different approval thresholds.
- Mock mode keeps the demo reliable before the final Wavy project id and API key are available.
- Authorized scorer permissions keep the registry closer to an institutional oracle model.

## Links

- Live demo: `https://arkscore-seven.vercel.app`
- Frontend repository path: `apps/web`
- Backend repository path: `apps/api`
- Contracts repository path: `packages/contracts`
- Fuji contract address: `TBD`
- Optional eERC20 address: `TBD`
