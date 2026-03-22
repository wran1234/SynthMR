/**
 * Auto-generate survey from business idea. Output: JSON array of questions.
 * Default: 10 questions (6 MC, 2 open-ended, 2 pricing). FULL_SURVEY=true for 20.
 */

import { jsonrepair } from "jsonrepair";
import { chat, type LlmUsage } from "./llm";
import { z } from "zod";

const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "open_ended"]),
  text: z.string(),
  options: z.array(z.string()).optional(),
});

const SurveySchema = z.object({
  questions: z.array(QuestionSchema),
});

export type SurveyQuestion = z.infer<typeof QuestionSchema>;

function useFullSurvey(): boolean {
  return process.env.FULL_SURVEY === "true";
}

export type GenerateSurveyResult = { questions: SurveyQuestion[]; usage?: LlmUsage };

export async function generateSurvey(
  ideaText: string,
  industry?: string | null,
  targetAudience?: { label: string; ageRange?: [number, number]; incomeRange?: [number, number]; education?: string[]; employment?: string[] } | null
): Promise<GenerateSurveyResult> {
  const maxQuestions = useFullSurvey() ? 20 : 10;
  const mcCount = useFullSurvey() ? 14 : 6;
  const openCount = useFullSurvey() ? 3 : 2;
  const pricingCount = useFullSurvey() ? 3 : 2;

  const audienceBlock =
    targetAudience?.label && targetAudience.label.toLowerCase() !== "general population"
      ? `\nTarget audience: ${targetAudience.label}${targetAudience.ageRange ? ` (age ${targetAudience.ageRange[0]}-${targetAudience.ageRange[1]})` : ""}${targetAudience.incomeRange ? `, income $${targetAudience.incomeRange[0]}-$${targetAudience.incomeRange[1]}` : ""}${targetAudience.education?.length ? `, education: ${targetAudience.education.join(", ")}` : ""}${targetAudience.employment?.length ? `, employment: ${targetAudience.employment.join(", ")}` : ""}. Tailor all questions specifically to this audience's needs, problems, and behaviors.`
      : "";

  const prompt = `You are a market research expert. Generate a short survey to validate interest and fit for this business idea.

Business idea: ${ideaText}
${industry ? `Industry/category: ${industry}` : ""}${audienceBlock}

Rules:
- Output exactly a JSON object with a single key "questions" which is an array of question objects.
- Each question has: "id" (short string, e.g. "q1", "q2"), "type" ("multiple_choice" or "open_ended"), "text" (the question), and optionally "options" (array of strings, only for multiple_choice).
- Maximum ${maxQuestions} questions total: ${mcCount} multiple_choice, ${openCount} open_ended (max 1 sentence each), ${pricingCount} pricing/interest questions.
- Include: problem awareness, current alternatives, willingness to try, key concerns, pricing sensitivity.
- Output only valid JSON, no markdown or explanation.`;

  const result = await chat([{ role: "user", content: prompt }], { temperature: 0.5, maxTokens: 2048 });

  const raw = extractJson(result.content);
  const parsed = SurveySchema.parse(raw);
  return { questions: parsed.questions.slice(0, maxQuestions), usage: result.usage };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}") + 1;
  if (start === -1 || end <= start) throw new Error("No JSON object in response");
  let jsonStr = trimmed.slice(start, end).replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
  try {
    return JSON.parse(jsonStr);
  } catch {
    return JSON.parse(jsonrepair(jsonStr));
  }
}
