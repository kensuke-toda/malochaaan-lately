"use client";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function baseName(file: File) {
  return (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
}

/**
 * Convert a picked image to a moderate JPEG as soon as possible.
 * Screenshots (PNG) are already small; camera HEIC / large photos often
 * hang or fail later if we keep the original blob around.
 */
export async function normalizePickedImage(file: File): Promise<File> {
  const name = `${baseName(file)}.jpg`;
  const lastModified = file.lastModified || Date.now();

  try {
    const bitmap = await withTimeout(createImageBitmap(file), 20_000, "decode");
    const max = 2048;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unsupported");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await withTimeout(
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((next) => (next ? resolve(next) : reject(new Error("encode failed"))), "image/jpeg", 0.85);
      }),
      15_000,
      "encode",
    );
    return new File([blob], name, { type: "image/jpeg", lastModified });
  } catch {
    // Last resort: raw copy (may still fail for iCloud-only assets).
    const bytes = await withTimeout(file.arrayBuffer(), 20_000, "arrayBuffer");
    if (!bytes.byteLength) throw new Error("empty image");
    return new File([bytes], file.name || name, {
      type: file.type || "image/jpeg",
      lastModified,
    });
  }
}
