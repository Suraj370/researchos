import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

import { getOpenAIClient, ANALYSIS_MODEL } from "./openai-client";

/**
 * Calls GPT-4.1 nano with a Zod-enforced JSON schema and returns the validated,
 * typed result. Shared by every activity that needs structured model output -
 * validation happens here once, not re-implemented per activity.
 */
export async function parseStructured<T extends z.ZodTypeAny>(
  schema: T,
  schemaName: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<z.infer<T>> {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.parse({
    model: ANALYSIS_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(schema, schemaName),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error(`OpenAI returned no parseable ${schemaName} response`);
  }
  return parsed as z.infer<T>;
}
