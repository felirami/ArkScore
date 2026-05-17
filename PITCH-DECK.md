# ArkScore Pitch Deck

## Slide 1: El dolor (retos reales de Arkangeles + Bankaool)

Arkangeles y Bankaool necesitan tomar decisiones de riesgo más rápido sin perder evidencia de cumplimiento.

- Arkangeles necesita evaluar inversionistas y acreditados antes de flujos de emisión de equity alineados con IFC.
- Bankaool necesita señales crediticias alternativas para clientes con poco historial y usuarios cripto.
- Hoy el riesgo de billetera, la trazabilidad de cumplimiento y la decisión crediticia viven en sistemas separados.
- Las instituciones necesitan evidencia demostrable: qué se evaluó, qué riesgo apareció, quién lo envió y dónde quedó guardada la decisión.

## Slide 2: Solución

ArkScore convierte el riesgo de billeteras de Wavy Node en una puntuación crediticia institucional explicable y guarda la evidencia en Avalanche Fuji.

- Entrada: una billetera EVM y contexto institucional.
- Salida: riesgo Wavy, puntuación compuesta ArkScore, categoría de decisión, hash del sujeto, hash de evidencia y prueba en registro en cadena.
- Diseñado para dos primeros flujos: evaluación IFC de Arkangeles y originación crediticia de Bankaool.

## Slide 3: Demo en vivo

- Interfaz web: [https://arkscore-seven.vercel.app](https://arkscore-seven.vercel.app)
- API en vivo: [https://arkscore-api-production.up.railway.app](https://arkscore-api-production.up.railway.app)
- OpenAPI: [https://arkscore-api-production.up.railway.app/openapi.json](https://arkscore-api-production.up.railway.app/openapi.json)
- Registro Fuji: [0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46](https://testnet.snowscan.xyz/address/0x0e5cbfCc8AB482C1e3995079f866654941b0Fd46#code)
- Transacción Fuji de prueba: [0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2](https://testnet.snowscan.xyz/tx/0xed2122d8b7f2845e50e4009f3decb6cab4a0701048acedb87dadb046e91608c2)
- Artefacto de prueba: `packages/contracts/deployments/fuji/LatestScoreRecord.json`

Resultado demo: la billetera `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` recibió riesgo Wavy simulado `2/100`, puntuación compuesta `100/100` y decisión `APROBAR CRÉDITO BANKAOOL`; la puntuación se escribió en el bloque Fuji `55449102` y fue verificada por lectura del contrato.

## Slide 4: Por qué Avalanche + privacidad eERC20

Avalanche da a ArkScore la capa de registro para prueba institucional, mientras eERC20 es la ruta de privacidad para futuros activos crediticios.

- Fuji registry entrega prueba pública y auditable de decisiones de puntuación sin exponer la billetera original en cadena.
- ArkScore guarda hash del sujeto, ID de análisis Wavy, hash de evidencia, riesgo, puntuación compuesta, decisión, institución, marca de tiempo y remitente.
- Avalanche es rápida y de bajo costo para pruebas institucionales por consulta.
- eERC20 / EncryptedERC es la siguiente capa: notas crediticias confidenciales o tokens de elegibilidad ligados a una puntuación sin revelar detalles sensibles del acreditado.

## Slide 5: Integración Wavy Node

ArkScore integra Wavy Node como fuente de riesgo y trazabilidad.

- El backend soporta registro de direcciones Wavy, creación de investigaciones y análisis de riesgo para Avalanche chain `43114`.
- La respuesta de la API preserva trazabilidad Wavy como dato de primera clase: proveedor, red, tipo de análisis, escala de riesgo, número de transacciones, patrones e ID de análisis.
- La prueba en Fuji guarda hash de evidencia Wavy e ID de análisis junto a la decisión institucional.
- La prueba actual de entrega está claramente marcada como simulada porque el rastreador de Wavy Node respondió `tracker-service::analyze: fetch failed`.
- El modo simulado es determinístico y con hash de evidencia, probando el flujo API-a-contrato mientras Wavy se recupera.

## Slide 6: Mercado y modelo de negocio

ArkScore es un SaaS de riesgo y puntuación crediticia por consulta para flujos fintech regulados.

- Compradores objetivo: plataformas de financiamiento, bancos digitales, mesas de crédito, emisores de activos tokenizados y equipos de cumplimiento.
- Modelo de cobro: por puntuación de billetera, por prueba en cadena y plan empresarial para umbrales/reportes personalizados.
- Expansión: reglas de decisión por institución, monitoreo recurrente, alertas webhook, puntuación por lote y tokens privados eERC20.
- Por qué ahora: las fintech de LatAm necesitan evaluación crediticia cripto-consciente con trazabilidad auditable de nivel institucional.

## Slide 7: Estado y próximos pasos

El MVP está en vivo y listo para conversaciones piloto.

- Entregado: interfaz web en Vercel, API Railway, contrato Fuji, código verificado, artefacto en cadena, scripts de readiness y README en español para jueces.
- Siguiente: volver a Wavy en vivo cuando el rastreador se recupere, correr `record:fuji` respaldado por Wavy real y redesplegar Vercel con variables públicas finales.
- Siguiente: desplegar contrato demo EncryptedERC / eERC20 y conectar la tarjeta de privacidad del dashboard.
- Siguiente: agregar configuración admin por institución para umbrales, scorers autorizados y exportes de reportes.

## Slide 8: Equipo / solicitud

ArkScore fue construido como producto hackathon enfocado: UX institucional, infraestructura funcionando y evidencia verificable.

- Producto: puntuación institucional para casos de uso de Arkangeles y Bankaool.
- Ingeniería: Next.js, API Express en Railway, adaptador Wavy Node, Hardhat, Solidity, Avalanche Fuji, wagmi, viem y verificación de hash de evidencia.
- Seguridad: sin secretos en artefactos, hashes de sujeto derivados por backend, escrituras autorizadas por scorer y validación de prueba con `generatedAt`.
- Solicitud: validar ArkScore como riel institucional de puntuación por consulta para crédito, inversión y cumplimiento en LatAm.
