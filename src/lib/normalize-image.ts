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

function looksLikeHeic(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    // iOS PHPicker often hands camera photos with an empty MIME type.
    type === ""
  );
}

/** Ensure HEIC blobs have a usable type/name for Safari decoders. */
function typedForDecode(file: File): File {
  if (!looksLikeHeic(file)) return file;
  if (file.type === "image/heic" || file.type === "image/heif") return file;
  const lower = (file.name || "").toLowerCase();
  const name = lower.endsWith(".heic") || lower.endsWith(".heif") ? file.name : `${baseName(file)}.heic`;
  return new File([file], name, {
    type: "image/heic",
    lastModified: file.lastModified || Date.now(),
  });
}

async function canvasToJpeg(source: CanvasImageSource, width: number, height: number, quality = 0.82): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.drawImage(source, 0, 0, width, height);
  return withTimeout(
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((next) => (next ? resolve(next) : reject(new Error("encode failed"))), "image/jpeg", quality);
    }),
    12_000,
    "encode",
  );
}

function fitSize(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeViaBitmap(file: File): Promise<File> {
  const typed = typedForDecode(file);
  // Prefer a resized decode when supported — large HEIC camera photos are slower otherwise.
  let bitmap: ImageBitmap;
  try {
    bitmap = await withTimeout(
      createImageBitmap(typed, { resizeWidth: 2048, resizeQuality: "high" }),
      12_000,
      "bitmap-resize",
    );
  } catch {
    bitmap = await withTimeout(createImageBitmap(typed), 12_000, "bitmap");
  }
  try {
    const { width, height } = fitSize(bitmap.width, bitmap.height, 2048);
    const blob = await canvasToJpeg(bitmap, width, height);
    return new File([blob], `${baseName(file)}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

async function decodeViaImageElement(file: File): Promise<File> {
  const typed = typedForDecode(file);
  const url = URL.createObjectURL(typed);
  try {
    const img = new Image();
    img.decoding = "async";
    // iOS Safari often decodes HEIC through <img> more reliably than createImageBitmap.
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("img decode failed"));
    });
    img.src = url;
    if (img.decode) {
      await withTimeout(img.decode().then(() => undefined), 12_000, "img.decode");
    } else {
      await withTimeout(loaded, 12_000, "img.onload");
    }
    const { width, height } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, 2048);
    if (width < 2 || height < 2) throw new Error("empty dimensions");
    const blob = await canvasToJpeg(img, width, height);
    return new File([blob], `${baseName(file)}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeViaFileReader(file: File): Promise<File> {
  const typed = typedForDecode(file);
  const buffer = await withTimeout(
    new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error("FileReader empty"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
      reader.readAsArrayBuffer(typed);
    }),
    10_000,
    "FileReader",
  );
  if (!buffer.byteLength) throw new Error("empty image");
  const blob = new Blob([buffer], { type: typed.type || "image/heic" });
  return decodeViaImageElement(new File([blob], typed.name, { type: typed.type, lastModified: typed.lastModified }));
}

/**
 * Convert a picked image to a moderate JPEG as soon as possible.
 * Camera-roll HEIC from iOS PHPicker is the hard case — try several decoders.
 */
export async function normalizePickedImage(file: File): Promise<File> {
  if (typeof file.size === "number" && file.size === 0) {
    throw new Error("empty iCloud placeholder");
  }

  const errors: string[] = [];
  for (const step of [decodeViaImageElement, decodeViaBitmap, decodeViaFileReader]) {
    try {
      return await step(file);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown");
    }
  }
  throw new Error(errors.join(" | ") || "normalize failed");
}
