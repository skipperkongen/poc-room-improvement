/**
 * Placeholders i IMAGE_PROMPT_TEMPLATE (env):
 * {{MALING}} — malingstekst eller tomt
 * {{OPRYDNING}} — oprydningstekst eller tomt
 * {{INDRETNING}} — indretningstekst eller tomt
 * {{BRUGER_CUSTOM}} — brugerens custom prompt (step 2)
 * {{CONSTRAINTS}} — indhold fra IMAGE_PROMPT_CONSTRAINTS (env)
 *
 * Ubrugte placeholders (fx ældre {{ONSKE}} i env) erstattes med tom streng.
 */

import {
  getImagePromptConstraints,
  getImagePromptTemplate,
} from "@/lib/server-config";
import { resolvePaintMalingLine } from "@/lib/wall-paint-palette";

export function applyImagePromptTemplate(vars: {
  maling: string;
  oprydning: string;
  indretning: string;
  brugerCustom: string;
}): string {
  const constraints = getImagePromptConstraints();
  let t = getImagePromptTemplate();
  const map: Record<string, string> = {
    MALING: vars.maling,
    OPRYDNING: vars.oprydning,
    INDRETNING: vars.indretning,
    BRUGER_CUSTOM: vars.brugerCustom,
    CONSTRAINTS: constraints,
  };
  for (const [key, val] of Object.entries(map)) {
    t = t.split(`{{${key}}}`).join(val);
  }
  return t.replace(/\{\{([A-Z_]+)\}\}/g, (_, name: string) => map[name] ?? "");
}

export function buildCategoryBlocks(spec: {
  enablePaint: boolean;
  paintColorId: string | null;
  enableCleanup: boolean;
  cleanupDescription: string;
  enableFurnishing: boolean;
  furnishingDescription: string;
}): { maling: string; oprydning: string; indretning: string } {
  const maling = resolvePaintMalingLine(spec.enablePaint, spec.paintColorId);

  const oprydning =
    spec.enableCleanup && spec.cleanupDescription.trim()
      ? spec.cleanupDescription.trim()
      : spec.enableCleanup
        ? "(Fjern generelt det der trækker indtrykket ned.)"
        : "(Ingen oprydning eller fjernelse af objekter.)";

  const indretning =
    spec.enableFurnishing && spec.furnishingDescription.trim()
      ? spec.furnishingDescription.trim()
      : spec.enableFurnishing
        ? "(Tilføj passende møbler og styling der løfter rummet.)"
        : "(Ingen tilføjelse af nye møbler eller genstande.)";

  return { maling, oprydning, indretning };
}
