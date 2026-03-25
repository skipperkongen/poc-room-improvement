/** Læs fil som JPEG/PNG/WebP og skaler ned så længste side max `maxSide` px. Returner File + dimensioner. */
export async function shrinkImageFile(
  file: File,
  maxSide: number,
): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const bw = bitmap.width;
  const bh = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(bw, bh));
  const w = Math.round(bw * scale);
  const h = Math.round(bh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas ikke tilgængelig");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const quality = mime === "image/jpeg" ? 0.88 : undefined;

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob fejlede"))), mime, quality);
  });

  const outName = file.name.replace(/\.[^.]+$/, "") + "-opt.jpg";
  const outFile =
    mime === "image/jpeg"
      ? new File([blob], outName.endsWith(".jpg") ? outName : outName + ".jpg", {
          type: "image/jpeg",
        })
      : new File([blob], outName.replace(/\.jpg$/, "") + ".png", { type: "image/png" });

  return { file: outFile, width: w, height: h };
}

export function sanitizeFilenameBase(name: string): string {
  const trimmed = name.trim() || "rum";
  return trimmed
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
