"use client";

import { readAddKind, readCorkOpen } from "@/lib/add-session";
import { setPhotoDraft } from "@/lib/photo-draft";

const INPUT_ID = "lately-library-file-input";

export type LibraryReceiver = {
  draftKey: string;
  allowMultiple: boolean;
  onFiles: (files: File[]) => void;
};

type Config = {
  draftKey: string;
  allowMultiple: boolean;
  onFiles: ((files: File[]) => void) | null;
};

let config: Config | null = null;

function resolveDraftKey() {
  if (config?.draftKey) return config.draftKey;
  const kind = readAddKind();
  if (kind) return `add:${kind}`;
  if (readCorkOpen()) return "cork:pin";
  return null;
}

function take(input: HTMLInputElement) {
  const picked = input.files ? Array.from(input.files) : [];
  if (!picked.length) return;

  const draftKey = resolveDraftKey();
  const allowMultiple = Boolean(config?.allowMultiple);
  // Always keep File object references before clearing the input (iOS can invalidate them).
  const keep = allowMultiple ? picked : picked.slice(0, 1);
  input.value = "";
  if (!draftKey || !keep.length) return;

  // Persist even if React unmounted the PhotoField while the picker was open.
  setPhotoDraft(draftKey, keep);
  config?.onFiles?.(keep);
  window.dispatchEvent(
    new CustomEvent("lately:photos-picked", {
      detail: { draftKey, count: keep.length },
    }),
  );
}

function ensureInput() {
  let input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
  if (input) return input;

  input = document.createElement("input");
  input.id = INPUT_ID;
  input.type = "file";
  input.accept = "image/*";
  input.multiple = false;
  input.setAttribute("autocomplete", "off");
  input.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;margin:0;z-index:0";
  document.documentElement.appendChild(input);

  input.addEventListener("change", () => take(input));
  const drain = () => {
    if (input.files?.length) take(input);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") drain();
  });
  window.addEventListener("focus", drain);
  window.addEventListener("pageshow", drain);

  return input;
}

export function bindLibraryReceiver(next: LibraryReceiver | null) {
  if (typeof document === "undefined") return;
  const input = ensureInput();
  if (next) {
    config = next;
    // Posts can take multiple; everything else is one photo only.
    input.multiple = next.allowMultiple;
  } else if (config) {
    // Keep draft key across unmounts so a late change event is not dropped.
    config = { ...config, onFiles: null };
  }
}

export function libraryInputId() {
  if (typeof document !== "undefined") ensureInput();
  return INPUT_ID;
}
