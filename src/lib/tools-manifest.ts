export type ToolDefinition = {
  name: string;
  description: string;
  requiredScopes: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "create_study",
    description: "Create a new study owned by the API key user.",
    requiredScopes: ["studies:write"],
    inputSchema: {
      type: "object",
      required: ["ideaText", "pricePoints"],
      properties: {
        ideaText: { type: "string" },
        geography: { type: "string", default: "US" },
        industry: { type: "string", nullable: true },
        pricePoints: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
        targetAudience: { type: "object", nullable: true },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        study: {
          type: "object",
          properties: {
            id: { type: "string" },
            ideaText: { type: "string" },
            geography: { type: "string" },
            industry: { type: "string", nullable: true },
            pricePoints: { type: "array", items: { type: "number" } },
            targetAudience: { type: "object", nullable: true },
            status: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  {
    name: "get_study",
    description: "Fetch study details by id.",
    requiredScopes: ["studies:read"],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        ideaText: { type: "string" },
        geography: { type: "string" },
        industry: { type: "string", nullable: true },
        pricePoints: { type: "array", items: { type: "number" } },
        targetAudience: { type: "object", nullable: true },
        status: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
      },
    },
  },
  {
    name: "start_run",
    description: "Start a run for an existing study.",
    requiredScopes: ["runs:write"],
    inputSchema: {
      type: "object",
      required: ["studyId"],
      properties: {
        studyId: { type: "string" },
        sampleSize: { type: "integer", minimum: 100, maximum: 2000 },
        populationMode: { type: "string", enum: ["general", "audience_specific"] },
        populationSize: { type: "integer", minimum: 10000, maximum: 500000 },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        run: {
          type: "object",
          properties: {
            id: { type: "string" },
            studyId: { type: "string" },
            status: { type: "string" },
            sampleSize: { type: "integer" },
            populationMode: { type: "string" },
            populationSize: { type: "integer", nullable: true },
            audienceLabel: { type: "string", nullable: true },
            jobId: { type: "string", nullable: true },
            errorMessage: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            startedAt: { type: "string", nullable: true, format: "date-time" },
            finishedAt: { type: "string", nullable: true, format: "date-time" },
          },
        },
      },
    },
  },
  {
    name: "get_run",
    description: "Get run status and metadata.",
    requiredScopes: ["runs:read"],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        studyId: { type: "string" },
        status: { type: "string" },
        sampleSize: { type: "integer" },
        populationMode: { type: "string" },
        populationSize: { type: "integer", nullable: true },
        audienceLabel: { type: "string", nullable: true },
        jobId: { type: "string", nullable: true },
        errorMessage: { type: "string", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        startedAt: { type: "string", nullable: true, format: "date-time" },
        finishedAt: { type: "string", nullable: true, format: "date-time" },
      },
    },
  },
  {
    name: "get_results",
    description: "Get aggregate results for a completed run.",
    requiredScopes: ["results:read"],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        results: { type: "object" },
      },
    },
  },
  {
    name: "chat_run",
    description: "Ask follow-up questions against run results.",
    requiredScopes: ["chat:write"],
    inputSchema: {
      type: "object",
      required: ["id", "message"],
      properties: {
        id: { type: "string" },
        message: { type: "string", minLength: 1, maxLength: 8000 },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        answer: { type: "string" },
        citations: { type: "array", items: { type: "string" } },
        structured: { type: "object" },
      },
    },
  },
];

