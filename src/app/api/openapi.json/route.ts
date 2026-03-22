import { NextResponse } from "next/server";

/**
 * OpenAPI for SynthMR Agent API (API-key auth).
 *
 * This is intentionally explicit and example-rich so LLM tool callers can reliably
 * construct requests and parse results.
 */
export async function GET() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: {
      title: "SynthMR Agent API",
      version: "1.0.0",
      description:
        "API-first access for creating studies, starting runs, fetching results, and chatting about a run. Defaults are optimized for agent usage: runs default to general population unless an explicit targetAudience is provided and populationMode is set to audience_specific.",
    },
    servers: [{ url: "" }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Authorization: Bearer <API_KEY>",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          additionalProperties: false,
          required: ["error"],
          properties: { error: { type: "string" } },
        },

        TargetAudience: {
          type: "object",
          additionalProperties: true,
          required: ["label"],
          properties: {
            label: {
              type: "string",
              description:
                "Human-readable label. Use 'General population' (or omit targetAudience entirely) for the default broad mode.",
              example: "AI founders building a startup",
            },
            ageRange: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: { type: "integer" },
              description: "Inclusive [minAge, maxAge].",
              example: [22, 45],
            },
            incomeRange: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: { type: "integer" },
              description: "Inclusive [minAnnualIncomeUSD, maxAnnualIncomeUSD].",
              example: [60000, 250000],
            },
            education: {
              type: "array",
              items: { type: "string" },
              example: ["college", "graduate"],
            },
            employment: {
              type: "array",
              items: { type: "string" },
              example: ["founder", "self-employed"],
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional keyword hints used by the audience filter. Keep these broad to avoid over-filtering.",
              example: ["startup", "AI", "pricing", "B2B"],
            },
          },
        },

        CreateStudyRequest: {
          type: "object",
          additionalProperties: false,
          required: ["ideaText", "pricePoints"],
          properties: {
            ideaText: { type: "string", minLength: 1, maxLength: 10000 },
            geography: { type: "string", default: "US" },
            industry: { type: "string", nullable: true, maxLength: 200 },
            pricePoints: {
              type: "array",
              items: { type: "number" },
              minItems: 3,
              maxItems: 3,
              description:
                "Exactly 3 price points, in your chosen currency (assumed USD in current MVP).",
              example: [19, 39, 79],
            },
            targetAudience: {
              oneOf: [{ $ref: "#/components/schemas/TargetAudience" }, { type: "null" }],
              description:
                "Optional. If omitted or null, runs default to general population. If provided, you may request audience_specific sampling when starting a run.",
            },
          },
          example: {
            ideaText: "AI pricing copilot for indie SaaS",
            geography: "US",
            industry: "SaaS",
            pricePoints: [19, 39, 79],
            targetAudience: {
              label: "General population",
            },
          },
        },

        Study: {
          type: "object",
          additionalProperties: false,
          required: ["id", "ideaText", "geography", "industry", "pricePoints", "targetAudience", "status", "createdAt"],
          properties: {
            id: { type: "string" },
            ideaText: { type: "string" },
            geography: { type: "string" },
            industry: { type: "string", nullable: true },
            pricePoints: { type: "array", items: { type: "number" } },
            targetAudience: {
              description: "Raw JSON stored for the study; may be null.",
              nullable: true,
            },
            status: { type: "string" },
            createdAt: { type: "string", description: "ISO timestamp" },
          },
        },

        CreateStudyResponse: {
          type: "object",
          additionalProperties: false,
          required: ["study"],
          properties: { study: { $ref: "#/components/schemas/Study" } },
        },

        StartRunRequest: {
          type: "object",
          additionalProperties: false,
          properties: {
            sampleSize: {
              type: "integer",
              minimum: 100,
              maximum: 2000,
              default: 250,
              description:
                "Requested persona sample size. Server enforces plan + global caps.",
              example: 250,
            },
            populationMode: {
              type: "string",
              enum: ["general", "audience_specific"],
              description:
                "Default is general. If audience_specific is requested but the study has no meaningful targetAudience, server will fall back to general.",
              example: "general",
            },
            populationSize: {
              type: "integer",
              minimum: 10000,
              maximum: 500000,
              description:
                "Only used for audience_specific runs (size of the audience-matched pool).",
              example: 100000,
            },
          },
          example: { sampleSize: 250, populationMode: "general" },
        },

        Run: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "studyId",
            "status",
            "sampleSize",
            "populationMode",
            "populationSize",
            "audienceLabel",
            "jobId",
            "errorMessage",
            "createdAt",
            "startedAt",
            "finishedAt",
          ],
          properties: {
            id: { type: "string" },
            studyId: { type: "string" },
            status: {
              type: "string",
              description:
                "pending | generating_population | sampling | surveying | aggregating | completed | failed | limit_reached (may vary).",
            },
            sampleSize: { type: "integer" },
            populationMode: { type: "string" },
            populationSize: { type: "integer", nullable: true },
            audienceLabel: { type: "string", nullable: true },
            jobId: { type: "string", nullable: true },
            errorMessage: { type: "string", nullable: true },
            createdAt: { type: "string" },
            startedAt: { type: "string", nullable: true },
            finishedAt: { type: "string", nullable: true },
          },
        },

        CreateRunResponse: {
          type: "object",
          additionalProperties: false,
          required: ["run"],
          properties: { run: { $ref: "#/components/schemas/Run" } },
        },

        WtpCurvePoint: {
          type: "object",
          additionalProperties: false,
          required: ["price", "probability", "count"],
          properties: {
            price: { type: "number" },
            probability: { type: "number", minimum: 0, maximum: 1 },
            count: { type: "integer", minimum: 0 },
          },
        },

        Segment: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "name",
            "rules",
            "sizeEstimate",
            "purchaseProbabilityByPrice",
            "topObjections",
            "recommendedMessaging",
            "topSoulThemes",
          ],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            rules: { type: "object" },
            sizeEstimate: {
              type: "integer",
              description:
                "Estimated count in the modeled population (not a real-world panel).",
            },
            purchaseProbabilityByPrice: {
              type: "object",
              additionalProperties: { type: "number", minimum: 0, maximum: 1 },
              description: "Map like { '$19': 0.67, '$39': 0.42, '$79': 0.18 }",
            },
            topObjections: { type: "array", items: { type: "string" } },
            recommendedMessaging: { type: "string" },
            topSoulThemes: { type: "array", items: { type: "string" } },
          },
        },

        AggregatedResults: {
          type: "object",
          additionalProperties: true,
          required: ["wtpCurve", "segments", "topObjections", "nextExperiments"],
          properties: {
            wtpCurve: { type: "array", items: { $ref: "#/components/schemas/WtpCurvePoint" } },
            segments: { type: "array", items: { $ref: "#/components/schemas/Segment" } },
            topObjections: { type: "array", items: { type: "string" } },
            nextExperiments: { type: "array", items: { type: "string" } },
            metadata: {
              type: "object",
              description:
                "Additional run metadata (audience label, sample size, population method, etc.).",
            },
            limitations: {
              type: "array",
              items: { type: "string" },
              description:
                "Recommended: callers should display/echo these caveats when presenting results.",
            },
          },
          example: {
            wtpCurve: [
              { price: 19, probability: 0.62, count: 155 },
              { price: 39, probability: 0.41, count: 103 },
              { price: 79, probability: 0.18, count: 45 },
            ],
            segments: [
              {
                id: "seg_1",
                name: "Segment 1: 25-34, Q3, inconsistent pricing, twitter",
                rules: { ageBucket: "25-34", incomeQ: 3, painPoint: "inconsistent pricing", channel: "twitter" },
                sizeEstimate: 18000,
                purchaseProbabilityByPrice: { "$19": 0.7, "$39": 0.5, "$79": 0.2 },
                topObjections: ["too expensive", "already have a spreadsheet"],
                recommendedMessaging:
                  "Target 25-34 income Q3; emphasize solutions for 'inconsistent pricing'; reach via twitter.",
                topSoulThemes: ["fear of wasting time", "status via shipping"],
              },
            ],
            topObjections: ["too expensive", "not sure it works"],
            nextExperiments: ["Test price $39 in a follow-up study", "Address top objection in messaging"],
            metadata: {
              targetAudience: null,
              sampleSize: 250,
              populationMode: "general",
            },
            limitations: [
              "Synthetic results are directional signals, not ground truth.",
              "Validate key claims with real users before making irreversible decisions.",
            ],
          },
        },

        ResultsResponse: {
          type: "object",
          additionalProperties: false,
          required: ["runId", "results"],
          properties: {
            runId: { type: "string" },
            results: { $ref: "#/components/schemas/AggregatedResults" },
          },
        },

        ChatRunRequest: {
          type: "object",
          additionalProperties: false,
          required: ["message"],
          properties: {
            message: { type: "string", example: "What price should we test first and why?" },
          },
        },

        ChatRunResponse: {
          type: "object",
          additionalProperties: false,
          required: ["answer"],
          properties: {
            answer: { type: "string" },
            citations: { type: "array", items: { type: "string" } },
            structured: {
              type: "object",
              additionalProperties: true,
              description: "Optional structured payload for agent callers.",
            },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/api/v1/studies": {
        post: {
          summary: "Create study",
          description:
            "Create a new study. Runs default to general population unless a targetAudience is provided and an audience_specific run is requested.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateStudyRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Study created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateStudyResponse" },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },

      "/api/v1/studies/{id}": {
        get: {
          summary: "Get study",
          description: "Fetch study metadata by id. Ownership is enforced by API key user.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Study",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Study" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },

      "/api/v1/studies/{id}/runs": {
        post: {
          summary: "Start run",
          description:
            "Queue a new run for a study. Default is general population. If populationMode='audience_specific' is requested but the study has no meaningful targetAudience, the server falls back to general.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StartRunRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Run started",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRunResponse" } } },
            },
            "400": {
              description: "Bad request",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },

      "/api/v1/runs/{id}": {
        get: {
          summary: "Get run",
          description: "Fetch run status, timing, and metadata.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Run",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Run" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },

      "/api/v1/runs/{id}/results": {
        get: {
          summary: "Get run results",
          description:
            "Fetch aggregate results payload for a completed or limit_reached run.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Results payload",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ResultsResponse" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Not found or results not ready",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },

      "/api/v1/runs/{id}/chat": {
        post: {
          summary: "Chat about run results",
          description:
            "Ask follow-up questions against run context and aggregate outputs.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ChatRunRequest" } },
            },
          },
          responses: {
            "200": {
              description: "Chat answer",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ChatRunResponse" } } },
            },
            "400": {
              description: "Bad request",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
    },
  });
}
