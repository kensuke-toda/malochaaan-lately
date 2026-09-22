import "server-only";

const MIN_COVER_EDGE = 80;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

function allowedCoverHost(hostname: string) {
  return (
    hostname === "cover.openbd.jp" ||
    hostname === "books.google.com" ||
    hostname.endsWith(".books.google.com") ||
    hostname === "covers.openlibrary.org"
  );
}

export function isAllowedCoverUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && allowedCoverHost(url.hostname);
  } catch {
    return false;
  }
}

function readPngSize(bytes: Uint8Array) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpegSize(bytes: Uint8Array) {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[i + 5] << 8) | bytes[i + 6],
        width: (bytes[i + 7] << 8) | bytes[i + 8],
      };
    }
    if (length < 2) break;
    i += 2 + length;
  }
  return null;
}

function isUsableCoverBytes(bytes: Uint8Array) {
  if (bytes.byteLength < 8_000 || bytes.byteLength > MAX_COVER_BYTES) return false;
  const size = readPngSize(bytes) ?? readJpegSize(bytes);
  if (!size) return true;
  return size.width >= MIN_COVER_EDGE && size.height >= MIN_COVER_EDGE;
}

async function usableCoverUrl(url: string) {
  if (!isAllowedCoverUrl(url)) return null;
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: { "User-Agent": "Lately/1.0" },
  });
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!contentType.startsWith("image/")) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return isUsableCoverBytes(bytes) ? url : null;
}

export async function findFallbackCover(isbn: string) {
  const google = await usableCoverUrl(
    `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1`,
  );
  if (google) return google;
  return usableCoverUrl(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);
}

export async function downloadAllowedCover(coverUrl: string) {
  if (!isAllowedCoverUrl(coverUrl)) {
    throw new Error("書影URLが不正です");
  }
  const res = await fetch(coverUrl, {
    redirect: "follow",
    cache: "no-store",
    headers: { "User-Agent": "Lately/1.0" },
  });
  if (!res.ok) throw new Error("書影の取得に失敗しました");
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!contentType.startsWith("image/")) throw new Error("書影の取得に失敗しました");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!isUsableCoverBytes(new Uint8Array(bytes))) {
    throw new Error("書影の取得に失敗しました");
  }
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return { bytes, contentType: contentType || "image/jpeg", ext };
}
