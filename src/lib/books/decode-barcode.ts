import { classifyScannedCode } from "@/lib/books/isbn";

type DecodeResult = { ok: true; isbn: string } | { ok: false; error: string };

function drawScaled(bitmap: ImageBitmap, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function drawCenterCrop(bitmap: ImageBitmap, ratio: number, maxEdge: number) {
  const cropW = Math.max(1, Math.round(bitmap.width * ratio));
  const cropH = Math.max(1, Math.round(bitmap.height * ratio));
  const sx = Math.round((bitmap.width - cropW) / 2);
  const sy = Math.round((bitmap.height - cropH) / 2);
  const scale = Math.min(1, maxEdge / Math.max(cropW, cropH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropW * scale));
  canvas.height = Math.max(1, Math.round(cropH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function decodeBookIsbnFromFile(file: File): Promise<DecodeResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: "画像を開けませんでした。別の写真を選ぶか、ISBNを入力してください。" };
  }

  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    const canvases = [
      drawScaled(bitmap, 1600),
      drawScaled(bitmap, 1000),
      drawCenterCrop(bitmap, 0.7, 1200),
      drawCenterCrop(bitmap, 0.5, 1000),
    ].filter((canvas): canvas is HTMLCanvasElement => Boolean(canvas));

    for (const canvas of canvases) {
      try {
        const result = reader.decodeFromCanvas(canvas);
        const classified = classifyScannedCode(result.getText());
        if ("isbn" in classified) return { ok: true, isbn: classified.isbn };
        return { ok: false, error: classified.error };
      } catch {
        // try the next scale / crop
      }
    }

    return {
      ok: false,
      error: "バーコードを読み取れませんでした。ピントを合わせて撮り直すか、ISBNを入力してください。",
    };
  } finally {
    bitmap.close();
  }
}
