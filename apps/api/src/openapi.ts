export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ArkScore API",
    version: "0.1.0",
    summary:
      "Wavy Node-backed wallet risk scoring for Arkangeles and Bankaool demos.",
    description:
      "ArkScore exposes a Railway-ready API that traces Avalanche Fuji wallet risk through Wavy Node, computes a composite institutional credit score, and returns the evidence hash used by the on-chain registry.",
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
            description: "EVM wallet address to score on Avalanche Fuji.",
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
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["ok", "service", "wavyCredentialsConfigured", "mockMode"],
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
          mockMode: {
            type: "boolean",
            description:
              "True when the API is returning deterministic demo traces instead of live Wavy Node results.",
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
      WavyRiskResult: {
        type: "object",
        required: [
          "analysisId",
          "address",
          "subjectHash",
          "chainId",
          "riskScore",
          "riskLevel",
          "riskReason",
          "suspiciousActivity",
          "patternsDetected",
          "transactionsAnalyzed",
          "completedAt",
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
          subjectHash: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{64}$",
            description:
              "Privacy-preserving wallet subject identifier used as the Fuji registry key.",
          },
          chainId: {
            type: "integer",
            example: 43113,
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
          chainId: {
            type: "integer",
            example: 43113,
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
          },
          evidenceHash: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{64}$",
            description:
              "Hash over wallet, subject hash, Wavy trace, composite score, source, and institution for on-chain registry audit.",
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
