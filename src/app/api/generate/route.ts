import { NextResponse } from "next/server";
import Replicate, { type Prediction } from "replicate";
import { applyImagePromptTemplate, buildCategoryBlocks } from "@/lib/prompt-template";
import { getReplicateImageModel } from "@/lib/server-config";
import { generationSpecSchema } from "@/lib/room-recommendations";
import { nearestReplicateAspectRatio } from "@/lib/aspect-ratio";
import { getWallPaintColorById } from "@/lib/wall-paint-palette";

export const runtime = "nodejs";
/** Lang billedgenerering + Replicate long-poll; skal overstige platform default (~60s). */
export const maxDuration = 600;

function formatReplicateError(e: unknown, last: Prediction | null): string {
  const base = e instanceof Error ? e.message : "Ukendt fejl";
  if (!last) return base;
  const err = last.error;
  const errPart =
    err != null && String(err).trim() !== ""
      ? typeof err === "string"
        ? err
        : JSON.stringify(err)
      : "";
  const logs = last.logs?.trim();
  if (errPart) return `${base} — ${errPart}`;
  if (logs) return `${base} — logs: ${logs.slice(-2500)}`;
  return base;
}

export async function POST(request: Request) {
  let lastPrediction: Prediction | null = null;
  try {
    const token = process.env.REPLICATE_API_KEY;
    if (!token) {
      return NextResponse.json({ error: "REPLICATE_API_KEY er ikke sat" }, { status: 500 });
    }

    const model = getReplicateImageModel();

    const formData = await request.formData();
    const file = formData.get("image");
    const specRaw = formData.get("spec");
    const widthStr = formData.get("width");
    const heightStr = formData.get("height");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Manglende billede" }, { status: 400 });
    }
    if (typeof specRaw !== "string") {
      return NextResponse.json({ error: "Manglende spec" }, { status: 400 });
    }

    let specJson: unknown;
    try {
      specJson = JSON.parse(specRaw);
    } catch {
      return NextResponse.json({ error: "Ugyldig spec JSON" }, { status: 400 });
    }

    const spec = generationSpecSchema.parse(specJson);
    if (spec.enablePaint) {
      if (!spec.paintColorId || !getWallPaintColorById(spec.paintColorId)) {
        return NextResponse.json({ error: "Vælg en gyldig vægfarve." }, { status: 400 });
      }
    }
    const w = Number(widthStr) || 0;
    const h = Number(heightStr) || 0;
    const aspectRatio = nearestReplicateAspectRatio(w, h);

    const { maling, oprydning, indretning } = buildCategoryBlocks({
      enablePaint: spec.enablePaint,
      paintColorId: spec.paintColorId,
      enableCleanup: spec.enableCleanup,
      cleanupDescription: spec.cleanupDescription,
      enableFurnishing: spec.enableFurnishing,
      furnishingDescription: spec.furnishingDescription,
    });

    const prompt = applyImagePromptTemplate({
      maling,
      oprydning,
      indretning,
      brugerCustom: spec.customPrompt.trim(),
    });

    // Buffer (ikke data:-URL): Replicate uploader til HTTPS-URL. Rene data-URI-strenge
    // bliver ikke transformeret og fejler ofte hos image_input-modeller.
    const imageBuffer = Buffer.from(await file.arrayBuffer());

    const replicate = new Replicate({
      auth: token,
      fileEncodingStrategy: "upload",
      useFileOutput: false,
    });

    const output = await replicate.run(
      model as `${string}/${string}`,
      {
        input: {
          prompt,
          image_input: [imageBuffer],
          aspect_ratio: aspectRatio,
          output_format: "jpg",
        },
        // Replicate tillader kun Prefer: wait=1..60; klienten poller derefter til prediction er færdig.
        wait: { mode: "block", timeout: 60 },
      },
      (p) => {
        lastPrediction = p;
      },
    );

    const url =
      typeof output === "string"
        ? output
        : Array.isArray(output) && typeof output[0] === "string"
          ? output[0]
          : null;

    if (!url) {
      return NextResponse.json({ error: "Uventet output fra Replicate" }, { status: 502 });
    }

    return NextResponse.json({ imageUrl: url, aspectRatio });
  } catch (e) {
    const message = formatReplicateError(e, lastPrediction);
    console.error("[generate]", e, lastPrediction);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
