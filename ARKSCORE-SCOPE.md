# ArkScore - Full Project Scope

**Privacy-Preserving On-Chain Credit & Investor Risk Scoring Oracle**  
**Hackathon:** LatAm Institucional (Avalanche + Arkangeles + Bankaool)  
**Track:** Analitica y Scoring Crediticio On-Chain (Track 10) + IFC elements (Track 5) + Identity (Track 7)  
**Goal:** Win 1st place + Wavy Node $200 partner prize + Oracle credits

**One-line pitch:**  
"The missing compliance + risk layer that lets Arkangeles tokenize IFC shares and Bankaool underwrite credit using real-time Wavy Node risk scores on Avalanche - with eERC20 privacy."

## 1. Business & Hackathon Alignment

- **Solves real pain** for both institutions:
  - **Arkangeles (IFC crowdfunding):** Investor accreditation + borrower risk scoring before equity issuance.
  - **Bankaool (banking):** Alternative-data credit underwriting for thin-file clients.
- **Mandatory Wavy Node integration** -> qualifies for $200 credits + post-hackathon support.
- **Uses highlighted resources:** Avalanche Fuji (or L1), eERC20 privacy standard, Wavy Node traceability + risk score infra.
- **Judging criteria coverage:**
  - Business viability + model (SaaS per-query API)
  - Technical viability (solid contracts + privacy)
  - MVP progress (fully functional dashboard + on-chain actions)
  - Avalanche + partner tech (explicit Wavy + eERC20)
  - Monetization slide ready

## 2. High-Level Architecture

```text
Frontend (Next.js + Vercel)
  |
  | wagmi/viem
  v
Avalanche Fuji Testnet <-> Smart Contracts
  ^
  | viem/ethers calls
  |
Backend (Railway / Node.js)
  |
  v
Wavy Node Risk Scoring + Traceability
```

## 3. MVP Features (Must-Have for Submission)

### Dashboard (`/dashboard`)

- Wallet connect (Avalanche Fuji only)
- Input any wallet address (with 3 demo buttons)
- Live "Get Score" button
- Results panel:
  - Wavy Node Risk Score (0-100, color-coded + explanation)
  - Composite Credit Score (our algorithm)
  - Breakdown (patterns, on-chain signals, mock repayment history)
  - On-chain transaction hash + Fuji explorer link
  - Institutional action buttons:
    - "Approve IFC Equity Issuance (Arkangeles)"
    - "Approve Loan (Bankaool)"
- Optional eERC20 section: "Mint Privacy Credit Note" (confidential token tied to score)

### Backend API (`/api/score`)

- `POST /api/score` -> takes address -> calls Wavy Node -> computes composite score -> submits to smart contract -> returns full payload

### Smart Contracts (Fuji)

1. **CreditScoreRegistry.sol**
   - `submitScore(address, uint8 score, string wavyMetadata)`
   - `getScore(address)` -> returns struct
   - Events for transparency
2. **Highly recommended:** EncryptedERC / eERC20 deployed from ava-labs repo for privacy-preserving credit notes

### Wavy Node Integration

- Uses official integration pattern (or direct risk endpoint)
- Clearly documented as fulfilling the partner prize requirement

## 4. Tech Stack (Exact Versions Recommended)

| Layer     | Technology                                                    | Deployment |
|-----------|---------------------------------------------------------------|------------|
| Frontend  | Next.js 15 app router + Tailwind + shadcn/ui + wagmi + viem   | Vercel     |
| Backend   | Node.js + Express or Hono + TypeScript                        | Railway    |
| Contracts | Solidity ^0.8.24 + Hardhat                                    | Fuji testnet |
| Privacy   | eERC20 (ava-labs/EncryptedERC)                                | Fuji testnet |
| RPC       | `https://api.avax-test.network/ext/bc/C/rpc`                  | -          |

## 5. Repository Structure (Target)

```text
arkscore-latam/
|-- contracts/                  # Hardhat
|   |-- CreditScoreRegistry.sol
|   `-- EncryptedERC if used
|-- scripts/
|   `-- deploy.ts
|-- backend/                    # Railway
|   |-- src/
|   |   |-- routes/score.ts
|   |   `-- wavy.ts
|   `-- server.ts
|-- frontend/                   # Next.js or monorepo root
|   |-- app/
|   |-- components/
|   `-- lib/wagmi.ts
|-- .env.example
|-- hardhat.config.ts
|-- README.md
|-- ARKSCORE-SCOPE.md           # You are here
`-- pitch-deck.md
```

## 6. Submission Deliverables (Must Ship)

- GitHub repo (public) with clean README
- Live Vercel URL (demoable in <2 minutes)
- Deployed contract addresses + verification links
- 1-2 minute demo video (optional but powerful)
- Pitch slides (8 slides max) - use the winning structure from hackathon files
- Explicit mention of Wavy Node integration

## 7. Success Criteria (What Judges Will Love)

- Live demo that actually works
- Clear Wavy Node integration slide + code
- eERC20 privacy demo (even if minimal)
- Business model slide (per-query SaaS)
- Pitch that quotes real Arkangeles/Bankaool pain points from today's talks
- Spanish copy on the deck (optional but bonus)

## 8. Nice-to-Haves (Only if you have time)

- Custom Avalanche L1 subnet mention in pitch
- Webhook support from Wavy Node
- Full eERC20 converter + private transfer flow
- The Graph indexing of scores
- Deployed Oracle Cloud component
