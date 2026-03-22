import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: {
      title: "SynthMR Agent API",
      version: "1.0.0",
      description: "API-first access for creating studies, running simulations, fetching results, and run chat.",
    },
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
        CreateStudyRequest: {
          type: "object",
          required: ["ideaText", "pricePoints"],
          properties: {
            ideaText: { type: "string" },
            geography: { type: "string", default: "US" },
            industry: { type: "string", nullable: true },
            pricePoints: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
            targetAudience: { type: "object", nullable: true },
          },
          example: {
            ideaText: "AI pricing copilot for indie SaaS",
            geography: "US",
            industry: "SaaS",
            pricePoints: [19, 39, 79],
          },
        },
        StartRunRequest: {
          type: "object",
          properties: {
            sampleSize: { type: "integer", example: 250 },
            populationMode: { type: "string", enum: ["general", "audience_specific"] },
            populationSize: { type: "integer", example: 100000 },
          },
        },
        ChatRunRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", example: "What price should we test first?" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/api/v1/studies": {
        post: {
          summary: "Create study",
          description: "Create a new study for the authenticated API key owner.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateStudyRequest" },
                example: {
                  ideaText: "AI pricing copilot for indie SaaS",
                  geography: "US",
                  industry: "SaaS",
                  pricePoints: [19, 39, 79],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Study created",
              content: {
                "application/json": {
                  example: {
                    study: {
                      id: "cuid_study",
                      ideaText: "AI pricing copilot for indie SaaS",
                      geography: "US",
                      industry: "SaaS",
                      pricePoints: [19, 39, 79],
                      targetAudience: null,
                      status: "draft",
                      createdAt: "2026-03-09T00:00:00.000Z",
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
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
              content: {
                "application/json": {
                  example: {
                    id: "cuid_study",
                    ideaText: "AI pricing copilot for indie SaaS",
                    geography: "US",
                    industry: "SaaS",
                    pricePoints: [19, 39, 79],
                    targetAudience: null,
                    status: "draft",
                    createdAt: "2026-03-09T00:00:00.000Z",
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/studies/{id}/runs": {
        post: {
          summary: "Start run",
          description: "Queue a new run for a study. Returns run metadata and queue linkage.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StartRunRequest" },
                example: {
                  sampleSize: 250,
                  populationMode: "general",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Run started",
              content: {
                "application/json": {
                  example: {
                    run: {
                      id: "cuid_run",
                      studyId: "cuid_study",
                      status: "pending",
                      sampleSize: 250,
                    },
                  },
                },
              },
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
              content: {
                "application/json": {
                  example: {
                    id: "cuid_run",
                    studyId: "cuid_study",
                    status: "completed",
                    sampleSize: 250,
                    populationMode: "general",
                    populationSize: null,
                    audienceLabel: null,
                    jobId: "bull_job_123",
                    errorMessage: null,
                    createdAt: "2026-03-09T00:01:00.000Z",
                    startedAt: "2026-03-09T00:01:10.000Z",
                    finishedAt: "2026-03-09T00:02:15.000Z",
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/runs/{id}/results": {
        get: {
          summary: "Get run results",
          description: "Fetch aggregate results payload for a completed or limit_reached run.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Results payload",
              content: {
                "application/json": {
                  example: {
                    runId: "cuid_run",
                    results: {
                      wtpCurve: [{ price: 19, conversion: 0.67 }],
                      topSegments: [{ name: "Bootstrapped founders", share: 0.24 }],
                      objections: ["Too expensive for early teams"],
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/runs/{id}/chat": {
        post: {
          summary: "Chat about run results",
          description: "Ask follow-up questions against run context and aggregate outputs.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatRunRequest" },
                example: {
                  message: "What price point should we test first and why?",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Chat answer",
              content: {
                "application/json": {
                  example: {
                    answer: "From WTP_CURVE, $39 balances conversion and revenue best.",
                    citations: ["WTP_CURVE", "SEGMENTS (JSON)"],
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}
