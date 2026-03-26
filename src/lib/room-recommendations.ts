import { z } from "zod";

/** GPT output: analyse af rum + anbefalinger pr. kategori */
export const roomAnalysisSchema = z.object({
  roomName: z.string().min(1).describe("Kort navn på rummet, bruges som titel og filnavn"),
  paint: z.object({
    necessary: z.boolean(),
    recommendation: z.string(),
  }),
  cleanup: z.object({
    necessary: z.boolean(),
    recommendation: z.string(),
  }),
  furnishing: z.object({
    necessary: z.boolean(),
    recommendation: z.string(),
  }),
});

export type RoomAnalysis = z.infer<typeof roomAnalysisSchema>;

/** Brugerens valg i step 2 — hvad der sendes til billedgenerering */
export const generationSpecSchema = z.object({
  roomName: z.string().min(1),
  enablePaint: z.boolean(),
  enableCleanup: z.boolean(),
  enableFurnishing: z.boolean(),
  /** Valgt farve fra paletten; null når maling er slået fra */
  paintColorId: z.string().nullable(),
  cleanupDescription: z.string(),
  furnishingDescription: z.string(),
  customPrompt: z.string(),
});

export type GenerationSpec = z.infer<typeof generationSpecSchema>;
