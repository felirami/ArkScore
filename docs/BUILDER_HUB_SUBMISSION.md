# ArkScore — Builder Hub Submission

## Project name
ArkScore

## Short description
ArkScore converts wallet risk into an auditable Avalanche credit decision for Arkangeles and Bankaool.

## Description / pitch
ArkScore is a compliance-ready credit oracle for LatAm institutions. A user enters an EVM wallet, ArkScore fetches Wavy Node risk/traceability, computes an explainable 0-100 institutional credit score, and stores the decision proof on Avalanche Fuji through `CreditScoreRegistry`.

The result is useful for:
- Arkangeles: investor/borrower screening for IFC equity issuance workflows.
- Bankaool: credit underwriting with an on-chain audit trail.

ArkScore does not store the raw wallet address on-chain. The backend derives a privacy-preserving `subjectHash`, then stores the Wavy risk score, ArkScore credit score, decision enum, evidence hash, Wavy analysis id, institution, submitter, and timestamp on Fuji.

## Links
- Live demo: https://arkscore-seven.vercel.app
- GitHub repository: https://github.com/felirami/ArkScore
- Railway API: https://arkscore-api-production.up.railway.app
- Backend OpenAPI: https://arkscore-api-production.up.railway.app/openapi.json
- Fuji CreditScoreRegistry: https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code
- Demo proof transaction: https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2
- Pitch deck: PITCH-DECK.md
- Submission evidence: docs/SUBMISSION_EVIDENCE.md

## Evaluation criteria mapping

### 1. Propuesta de valor
Financial institutions need a way to use on-chain behavior without exposing raw wallet data or relying on screenshots/manual review. ArkScore gives Arkangeles and Bankaool a reusable decision rail: wallet risk in, institutional decision out, with proof stored on Avalanche.

### 2. Complejidad técnica
Built as a full-stack system:
- Next.js dashboard with wallet connection, institution selection, Wavy score fetch, contract write, and on-chain readback.
- Express/Railway API with live Wavy Node integration, deterministic hashing, OpenAPI, rate limits, and live-provider fallback behavior.
- Shared TypeScript package for score schemas, composite scoring, decision logic, evidence hash generation, and validation.
- Hardhat Solidity contract with scorer permissions, score registry, tests, deployment artifacts, Fuji scripts, and proof-record generation.
- Verification scripts for Railway, Wavy, Fuji, hosted demo smoke, readiness, and submission evidence.

### 3. Uso de componentes específicos de Avalanche
- Avalanche Fuji `CreditScoreRegistry` smart contract.
- Fuji wallet flow through wagmi/viem.
- On-chain storage of score proofs, evidence hashes, Wavy analysis ids, institution decisions, scorer permissions, and readback verification.
- Avalanche-oriented architecture: Wavy risk is evaluated on Avalanche chain data and the institutional proof is anchored to Fuji for auditability.
- Optional eERC20/EncryptedERC path documented for a privacy-preserving credit token extension.

### 4. Factibilidad
The product is feasible as a SaaS/API for institutional underwriting:
- Per-wallet score endpoint.
- Institution-specific thresholds for Arkangeles and Bankaool.
- On-chain audit record that can be independently verified.
- Privacy-preserving subject hash instead of raw wallet storage.
- Production deployments already live on Vercel and Railway.

### 5. Ejecución
Built during the hackathon:
- Live web dashboard.
- Railway scoring API.
- Wavy Node integration with address registration, scan-risk, project risk snapshot fallback, and wallet report fallback.
- Avalanche Fuji score registry contract and demo transaction.
- Score/evidence hashing model.
- Contract readback and evidence-match UI.
- Documentation, readiness checks, probes, and submission evidence scripts.

## Demo script
1. Open https://arkscore-seven.vercel.app.
2. Connect an Avalanche Fuji wallet.
3. Use the default wallet or paste any EVM wallet.
4. Choose Arkangeles or Bankaool.
5. Click `Fetch Wavy score`.
6. Show Wavy risk, ArkScore credit score, recommendation, subject hash, analysis id, evidence hash, and risk reason.
7. Store or show the existing Fuji record in `CreditScoreRegistry`.
8. Open the Snowscan transaction/contract and explain that the raw wallet is not stored, only the privacy-preserving proof.

## What was built during the hackathon
The full ArkScore app, API, score engine, contract, deployment scripts, readiness scripts, Wavy integration, Fuji registry proof path, and submission docs were built during the hackathon period. Previous ideas or context may have inspired the direction, but the submitted implementation progress is the hackathon-built work represented in this repository.

## Suggested Spanish submission text
ArkScore convierte el riesgo de una wallet en una decisión crediticia auditable sobre Avalanche para Arkangeles y Bankaool. El usuario ingresa una wallet, el backend obtiene riesgo y trazabilidad de Wavy Node, calcula un score institucional 0-100 y registra la prueba en Avalanche Fuji mediante un contrato `CreditScoreRegistry`. Para proteger privacidad, no guardamos la wallet en cadena: guardamos un `subjectHash`, el hash de evidencia, el id de análisis Wavy y la decisión institucional. El demo incluye frontend en Vercel, API en Railway, integración Wavy, contrato en Fuji, lectura on-chain de la evidencia y scripts de verificación para jueces.
