export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ArkScore API",
    version: "0.1.0",
    summary:
      "Wavy Node-backed wallet risk scoring for Arkangeles and Bankaool demos.",
    description:
      "ArkScore exposes a Railway-ready API that traces Avalanche wallet risk through Wavy Node, computes a composite institutional credit score, and returns the evidence hash stored by the Avalanche Fuji on-chain registry.",
  },
  servers: [
    {
      url: "https://your-railway-api.up.railway.app",
      description: "Railway production URL placeholder",
    },
    {
      url: "http://localhost:4000",
      description: "Local development server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Readiness checks for Railway and live deployment gates.",
    },
    {
      name: "Scoring",
      description:
        "Wavy Node traceability and AI risk scoring for wallet underwriting.",
    },
    {
      name: "Wavy Node Integration",
      description:
        "Signed Wavy Node callbacks for compliance user data and alerts.",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        operationId: "getHealth",
        summary: "Check API readiness and Wavy credential mode.",
        responses: {
          "200": {
            description: "Service readiness state.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/score/{address}": {
      get: {
        tags: ["Scoring"],
        operationId: "scoreWallet",
        summary: "Fetch Wavy Node wallet risk and ArkScore credit decision.",
        description:
          "Returns a Wavy Node-compatible risk score, composite credit score, institutional recommendation, subject hash, and evidence hash. The subject hash lets ArkScore store score evidence on Fuji without putting the raw wallet address in contract calldata or events.",
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            description:
              "EVM wallet address to score through Wavy Node on Avalanche.",
            schema: {
              type: "string",
              pattern: "^0x[a-fA-F0-9]{40}$",
              example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            },
          },
          {
            name: "institution",
            in: "query",
            required: false,
            description:
              "Institutional decision profile. Defaults to Arkangeles when omitted.",
            schema: {
              $ref: "#/components/schemas/Institution",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Wallet score, Wavy traceability result, composite decision, and evidence hash.",
            headers: {
              "Cache-Control": {
                description:
                  "Always `no-store, max-age=0` because score responses include wallet-derived risk evidence.",
                schema: {
                  type: "string",
                  example: "no-store, max-age=0",
                },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ScoreApiResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid wallet address or institution query.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "404": {
            description:
              "Wavy Node returned no risk result for the requested wallet.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "429": {
            description:
              "Too many score requests from the same client in the configured rate-limit window.",
            headers: {
              "Retry-After": {
                description:
                  "Seconds to wait before the client should retry scoring.",
                schema: {
                  type: "string",
                  example: "60",
                },
              },
              "RateLimit-Limit": {
                description:
                  "Maximum score requests allowed in the current window.",
                schema: {
                  type: "string",
                  example: "120",
                },
              },
              "RateLimit-Remaining": {
                description: "Remaining score requests in the current window.",
                schema: {
                  type: "string",
                  example: "0",
                },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "502": {
            description: "Wavy Node request failed in live mode.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "504": {
            description: "Wavy Node request timed out in live mode.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Unexpected API failure.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/users/{foreignUserId}": {
      get: {
        tags: ["Wavy Node Integration"],
        operationId: "getWavyIntegrationUser",
        summary: "Return compliance user data to Wavy Node.",
        description:
          "Wavy Node calls this signed route when it needs the user data linked to a monitored wallet foreign_user_id for compliance checks and report generation.",
        parameters: [
          {
            name: "foreignUserId",
            in: "path",
            required: true,
            description:
              "ArkScore foreign user id registered with Wavy Node for the monitored wallet.",
            schema: {
              type: "string",
              example:
                "arkscore-wallet-0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            },
          },
          {
            name: "x-wavynode-hmac",
            in: "header",
            required: true,
            description: "Base64 HMAC-SHA256 signature from Wavy Node.",
            schema: {
              type: "string",
            },
          },
          {
            name: "x-wavynode-timestamp",
            in: "header",
            required: true,
            description:
              "Request timestamp in milliseconds used for replay protection.",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Compliance user data JSON configured for the Wavy Node project.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WavyIntegrationUserData",
                },
              },
            },
          },
          "401": {
            description: "Missing, expired, or invalid Wavy Node signature.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "404": {
            description:
              "The requested foreign_user_id does not match ArkScore wallet registration.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "503": {
            description:
              "Wavy Node integration secret or user data is not configured.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/webhook": {
      post: {
        tags: ["Wavy Node Integration"],
        operationId: "receiveWavyWebhook",
        summary: "Receive signed Wavy Node compliance alerts.",
        description:
          "Wavy Node calls this signed route with real-time suspicious activity notifications or integration errors.",
        parameters: [
          {
            name: "x-wavynode-hmac",
            in: "header",
            required: true,
            description: "Base64 HMAC-SHA256 signature from Wavy Node.",
            schema: {
              type: "string",
            },
          },
          {
            name: "x-wavynode-timestamp",
            in: "header",
            required: true,
            description:
              "Request timestamp in milliseconds used for replay protection.",
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/WavyWebhookPayload",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Webhook accepted.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WavyWebhookAcknowledgement",
                },
              },
            },
          },
          "400": {
            description: "Invalid Wavy Node webhook payload.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "401": {
            description: "Missing, expired, or invalid Wavy Node signature.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "503": {
            description: "Wavy Node integration secret is not configured.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        required: [
          "ok",
          "service",
          "wavyCredentialsConfigured",
          "wavyIntegrationConfigured",
          "wavyChainId",
          "registryChainId",
          "subjectHashSaltConfigured",
          "mockMode",
        ],
        properties: {
          ok: {
            type: "boolean",
            example: true,
          },
          service: {
            type: "string",
            example: "arkscore-api",
          },
          wavyCredentialsConfigured: {
            type: "boolean",
            description:
              "True when WAVY_NODE_API_KEY and WAVY_NODE_PROJECT_ID are configured.",
          },
          wavyIntegrationConfigured: {
            type: "boolean",
            description:
              "True when the signed Wavy Node callback secret and compliance user data JSON are configured.",
          },
          wavyChainId: {
            type: "integer",
            enum: [43114],
            description:
              "Avalanche mainnet chain id used for Wavy Node wallet-risk analysis.",
            example: 43114,
          },
          registryChainId: {
            type: "integer",
            enum: [43113],
            description:
              "Avalanche Fuji chain id used by the on-chain score registry.",
            example: 43113,
          },
          subjectHashSaltConfigured: {
            type: "boolean",
            description:
              "True when ARKSCORE_SUBJECT_HASH_SALT is set to a production value instead of the demo default.",
          },
          mockMode: {
            type: "boolean",
            description:
              "True when the API is returning deterministic demo traces instead of live Wavy Node results.",
          },
        },
      },
      WavyIntegrationUserData: {
        type: "object",
        additionalProperties: true,
        required: ["foreign_user_id"],
        properties: {
          foreign_user_id: {
            type: "string",
            description:
              "The foreign user id originally registered with Wavy Node for the monitored address.",
            example:
              "arkscore-wallet-0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          },
        },
      },
      WavyWebhookPayload: {
        type: "object",
        required: ["type", "data"],
        properties: {
          type: {
            type: "string",
            enum: ["notification", "error"],
          },
          data: {
            description:
              "Wavy Node notification payload or error message for the integration.",
          },
        },
      },
      WavyWebhookAcknowledgement: {
        type: "object",
        required: ["received", "type"],
        properties: {
          received: {
            type: "boolean",
            enum: [true],
          },
          type: {
            type: "string",
            enum: ["notification", "error"],
          },
        },
      },
      Institution: {
        type: "string",
        enum: ["arkangeles", "bankaool"],
        example: "bankaool",
      },
      InstitutionDecision: {
        type: "string",
        enum: [
          "APPROVE_IFC_EQUITY_ISSUANCE",
          "APPROVE_BANKAOOL_LOAN",
          "REVIEW_REQUIRED",
          "DECLINE",
        ],
        example: "APPROVE_BANKAOOL_LOAN",
      },
      RiskLevel: {
        type: "string",
        enum: ["verified", "minimal", "low", "medium", "high", "critical"],
        example: "low",
      },
      ScoreSource: {
        type: "string",
        enum: ["wavy", "mock"],
        description:
          "mock is used only for demos when Wavy Node credentials are not configured.",
      },
      PatternDetected: {
        type: "object",
        required: ["name", "severity"],
        properties: {
          name: {
            type: "string",
            example: "counterparty concentration",
          },
          severity: {
            type: "string",
            example: "medium",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            example: 0.74,
          },
        },
      },
      WavyTraceability: {
        type: "object",
        required: [
          "provider",
          "network",
          "scanType",
          "riskScoreScale",
          "addressRegistration",
          "transactionsAnalyzed",
          "patternsCount",
          "completedAt",
        ],
        properties: {
          provider: {
            type: "string",
            enum: ["Wavy Node"],
            description: "Traceability provider used for wallet risk scoring.",
          },
          network: {
            type: "string",
            example: "Avalanche Fuji",
          },
          scanType: {
            type: "string",
            enum: ["wallet-risk"],
            description:
              "ArkScore uses Wavy Node wallet risk traceability for the requested address.",
          },
          riskScoreScale: {
            type: "string",
            enum: ["0-100"],
            description:
              "Explicit Wavy Node AI risk score scale where 100 is highest risk.",
          },
          addressRegistration: {
            type: "string",
            enum: ["auto-registered-or-reused", "preconfigured", "demo"],
            description:
              "How the wallet was made available to the Wavy Node project before scan-risk.",
          },
          transactionsAnalyzed: {
            type: "integer",
            minimum: 0,
            example: 184,
          },
          patternsCount: {
            type: "integer",
            minimum: 0,
            example: 2,
          },
          completedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      WavyRiskResult: {
        type: "object",
        required: [
          "analysisId",
          "address",
          "chainId",
          "riskScore",
          "riskLevel",
          "riskReason",
          "suspiciousActivity",
          "patternsDetected",
          "transactionsAnalyzed",
          "completedAt",
          "traceability",
        ],
        properties: {
          analysisId: {
            type: "string",
            example: "wavy-20260516-001",
          },
          address: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
          },
          chainId: {
            type: "integer",
            example: 43114,
          },
          riskScore: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "Wavy Node AI risk score where 100 is highest risk.",
            example: 24,
          },
          riskLevel: {
            $ref: "#/components/schemas/RiskLevel",
          },
          riskReason: {
            type: "string",
            example:
              "Trace shows routine wallet behavior with no critical risk patterns.",
          },
          suspiciousActivity: {
            type: "boolean",
            example: false,
          },
          patternsDetected: {
            type: "array",
            items: {
              $ref: "#/components/schemas/PatternDetected",
            },
          },
          transactionsAnalyzed: {
            type: "integer",
            minimum: 0,
            example: 184,
          },
          completedAt: {
            type: "string",
            format: "date-time",
          },
          traceability: {
            $ref: "#/components/schemas/WavyTraceability",
          },
        },
      },
      CompositeScore: {
        type: "object",
        required: [
          "creditScore",
          "decision",
          "decisionLabel",
          "recommendation",
        ],
        properties: {
          creditScore: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description:
              "ArkScore composite score derived from Wavy risk, traceability, suspicious activity, and institutional policy.",
            example: 82,
          },
          decision: {
            $ref: "#/components/schemas/InstitutionDecision",
          },
          decisionLabel: {
            type: "string",
            example: "Approve Bankaool loan",
          },
          recommendation: {
            type: "string",
            example:
              "Bankaool can proceed to loan terms while retaining the on-chain score record for audit.",
          },
        },
      },
      ScoreApiResponse: {
        type: "object",
        required: [
          "address",
          "subjectHash",
          "chainId",
          "institution",
          "source",
          "generatedAt",
          "evidenceHash",
          "wavy",
          "composite",
        ],
        properties: {
          address: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
          },
          subjectHash: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{64}$",
            description:
              "Privacy-preserving wallet subject identifier used as the Fuji registry key.",
          },
          chainId: {
            type: "integer",
            example: 43114,
          },
          institution: {
            $ref: "#/components/schemas/Institution",
          },
          source: {
            $ref: "#/components/schemas/ScoreSource",
          },
          generatedAt: {
            type: "string",
            format: "date-time",
            description:
              "Server-side timestamp used by final verification and Fuji recording to reject replayed score responses.",
          },
          evidenceHash: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{64}$",
            description:
              "Hash over wallet, subject hash, Wavy trace, composite score, source, institution, and generatedAt for on-chain registry audit.",
          },
          wavy: {
            $ref: "#/components/schemas/WavyRiskResult",
          },
          composite: {
            $ref: "#/components/schemas/CompositeScore",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
          },
          details: {
            type: "array",
            items: {
              type: "string",
            },
          },
          statusCode: {
            type: "integer",
          },
        },
      },
    },
  },
} as const;

export function createOpenApiDocument(serverUrl?: string) {
  const currentServer = normalizeServerUrl(serverUrl);
  const servers = currentServer
    ? [
        {
          url: currentServer,
          description: "Current API origin",
        },
        ...openApiDocument.servers.filter(
          (server) => normalizeServerUrl(server.url) !== currentServer,
        ),
      ]
    : openApiDocument.servers;

  return {
    ...openApiDocument,
    servers,
  };
}

function normalizeServerUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
}
