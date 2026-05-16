# ArkScore API

Railway Express API for Wavy Node wallet risk scoring.

Endpoint:

```text
GET /
GET /openapi.json
GET /health
GET /api/score/:address
```

Query params:

```text
institution=arkangeles | bankaool
```

The API calls Wavy Node when `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` are configured. Otherwise `WAVY_NODE_MOCK_MODE=auto` returns deterministic demo data with the same response shape. The Wavy adapter also exposes a supported-chain helper used by `pnpm probe:wavy` to verify that the configured `WAVY_NODE_CHAIN_ID` is active before the live score call.

`/openapi.json` documents the health and scoring contract for Railway smoke tests, frontend integration, and hackathon judges.
