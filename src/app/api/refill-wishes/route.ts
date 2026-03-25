import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai-client";
import { getOpenAIModel } from "@/lib/server-config";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  previousRoomName: z.string(),
  previousWishes: z.string(),
  previousCustomPrompt: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { previousRoomName, previousWishes, previousCustomPrompt } =
      bodySchema.parse(json);

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content:
            "Du hjælper med boligannoncer. Brugeren vil style et nyt rum efter samme stil som forrige. Skriv 2–5 korte sætninger på dansk med ønsker/målgruppe/farvetema der matcher forrige valg, så næste billede bliver visuelt konsistent. Ingen liste-punktopstilling, ingen JSON — kun flydende brugertekst til et fritekstfelt.",
        },
        {
          role: "user",
          content: `Forrige rum: ${previousRoomName}
Forrige ønsker fra bruger: ${previousWishes || "(ingen)"}
Forrige ekstra prompt til generering: ${previousCustomPrompt || "(ingen)"}

Skriv nye ønsker-tekst til et andet rum i samme bolig, samme overordnede stil.`,
        },
      ],
      max_tokens: 400,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "Tom svar" }, { status: 502 });
    }

    return NextResponse.json({ wishes: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ukendt fejl";
    console.error("[refill-wishes]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
