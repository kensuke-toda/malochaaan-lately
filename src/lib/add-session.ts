"use client";

const KIND_KEY = "lately:add-kind";
const INTENT_KEY = "lately:add-intent";
const CORK_KEY = "lately:cork-open";

export function persistAddSession(kind: string | null, intent?: string | null) {
  if (typeof window === "undefined") return;
  if (kind) {
    localStorage.setItem(KIND_KEY, kind);
    if (intent) localStorage.setItem(INTENT_KEY, intent);
  } else {
    localStorage.removeItem(KIND_KEY);
    localStorage.removeItem(INTENT_KEY);
  }
  const url = new URL(window.location.href);
  if (kind) url.searchParams.set("add", kind);
  else url.searchParams.delete("add");
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(window.history.state, "", next);
}

export function readAddKind(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("add");
  if (fromUrl) return fromUrl;
  return localStorage.getItem(KIND_KEY);
}

export function persistCorkOpen(open: boolean) {
  if (typeof window === "undefined") return;
  if (open) localStorage.setItem(CORK_KEY, "1");
  else localStorage.removeItem(CORK_KEY);
  const url = new URL(window.location.href);
  if (open) url.searchParams.set("cork", "1");
  else url.searchParams.delete("cork");
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(window.history.state, "", next);
}

export function readCorkOpen() {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("cork") === "1") return true;
  return localStorage.getItem(CORK_KEY) === "1";
}
