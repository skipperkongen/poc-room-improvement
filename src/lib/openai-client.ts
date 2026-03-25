import OpenAI from "openai";

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY er ikke sat");
  }
  return new OpenAI({ apiKey: key });
}
