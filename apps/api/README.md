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

The API calls Wavy Node when `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` are configured. Otherwise `WAVY_NODE_MOCK_MODE=auto` returns deterministic demo data with the same response shape. `WAVY_NODE_CHAIN_ID` is pinned to Avalanche Fuji `43113` at runtime, and the API config refuses any other chain id before serving scores. The Wavy adapter also exposes a supported-chain helper used by `pnpm probe:wavy` to verify that Fuji is active before the live score call. Live Wavy requests use `WAVY_NODE_TIMEOUT_MS` so Railway returns a clear gateway timeout if the upstream stalls. Score requests are rate-limited per client with `ARKSCORE_SCORE_RATE_LIMIT_MAX` and `ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS`.

`/openapi.json` documents the health and scoring contract for Railway smoke tests, frontend integration, and hackathon judges. The document includes the current request origin first in `servers`, so the live Railway API advertises the exact URL that `pnpm verify:railway:live` is proving.
