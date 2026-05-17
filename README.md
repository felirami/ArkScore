# ArkScore

ArkScore es un oráculo de scoring crediticio on-chain y de riesgo de inversionistas, diseñado para el LatAm Institucional Hackathon con Avalanche, Arkangeles IFC y Bankaool.

La propuesta: convertir el riesgo de una wallet en una decisión institucional auditable. Wavy Node analiza trazabilidad y riesgo, ArkScore calcula un score crediticio explicable de 0 a 100, y Avalanche Fuji guarda la prueba de decisión sin exponer la wallet original on-chain.

## Links de entrega

- Frontend en vivo: [`https://arkscore-seven.vercel.app`](https://arkscore-seven.vercel.app)
- Backend en vivo: [`https://arkscore-api-production.up.railway.app`](https://arkscore-api-production.up.railway.app)
- OpenAPI del backend: [`https://arkscore-api-production.up.railway.app/openapi.json`](https://arkscore-api-production.up.railway.app/openapi.json)
- Fuji `CreditScoreRegistry`: [`0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code)
- Transacción demo de prueba en Fuji: [`0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2`](https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2)
- Artefacto de prueba más reciente: [`packages/contracts/deployments/fuji/LatestScoreRecord.json`](packages/contracts/deployments/fuji/LatestScoreRecord.json)
- Pitch deck: [`PITCH-DECK.md`](PITCH-DECK.md)

## Resumen para jueces

ArkScore ayuda a Arkangeles y Bankaool a evaluar wallets con evidencia verificable:

1. El usuario conecta una wallet de Avalanche Fuji.
2. Ingresa una wallet objetivo.
3. La API obtiene trazabilidad y riesgo de Wavy Node, o usa fallback demo cuando Wavy no está disponible.
4. ArkScore calcula un score crediticio compuesto de 0 a 100.
5. La app muestra la decisión institucional: aprobar, enviar a revisión o rechazar.
6. Si el score viene de Wavy en vivo, un scorer autorizado puede guardar la prueba en `CreditScoreRegistry` en Fuji.
7. La app lee el registro on-chain para validar que la evidencia guardada coincide con la respuesta de la API.

## Guion demo de 60 segundos

0-10s: “ArkScore ayuda a Arkangeles y Bankaool a convertir riesgo de wallets en decisiones de crédito auditables. El frontend está en Vercel, la API está en Railway y la prueba de scoring se guarda en Avalanche Fuji.”

10-25s: “Conecto una wallet Fuji, ingreso una wallet de prueba y genero un score. El dashboard muestra trazabilidad estilo Wavy, score compuesto ArkScore, decisión institucional, hash del sujeto y hash de evidencia.”

25-40s: “El backend usa datos de Wavy cuando están disponibles, con fallback a snapshots de riesgo y reportes de wallets cuando el polling de investigación no responde. El flujo API-a-contrato corre end-to-end sobre infraestructura en vivo.”

40-55s: “Guardo el score en el contrato `CreditScoreRegistry` desplegado y lo leo de vuelta desde Fuji. La transacción se puede ver en Snowscan y la evidencia guardada coincide con la respuesta de la API.”

55-60s: “Esto se convierte en un rail SaaS por consulta para underwriting institucional, con eERC20 como siguiente capa de privacidad para notas crediticias confidenciales.”

## Qué está construido

- Dashboard Next.js 15 con App Router, Tailwind CSS, primitivas UI estilo shadcn, wagmi, viem, soporte para Avalanche Fuji y export estático limpio para Vercel.
- API Express lista para Railway con `GET /api/score/:address` y `GET /openapi.json`.
- Integración con Wavy Node usando registro de direcciones, creación de investigaciones, `GET /v1/projects/:projectId/addresses/scan-risk`, snapshots de riesgo por proyecto y fallback de reportes de wallet.
- Objeto de trazabilidad de primera clase, escala de riesgo IA y evidencia verificable.
- Modo mock determinístico y solo lectura para demos locales cuando las credenciales live de Wavy no están configuradas.
- Contrato Hardhat 3 en Solidity `^0.8.24`, lint con Solhint y tests para guardar registros de score respaldados por Wavy en Fuji.
- Slot opcional para demo eERC20 de Ava Labs EncryptedERC como dirección de token crediticio privado.
- Scripts de verificación, readiness, probes y evidencia para Vercel, Railway, Fuji y la ruta opcional eERC20.

## Estructura del proyecto

```text
apps/
  web/        Dashboard Next.js 15 y demo de wallet
  api/        API Express en Railway para proxy/scoring con Wavy Node
packages/
  contracts/ Contratos Hardhat, tests y scripts de despliegue Fuji
  shared/    Modelo TypeScript compartido y lógica de decisión
config/
  tsconfig/  Configuraciones TypeScript compartidas
docs/
  Notas de despliegue, trazabilidad de requisitos, eERC20 y entrega
```

## Flujo demo

1. Conectar una wallet de Avalanche Fuji.
2. Ingresar una dirección de wallet.
3. Obtener trazabilidad de Wavy Node y score de riesgo IA.
4. Calcular el score crediticio compuesto de ArkScore.
5. Guardar score, hash de evidencia, ID de análisis Wavy y decisión institucional on-chain.
6. Leer el registro en Fuji y mostrar si la evidencia guardada coincide con la respuesta actual de Wavy/API.
7. Mostrar una decisión como `Approve IFC equity issuance` o `Approve Bankaool loan`.

## Variables de entorno

Copia `.env.example` al app o proveedor de deployment correspondiente y reemplaza los placeholders. Para trabajo local solo de frontend, copia `apps/web/.env.local.example` a `apps/web/.env.local`; contiene únicamente valores públicos `NEXT_PUBLIC_*`.

```bash
NEXT_PUBLIC_API_BASE_URL=https://arkscore-api-production.up.railway.app
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46
NEXT_PUBLIC_EERC20_DEMO_ADDRESS=
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false

WAVY_NODE_API_KEY=ApiKey wavy_replace_with_wavy_node_api_key
WAVY_NODE_PROJECT_ID=replace_with_wavy_node_project_id
WAVY_NODE_BASE_URL=https://api.wavynode.com/v1
WAVY_NODE_CHAIN_ID=43114
WAVY_NODE_TIMEOUT_MS=15000
WAVY_NODE_ANALYSIS_POLL_INTERVAL_MS=2000
WAVY_NODE_ANALYSIS_POLL_TIMEOUT_MS=90000
WAVY_NODE_AUTO_REGISTER=true
WAVY_NODE_FOREIGN_USER_PREFIX=arkscore-wallet
WAVY_NODE_MOCK_MODE=auto
WAVY_NODE_INTEGRATION_SECRET=replace_with_wavy_node_integration_secret
WAVY_NODE_INTEGRATION_TIME_TOLERANCE_MS=300000
WAVY_NODE_INTEGRATION_USER_DATA_JSON={"givenName":"replace_with_given_name","email":"replace_with_email@example.com"}
ARKSCORE_SCORE_RATE_LIMIT_MAX=120
ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS=60000
ARKSCORE_SUBJECT_HASH_SALT=replace_with_long_random_subject_hash_salt
ARKSCORE_REQUIRE_EERC20=false

FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
FUJI_PRIVATE_KEY=
ARKSCORE_SCORER_ADDRESS=
ARKSCORE_SCORER_PRIVATE_KEY=
FUJI_SCORER_PRIVATE_KEY=
```

Notas importantes:

- `WAVY_NODE_MOCK_MODE=auto` usa Wavy Node live solo cuando están configurados API key y project id.
- `WAVY_NODE_CHAIN_ID=43114` corresponde al análisis Avalanche soportado por Wavy; ArkScore guarda la prueba resultante en Avalanche Fuji (`43113`).
- `WAVY_NODE_INTEGRATION_SECRET` verifica callbacks firmados de Wavy.
- `WAVY_NODE_INTEGRATION_USER_DATA_JSON` contiene los datos de compliance devueltos desde `GET /users/:foreignUserId`.
- `ARKSCORE_SUBJECT_HASH_SALT` permite guardar un `subjectHash` preservando privacidad, en lugar de publicar la wallet raw en Fuji.
- `ARKSCORE_SCORE_RATE_LIMIT_MAX` y `ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS` protegen el endpoint live de scoring.
- `FUJI_PRIVATE_KEY` despliega y administra el registry; `ARKSCORE_SCORER_PRIVATE_KEY` o `FUJI_SCORER_PRIVATE_KEY` se usan para `pnpm record:fuji` con una wallet scorer autorizada.

## Setup local

```bash
corepack enable
nvm use
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter @arkscore/api dev
pnpm --filter @arkscore/web dev
```

La web se compila como export estático de Next.js para Vercel. Las llamadas de scoring se hacen desde el navegador hacia la API en Railway.

## Verificación

```bash
pnpm --filter @arkscore/shared build
pnpm --filter @arkscore/api build
pnpm --filter @arkscore/contracts compile
pnpm --filter @arkscore/contracts test
pnpm --filter @arkscore/web build
pnpm -r lint
pnpm verify
pnpm verify:railway
pnpm audit:requirements
pnpm judge:demo
pnpm readiness
pnpm readiness:strict:record
pnpm probe:wavy
pnpm probe:fuji
pnpm smoke:web
pnpm verify:live
pnpm verify:railway:live
pnpm submission:evidence
pnpm submission:evidence:full
pnpm deploy:railway
pnpm record:fuji
pnpm finalize:live
pnpm finalize:live:apply
```

Usa Node.js 22.19.0. El repositorio fija Node 22 porque la ruta verificada de producción con Next.js 15 usa ese runtime.

Consulta `docs/READINESS_AUDIT.md` y `docs/REQUIREMENTS_TRACE.md` para el checklist de readiness y los puntos que dependen de credenciales live.

## Prueba demo en vivo (modo mock – 16 de mayo de 2026)

El tracker upstream de Wavy Node estaba fallando temporalmente con `tracker-service::analyze: fetch failed`, así que esta prueba usó intencionalmente el modo mock Wavy en el backend live de Railway. Aun así, el camino completo corrió end-to-end por API desplegada, contrato Fuji live, recibo de transacción y lectura on-chain.

- Hora de prueba: 16 de mayo de 2026 a las 10:13:38 PM America/Santiago (`2026-05-17T02:13:38Z`)
- API Railway: [`https://arkscore-api-production.up.railway.app`](https://arkscore-api-production.up.railway.app)
- Endpoint de score: [`/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool`](https://arkscore-api-production.up.railway.app/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?institution=bankaool)
- Wallet de prueba: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`
- Fuente: traza Wavy `mock` mientras el análisis upstream no está disponible
- Riesgo Wavy mock: `2/100` (`minimal`)
- Score compuesto: `100/100`
- Decisión: `APPROVE_BANKAOOL_LOAN`
- Subject hash: `0x32f3df1721bff1ad75a4ceb1be8a3df74f1ef10a68920cbcc861adf384135da6`
- Evidence hash: `0xc590063bfede4e2fc12a02ce437d43bd1182e7e070c7c9091b1bd5ff54ead0e4`
- Fuji `CreditScoreRegistry`: [`0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code)
- Transacción Fuji: [`0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2`](https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2)
- Bloque Fuji: `55449102`
- Artefacto recorder: `packages/contracts/deployments/fuji/LatestScoreRecord.json`

El recorder confirmó que `recordScore` fue enviado, Fuji devolvió receipt y `getScore(subjectHash)` coincidió con la respuesta de la API.

## Placeholders para entrega

- Demo en vivo: `https://arkscore-seven.vercel.app`
- Frontend Vercel: `https://arkscore-seven.vercel.app`
- Backend Railway: `https://arkscore-api-production.up.railway.app`
- Fuji `CreditScoreRegistry`: [`0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46`](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code) (verificado por Snowtrace API)
- Contrato demo eERC20 opcional: `TBD`

## Referencias

- Wavy Node docs: https://docs.wavynode.com
- Avalanche Fuji RPC: https://api.avax-test.network/ext/bc/C/rpc
- Ava Labs EncryptedERC: https://github.com/ava-labs/EncryptedERC
