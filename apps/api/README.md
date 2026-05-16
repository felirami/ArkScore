# ArkScore API

Railway Express API for Wavy Node wallet risk scoring.

Endpoint:

```text
GET /api/score/:address
```

Query params:

```text
institution=arkangeles | bankaool
```

The API calls Wavy Node when `WAVY_NODE_API_KEY` and `WAVY_NODE_PROJECT_ID` are configured. Otherwise `WAVY_NODE_MOCK_MODE=auto` returns deterministic demo data with the same response shape.
