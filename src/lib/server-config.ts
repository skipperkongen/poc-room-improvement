/**
 * Påkrævede miljøvariabler (ingen defaults i koden).
 * Fejl kastes ved første brug, så API returnerer 500 med besked.
 */
export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`${name} er ikke sat`);
  }
  return v;
}

export function getOpenAIModel(): string {
  return requireEnv("OPENAI_MODEL");
}

export function getReplicateImageModel(): string {
  return requireEnv("REPLICATE_IMAGE_MODEL");
}

export function getImagePromptTemplate(): string {
  return requireEnv("IMAGE_PROMPT_TEMPLATE");
}

export function getImagePromptConstraints(): string {
  return requireEnv("IMAGE_PROMPT_CONSTRAINTS");
}
