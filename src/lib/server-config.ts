import fs from "fs";
import path from "path";

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

let cachedImagePromptTemplate: string | null = null;
let cachedImagePromptConstraints: string | null = null;

function readRequiredPromptFile(fullPath: string, label: string): string {
  const raw = fs.readFileSync(fullPath, "utf8").trim();
  if (!raw) {
    throw new Error(`${label} er tom eller findes ikke`);
  }
  return raw;
}

export function getImagePromptTemplate(): string {
  if (cachedImagePromptTemplate === null) {
    const full = path.join(
      process.cwd(),
      "prompts",
      "image-prompt-template.txt",
    );
    cachedImagePromptTemplate = readRequiredPromptFile(
      full,
      "prompts/image-prompt-template.txt",
    );
  }
  return cachedImagePromptTemplate;
}

export function getImagePromptConstraints(): string {
  if (cachedImagePromptConstraints === null) {
    const full = path.join(
      process.cwd(),
      "prompts",
      "image-prompt-constraints.txt",
    );
    cachedImagePromptConstraints = readRequiredPromptFile(
      full,
      "prompts/image-prompt-constraints.txt",
    );
  }
  return cachedImagePromptConstraints;
}
