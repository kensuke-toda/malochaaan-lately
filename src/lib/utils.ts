import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  const date = parseDateOnly(dateString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function parseDateOnly(dateString: string) {
  const day = dateString.slice(0, 10);
  return new Date(`${day}T00:00:00+09:00`);
}

export function toDateKey(dateString: string) {
  return dateString.slice(0, 10);
}

export function tokyoNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

export function todayKey() {
  const n = tokyoNow();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function authorName(row: { profiles?: { display_name: string } | null }) {
  return row.profiles?.display_name ?? "メンバー";
}
