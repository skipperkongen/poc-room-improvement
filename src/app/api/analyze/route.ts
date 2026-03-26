import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai-client";
import { getOpenAIModel } from "@/lib/server-config";
import { roomAnalysisSchema, type RoomAnalysis } from "@/lib/room-recommendations";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `Du er ekspert i boligfotos og boligstyling til annoncer.
Analyser billedet.
Returner KUN gyldig JSON med præcis den struktur brugeren beder om — ingen markdown, ingen kommentarer.`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Manglende billede" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    const userPrompt = `Returner JSON med denne struktur:
{
  "roomName": "kort dansk navn på rummet, fx Stue, Soveværelse, Køkken",
  "paint": { "necessary": boolean, "recommendation": "kort konkret anbefaling på dansk — farver til vægge der passer til rummet" },
  "cleanup": { "necessary": boolean, "recommendation": "hvad der bør fjernes eller ryddes — konkret på dansk" },
  "furnishing": { "necessary": boolean, "recommendation": "hvad der kan tilføjes for at løfte indtrykket — konkret på dansk" }
}

Vurder "necessary" realistisk: false hvis kategorien ikke giver mening eller allerede er fin.`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Tom svar fra model" }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Ugyldig JSON fra analyse" }, { status: 502 });
    }

    const analysis: RoomAnalysis = roomAnalysisSchema.parse(parsed);
    return NextResponse.json({ analysis });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ukendt fejl";
    console.error("[analyze]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
