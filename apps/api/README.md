# ArkScore API

Railway Express API for Wavy Node wallet risk scoring.

Endpoint:

```text
GET /
GET /openapi.json
GET /health
GET /api/score/:address
GET /users/:foreignUserId
POST /webhook
```

Query params:

```text
institution=arkangeles | bankaool
```

The API calls Wavy Node when `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` are configured. Otherwise `WAVY_NODE_MOCK_MODE=auto` returns deterministic demo data with the same response shape. `WAVY_NODE_CHAIN_ID` is pinned to Wavy-supported Avalanche mainnet `43114` at runtime, while ArkScore stores the resulting evidence on the Avalanche Fuji `43113` registry. The Wavy adapter exposes a supported-chain helper used by `pnpm probe:wavy`, registers the wallet, creates an investigation when no completed risk result exists yet, polls `scan-risk`, and rejects upstream scan results whose returned chain id or wallet address does not match the ArkScore request. Live Wavy requests use `WAVY_NODE_TIMEOUT_MS` and `WAVY_NODE_ANALYSIS_POLL_*` so Railway returns a clear gateway timeout if the upstream stalls. Score requests are rate-limited per client with `ARKSCORE_SCORE_RATE_LIMIT_MAX` and `ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS`.

The same API can be configured as the Wavy Node integration URL. `GET /users/:foreignUserId` returns the configured compliance user-data JSON for address registrations created by ArkScore, and `POST /webhook` acknowledges signed Wavy Node alert payloads. Both routes verify `x-wavynode-hmac` and `x-wavynode-timestamp` with `WAVY_NODE_INTEGRATION_SECRET`.

`/openapi.json` documents the health, scoring, and Wavy integration contract for Railway smoke tests, frontend integration, and hackathon judges. The document includes the current request origin first in `servers`, so the live Railway API advertises the exact URL that `pnpm verify:railway:live` is proving.
