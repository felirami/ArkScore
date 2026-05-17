# ArkScore Pitch Deck

## Slide 1: El dolor (retos reales de Arkangeles + Bankaool)

Arkangeles y Bankaool necesitan tomar decisiones de riesgo más rápido sin perder evidencia de compliance.

- Arkangeles necesita evaluar inversionistas y acreditados antes de flujos de emisión de equity alineados con IFC.
- Bankaool necesita señales crediticias alternativas para clientes thin-file y crypto-native.
- Hoy el riesgo de wallet, la trazabilidad compliance y la decisión de underwriting viven en sistemas separados.
- Las instituciones necesitan evidencia demostrable: qué se evaluó, qué riesgo apareció, quién lo envió y dónde quedó guardada la decisión.

## Slide 2: Solución (one-liner de ArkScore)

ArkScore convierte el riesgo de wallets de Wavy Node en un score crediticio institucional explicable y guarda la evidencia en Avalanche Fuji.

- Input: una wallet EVM y contexto institucional.
- Output: score de riesgo Wavy, score compuesto ArkScore, bucket de decisión, subject hash, evidence hash y prueba en registro on-chain.
- Diseñado para dos primeros flujos: screening IFC de Arkangeles y underwriting crediticio de Bankaool.

## Slide 3: Demo live (links + evidencia)

- Frontend en vivo: [https://arkscore-seven.vercel.app](https://arkscore-seven.vercel.app)
- Backend en vivo: [https://arkscore-api-production.up.railway.app](https://arkscore-api-production.up.railway.app)
- OpenAPI: [https://arkscore-api-production.up.railway.app/openapi.json](https://arkscore-api-production.up.railway.app/openapi.json)
- Fuji registry: [0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code)
- Transacción Fuji de prueba: [0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2](https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2)
- Artefacto de prueba: `packages/contracts/deployments/fuji/LatestScoreRecord.json`

Resultado demo: la wallet `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` recibió riesgo Wavy mock `2/100`, score compuesto `100/100` y decisión `APPROVE_BANKAOOL_LOAN`; el score se escribió en el bloque Fuji `55449102` y fue verificado por readback.

## Slide 4: Por qué Avalanche + privacidad eERC20

Avalanche da a ArkScore la capa de settlement para prueba institucional, mientras eERC20 es la ruta de privacidad para futuros activos crediticios.

- Fuji registry entrega prueba pública y auditable de decisiones de scoring sin exponer la wallet original on-chain.
- ArkScore guarda `subjectHash`, Wavy analysis id, evidence hash, risk score, composite score, decisión, institución, timestamp y submitter.
- Avalanche es rápida y de bajo costo para pruebas institucionales por consulta.
- eERC20 / EncryptedERC es la siguiente capa: notas crediticias confidenciales o eligibility tokens ligados a un score sin revelar detalles sensibles del acreditado.

## Slide 5: Integración Wavy Node

ArkScore integra Wavy Node como fuente de riesgo y trazabilidad.

- El backend soporta registro de direcciones Wavy, creación de investigaciones y `scan-risk` para Avalanche chain `43114`.
- La respuesta de la API preserva trazabilidad Wavy como dato de primera clase: provider, network, scan type, escala de riesgo, número de transacciones, patrones e analysis id.
- La prueba en Fuji guarda Wavy evidence hash y analysis id junto a la decisión institucional.
- La prueba actual de entrega está claramente marcada como modo mock porque el tracker upstream de Wavy Node respondió `tracker-service::analyze: fetch failed`.
- El modo mock es determinístico y evidence-hashed, probando el flujo API-a-contrato mientras Wavy upstream se recupera.

## Slide 6: Mercado y modelo de negocio (SaaS por consulta)

ArkScore es un SaaS de riesgo y scoring crediticio por consulta para flujos fintech regulados.

- Compradores objetivo: plataformas de crowdfunding, bancos digitales, lending desks, emisores de activos tokenizados y equipos de compliance.
- Pricing: por wallet score, por prueba on-chain y plan enterprise para thresholds/reportes personalizados.
- Expansión: reglas de decisión por institución, monitoreo recurrente, alertas webhook, batch scoring y eligibility tokens privados eERC20.
- Por qué ahora: las fintechs de LatAm necesitan underwriting crypto-aware, pero también audit trails de grado compliance.

## Slide 7: Estado y próximos pasos

El MVP está live y listo para conversaciones piloto.

- Shipped: frontend Vercel, API Railway, contrato Fuji, source verificado, artefacto on-chain, scripts de readiness y README para jueces en español.
- Siguiente: volver a modo Wavy live cuando tracker-service se recupere, correr un `record:fuji` respaldado por Wavy live y redeployar Vercel con env pública final.
- Siguiente: desplegar contrato demo EncryptedERC / eERC20 y conectar la tarjeta de privacidad del dashboard.
- Siguiente: agregar settings admin por institución para thresholds, scorers autorizados y exportes de reportes.

## Slide 8: Equipo

ArkScore fue construido como producto hackathon enfocado: UX institucional, infraestructura funcionando y evidencia verificable.

- Producto: scoring institucional para casos de uso de Arkangeles y Bankaool.
- Ingeniería: Next.js, Railway Express API, Wavy Node adapter, Hardhat, Solidity, Avalanche Fuji, wagmi, viem y verificación de evidence-hash.
- Seguridad: sin secretos en artefactos, subject hashes derivados por backend, escrituras autorizadas por scorer y proof validation con `generatedAt`.
- Postura de entrega: transparencia sobre el estado upstream de Wavy, con flujo API-a-Fuji live y reproducible.
