# Optional eERC20 Demo

ArkScore is designed so the score registry can sit next to a privacy-preserving credit token demo. The recommended path is to use Ava Labs' EncryptedERC repository rather than copying the protocol contracts into this hackathon repo.

## Why eERC20 Fits ArkScore

- The public chain stores the score decision, evidence hash, and Wavy analysis id.
- The optional eERC20 flow can keep credit-token balances and transfer amounts private.
- Institutions can still audit the score registry while token movement remains privacy-preserving.

## Suggested Integration

1. Clone the official repo:

```bash
git clone https://github.com/ava-labs/EncryptedERC.git ../EncryptedERC
```

2. Follow the repository setup for Node.js 22, Circom, and proof artifacts.

3. Deploy EncryptedERC to Avalanche Fuji in standalone mode or converter mode. The official repo includes `scripts/deploy-standalone.ts` and `scripts/deploy-converter.ts` examples; AvaCloud's deployment docs describe standalone as a new private-token deployment and converter as privacy wrapping for an existing ERC-20.

4. Add the deployed address to the ArkScore submission:

```bash
EERC20_DEMO_ADDRESS=0x...
```

5. In the live demo, present it as the privacy layer for a future confidential ArkScore credit token.

## Submission Placeholder

- Optional eERC20 demo contract: `TBD`

## References

- Ava Labs EncryptedERC: https://github.com/ava-labs/EncryptedERC
- AvaCloud eERC deployment docs: https://docs.avacloud.io/portal/privacy-solutions/deploying-e-erc-contracts
