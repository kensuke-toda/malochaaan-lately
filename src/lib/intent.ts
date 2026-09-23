import type { Intent } from "@/types";

export const WANT_DATE = "2099-12-31";
export const WANT_MARK = "\u2060";

export function markWantText(text: string | null, want: boolean): string | null {
  const clean = stripWantMark(text);
  if (want) return WANT_MARK + clean;
  return clean || null;
}

export function stripWantMark(text: string | null | undefined): string {
  return (text ?? "").split(WANT_MARK).join("");
}

export function isWantDate(date: string | null | undefined): boolean {
  return (date ?? "").slice(0, 10) === WANT_DATE;
}

export function isWantRow(row: {
  intent?: Intent | string | null;
  visited_date?: string | null;
  entry_date?: string | null;
  memo?: string | null;
  body?: string | null;
  summary?: string | null;
}): boolean {
  if (row.intent === "want") return true;
  if (isWantDate(row.visited_date) || isWantDate(row.entry_date)) return true;
  return `${row.memo ?? ""}${row.body ?? ""}${row.summary ?? ""}`.includes(WANT_MARK);
}
