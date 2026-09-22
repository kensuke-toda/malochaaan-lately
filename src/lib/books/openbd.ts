import "server-only";
import { isAllowedCoverUrl } from "@/lib/books/covers";
import { isBookIsbn } from "@/lib/books/isbn";

export type BookLookup = {
  title: string;
  author: string;
  coverUrl: string | null;
};

type OpenBdSummary = {
  title?: string;
  volume?: string;
  author?: string;
  cover?: string;
};

type OpenBdRecord = {
  summary?: OpenBdSummary;
} | null;

function cleanAuthor(raw: string) {
  const trimmed = raw.trim();
  const ndl = trimmed.match(/^([^,]+),\s*([^,]+),\s*\d{4}-\d{4}$/);
  if (ndl) return `${ndl[1].trim()}${ndl[2].trim()}`;

  return trimmed
    .replace(/\s*／[^\s／]+/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join("、");
}

export async function fetchOpenBdBook(isbn: string): Promise<BookLookup | null> {
  if (!isBookIsbn(isbn)) return null;
  const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("openBD request failed");
  const rows = (await res.json()) as OpenBdRecord[];
  const summary = rows[0]?.summary;
  const title = [summary?.title?.trim(), summary?.volume?.trim()].filter(Boolean).join(" ");
  if (!title) return null;
  const cover = summary?.cover?.trim() || "";
  return {
    title,
    author: summary?.author ? cleanAuthor(summary.author) : "",
    coverUrl: cover && isAllowedCoverUrl(cover) ? cover : null,
  };
}
