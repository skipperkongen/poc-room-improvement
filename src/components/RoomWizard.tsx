"use client";

import { useCallback, useState } from "react";
import type { RoomAnalysis } from "@/lib/room-recommendations";
import { shrinkImageFile, sanitizeFilenameBase } from "@/lib/image-client";
import {
  DEFAULT_WALL_PAINT_ID,
  WALL_PAINT_PALETTE,
  type WallPaintColor,
} from "@/lib/wall-paint-palette";

type Step = 1 | 2 | 3 | 4;

const initialToggles = (a: RoomAnalysis) => ({
  paint: a.paint.necessary,
  cleanup: a.cleanup.necessary,
  furnishing: a.furnishing.necessary,
});

/** Samme rækkefølge som i paletten — fra lyst/neutralt mod farvede accenter */
const PAINT_FAMILY_ORDER = [
  "Hvid og off-white",
  "Greige og sand",
  "Salvie og grøn",
  "Blå og blågrå",
  "Varme toner",
] as const;

const PAINT_BY_FAMILY: Map<string, WallPaintColor[]> = (() => {
  const m = new Map<string, WallPaintColor[]>();
  for (const c of WALL_PAINT_PALETTE) {
    const arr = m.get(c.family) ?? [];
    arr.push(c);
    m.set(c.family, arr);
  }
  return m;
})();

