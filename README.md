# Rumforbedring (PoC)

Webapp der forbedrer rumfoto til boligannoncer: analyse med GPT (vision), billedgenerering via [Replicate `google/nano-banana`](https://replicate.com/google/nano-banana).

## Krav

- Node.js 22+ (anbefalet til Docker)
- Miljøvariabler som i `.env.example` (alle viste nøgler er påkrævet)
- Promptskabeloner i `prompts/` (`image-prompt-template.txt`, `image-prompt-constraints.txt`)

## Lokalt

1. Kopiér `.env.example` til `.env.local` og udfyld nøglerne.
2. `npm install`
3. `npm run local` eller `npm run dev`
4. Åbn [http://localhost:3000](http://localhost:3000)

API-nøgler bruges kun på serveren (Next.js route handlers).

## Miljøvariabler

| Variabel | Beskrivelse |
|----------|-------------|
| `OPENAI_API_KEY` | Påkrævet |
| `OPENAI_MODEL` | Påkrævet — bruges til analyse (fx `gpt-4o`) |
| `REPLICATE_API_KEY` | Påkrævet |
| `REPLICATE_IMAGE_MODEL` | Påkrævet — fx `google/nano-banana` |

Prompttekster ligger i `prompts/` og følger med Docker-imaget; rediger filerne eller mount egne ved deploy.

## Docker

```bash
docker build -t poc-room-improvement .
docker run --rm -p 3000:3000 \
  -e OPENAI_API_KEY=... -e OPENAI_MODEL=gpt-4o \
  -e REPLICATE_API_KEY=... -e REPLICATE_IMAGE_MODEL=google/nano-banana \
  poc-room-improvement
```

GitHub Actions bygger Docker-imaget ved push/PR (uden push til registry).

## Struktur

- `prompts/` — skabelon og constraints til billedgenerering
- `src/lib/room-recommendations.ts` — datamodel (Zod) for analyse og generering
- `src/app/api/analyze` — GPT vision → JSON-anbefalinger
- `src/app/api/generate` — prompt fra skabelon + Replicate
- `src/components/RoomWizard.tsx` — wizard UI
