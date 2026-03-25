/** Replicate google/nano-banana understøtter disse strenge (jf. dokumentation). */
const LABELS = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;

function ratioValue(label: string): number {
  const [a, b] = label.split(":").map(Number);
  return a / b;
}

/** Vælg den tætteste understøttede aspect ratio til (width, height). */
export function nearestReplicateAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return "4:3";
  const r = width / height;
  let best: (typeof LABELS)[number] = LABELS[0];
  let bestDiff = Math.abs(r - ratioValue(best));
  for (const label of LABELS) {
    const d = Math.abs(r - ratioValue(label));
    if (d < bestDiff) {
      bestDiff = d;
      best = label;
    }
  }
  return best;
}
