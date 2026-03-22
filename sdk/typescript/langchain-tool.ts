import { SynthmrClient } from "./index";

export function createSynthmrTools(client: SynthmrClient) {
  return {
    name: "synthmr_tools",
    description: "Tool-compatible wrappers for SynthMR Agent API",
    create_study: async (input: {
      ideaText: string;
      geography?: string;
      industry?: string | null;
      pricePoints: number[];
      targetAudience?: Record<string, unknown> | null;
    }) => client.createStudy(input),
    start_run: async (input: {
      studyId: string;
      sampleSize?: number;
      populationMode?: "general" | "audience_specific";
      populationSize?: number;
    }) =>
      client.startRun(input.studyId, {
        sampleSize: input.sampleSize,
        populationMode: input.populationMode,
        populationSize: input.populationSize,
      }),
    get_results: async (input: { runId: string }) => client.getResults(input.runId),
    chat_run: async (input: { runId: string; message: string }) => client.chatRun(input.runId, input.message),
  };
}