function PaintColorSelector({
  disabled,
  selectedId,
  onSelect,
}: {
  disabled: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`space-y-8 ${disabled ? "pointer-events-none select-none opacity-45" : ""}`}
      role="group"
      aria-label="Vælg vægfarve"
    >
      {PAINT_FAMILY_ORDER.map((family) => {
        const colors = PAINT_BY_FAMILY.get(family);
        if (!colors?.length) return null;
        return (
          <div key={family} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {family}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {colors.map((c) => {
                const selected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-pressed={selected}
                    disabled={disabled}
                    className={`rounded-lg border border-zinc-200 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 ${
                      selected
                        ? "ring-2 ring-emerald-600 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950"
                        : "hover:border-zinc-400 dark:hover:border-zinc-500"
                    }`}
                  >
                    <div
                      className="aspect-[4/3] w-full rounded-t-md border-b border-zinc-200 dark:border-zinc-700"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="space-y-0.5 px-2 py-2">
                      <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </p>
                      <p className="font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                        {c.hex}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RoomWizard() {
  const [step, setStep] = useState<Step>(1);
  const [wishes, setWishes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [enablePaint, setEnablePaint] = useState(true);
  const [enableCleanup, setEnableCleanup] = useState(true);
  const [enableFurnishing, setEnableFurnishing] = useState(true);
  const [selectedPaintId, setSelectedPaintId] = useState<string>(DEFAULT_WALL_PAINT_ID);
  const [cleanupText, setCleanupText] = useState("");
  const [furnishingText, setFurnishingText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");

  const resetFilePreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setWidth(0);
    setHeight(0);
  }, [previewUrl]);

  const onPickFile = async (f: File | null) => {
    resetFilePreview();
    if (!f || !f.type.startsWith("image/")) {
      setError("Vælg et billedfil (JPEG, PNG eller WebP).");
      return;
    }
    setError(null);
    try {
      const { file: shrunk, width: w, height: h } = await shrinkImageFile(f, 2048);
      setFile(shrunk);
      setWidth(w);
      setHeight(h);
      setPreviewUrl(URL.createObjectURL(shrunk));
    } catch {
      setError("Kunne ikke læse billedet.");
    }
  };

  const goStep1NewRoom = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/refill-wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousRoomName: roomName || "Rum",
          previousWishes: wishes,
          previousCustomPrompt: customPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunne ikke udfylde ønsker");
      setWishes(typeof data.wishes === "string" ? data.wishes : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
    resetFilePreview();
    setAnalysis(null);
    setResultUrl(null);
    setStep(1);
  };

  const submitStep1 = async () => {
    if (!file) {
      setError("Upload et billede.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("wishes", wishes);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse fejlede");
      const a = data.analysis as RoomAnalysis;
      setAnalysis(a);
      setRoomName(a.roomName);
      const t = initialToggles(a);
      setEnablePaint(t.paint);
      setEnableCleanup(t.cleanup);
      setEnableFurnishing(t.furnishing);
      setSelectedPaintId(DEFAULT_WALL_PAINT_ID);
      setCleanupText(a.cleanup.recommendation);
      setFurnishingText(a.furnishing.recommendation);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  };

  const submitStep2 = async () => {
    if (!file || !analysis) return;
    if (enablePaint && !selectedPaintId.trim()) {
      setError("Vælg en vægfarve.");
      return;
    }
    setError(null);
    setResultUrl(null);
    setStep(3);
    setLoading(true);
    try {
      const spec = {
        roomName: roomName.trim() || analysis.roomName,
        enablePaint,
        enableCleanup,
        enableFurnishing,
        paintColorId: enablePaint ? selectedPaintId : null,
        cleanupDescription: cleanupText,
        furnishingDescription: furnishingText,
        customPrompt,
        wishes,
      };
      const fd = new FormData();
      fd.append("image", file);
      fd.append("spec", JSON.stringify(spec));
      fd.append("width", String(width));
      fd.append("height", String(height));
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generering fejlede");
      setResultUrl(data.imageUrl as string);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === 1
      ? "Upload rumfoto"
      : step === 2
        ? roomName || analysis?.roomName || "Anbefalinger"
        : step === 3
          ? "Genererer billede …"
          : roomName || "Resultat";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-500">Trin {step} af 4</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Forbedr boligfoto til annoncer: samme rumstruktur og vinkel, bedre styling og stemning.
        </p>
      </header>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rumfoto</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-zinc-800 dark:file:bg-zinc-100 dark:file:text-zinc-900"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {previewUrl && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
              <img src={previewUrl} alt="Forhåndsvisning" className="max-h-80 w-full object-contain" />
            </div>
          )}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ønsker (valgfrit)
            </span>
            <textarea
              className="min-h-[100px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Fx farvepalet, målgruppe, stemning …"
              value={wishes}
              onChange={(e) => setWishes(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={loading || !file}
            onClick={submitStep1}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {loading ? "Analyserer …" : "Næste"}
          </button>
        </section>
      )}

      {step === 2 && analysis && (
        <section className="flex flex-col gap-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Godkend eller juster forslagene. Slå kategorier fra, hvis de ikke skal med.
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Rumnavn (overskrift / filnavn)</span>
            <input
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </label>

          <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Maling af væg</span>
              <button
                type="button"
                role="switch"
                aria-checked={enablePaint}
                onClick={() => setEnablePaint(!enablePaint)}
                className={`relative h-7 w-12 rounded-full transition-colors ${enablePaint ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enablePaint ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
            <PaintColorSelector
              disabled={!enablePaint}
              selectedId={selectedPaintId}
              onSelect={setSelectedPaintId}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Oprydning</span>
              <button
                type="button"
                role="switch"
                aria-checked={enableCleanup}
                onClick={() => setEnableCleanup(!enableCleanup)}
                className={`relative h-7 w-12 rounded-full transition-colors ${enableCleanup ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enableCleanup ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              disabled={!enableCleanup}
              value={cleanupText}
              onChange={(e) => setCleanupText(e.target.value)}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Indretning</span>
              <button
                type="button"
                role="switch"
                aria-checked={enableFurnishing}
                onClick={() => setEnableFurnishing(!enableFurnishing)}
                className={`relative h-7 w-12 rounded-full transition-colors ${enableFurnishing ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enableFurnishing ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              disabled={!enableFurnishing}
              value={furnishingText}
              onChange={(e) => setFurnishingText(e.target.value)}
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Custom prompt (valgfrit)</span>
            <textarea
              className="min-h-[80px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="Ekstra instruktioner til billedgenerering …"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={submitStep2}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Næste
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm dark:border-zinc-600"
              onClick={() => {
                setStep(1);
                setAnalysis(null);
              }}
            >
              Tilbage
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col items-center gap-6 py-16">
          <div
            className="h-12 w-12 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white"
            aria-hidden
          />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {loading ? "Genererer dit billede … det kan tage et minut." : "Starter …"}
          </p>
        </section>
      )}

      {step === 4 && resultUrl && (
        <section className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="Genereret rum" className="w-full object-contain" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              onClick={async () => {
                try {
                  const r = await fetch(resultUrl);
                  const blob = await r.blob();
                  const u = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = u;
                  a.download = `${sanitizeFilenameBase(roomName || analysis?.roomName || "rum")}.jpg`;
                  a.click();
                  URL.revokeObjectURL(u);
                } catch {
                  window.open(resultUrl, "_blank");
                }
              }}
            >
              Download
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm dark:border-zinc-600"
              onClick={() => setStep(2)}
            >
              Tilbage
            </button>
            <button
              type="button"
              disabled={loading}
              className="rounded-lg border border-emerald-700 px-5 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
              onClick={goStep1NewRoom}
            >
              Nyt rum
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
