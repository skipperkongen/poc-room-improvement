/**
 * Kompakt palet (max 16): populære nordiske kategorier — hvid/off-white, greige, salvie,
 * blågrå og varme toner. Navne er beskrivende (ikke producentnavne).
 */

export type WallPaintColor = {
  id: string;
  name: string;
  /** Normaliseret til #RRGGBB */
  hex: string;
  family: string;
};

function normHex(h: string): string {
  const x = h.trim().replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(x)) throw new Error(`Invalid hex: ${h}`);
  return `#${x}`;
}

/**
 * Rækkefølge: kategori for kategori (lettest at scanne).
 * Max 16 farver — dækker de mest brugte bolig-trends.
 */
export const WALL_PAINT_PALETTE: WallPaintColor[] = [
  // Hvid og off-white (3)
  { id: "nordic-linen", name: "Nordisk hør", hex: normHex("#F4F4F1"), family: "Hvid og off-white" },
  { id: "warm-pearl", name: "Varm perle", hex: normHex("#E5E4D7"), family: "Hvid og off-white" },
  { id: "warm-stone", name: "Varm sten", hex: normHex("#E2DDD1"), family: "Hvid og off-white" },

  // Greige og sand (3)
  { id: "mist-grey", name: "Tågegrå", hex: normHex("#D1D3D1"), family: "Greige og sand" },
  { id: "urban-taupe", name: "Urban taupe", hex: normHex("#C6C2B8"), family: "Greige og sand" },
  { id: "coastal-sand", name: "Kystsand", hex: normHex("#D9D2C2"), family: "Greige og sand" },

  // Salvie og grøn (4)
  { id: "frosted-mint", name: "Frossen mint", hex: normHex("#D2DDD0"), family: "Salvie og grøn" },
  { id: "silver-sage", name: "Sølv salvie", hex: normHex("#C6CCB9"), family: "Salvie og grøn" },
  { id: "sage-muted", name: "Dæmpet salvie", hex: normHex("#B0B5AD"), family: "Salvie og grøn" },
  { id: "deep-olive", name: "Dyb oliven", hex: normHex("#848373"), family: "Salvie og grøn" },

  // Blå og blågrå (3)
  { id: "misty-morning-blue", name: "Diset morgenblå", hex: normHex("#DEE3E8"), family: "Blå og blågrå" },
  { id: "hazy-blue", name: "Diset blå", hex: normHex("#C1C9CD"), family: "Blå og blågrå" },
  { id: "nordic-slate", name: "Nordisk skifer", hex: normHex("#758E9C"), family: "Blå og blågrå" },

  // Varme toner (3)
  { id: "soft-blush", name: "Blød blush", hex: normHex("#E2C8C7"), family: "Varme toner" },
  { id: "sunset-clay", name: "Solnedgangsler", hex: normHex("#C9B2AB"), family: "Varme toner" },
  { id: "rustic-terracotta", name: "Rustik terrakotta", hex: normHex("#995C53"), family: "Varme toner" },
];

const byId = new Map(WALL_PAINT_PALETTE.map((c) => [c.id, c]));

export function getWallPaintColorById(id: string): WallPaintColor | undefined {
  return byId.get(id);
}

/** Standardvalg når bruger går til trin 2 */
export const DEFAULT_WALL_PAINT_ID = "warm-stone";

/**
 * Tekst der indsættes i {{MALING}} — skal altid nævne både beskrivende navn og hex når maling er aktiv.
 */
export function resolvePaintMalingLine(
  enablePaint: boolean,
  paintColorId: string | null | undefined,
): string {
  if (!enablePaint) {
    return "(Ingen ændring af vægfarve.)";
  }
  if (!paintColorId) {
    return "(Ingen farve valgt — vælg en farve til væggen.)";
  }
  const c = getWallPaintColorById(paintColorId);
  if (!c) {
    return "(Ugyldig farve — vælg en farve til væggen.)";
  }
  return `Væggene skal være malet i farven «${c.name}», hex-kode ${c.hex}.`;
}
