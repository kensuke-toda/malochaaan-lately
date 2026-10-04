"use client";

import { readAddKind, readCorkOpen } from "@/lib/add-session";
import { setPhotoDraftAsync } from "@/lib/photo-draft";

const LIBRARY_ID = "lately-durable-library-input";
const CAMERA_ID = "lately-durable-camera-input";

export type PhotoPickerReceiver = {
  draftKey: string;
  allowMultiple: boolean;
  /** Called after files are cloned and persisted. */
  onPicked: (files: File[]) => void;
};

type Config = {
  draftKey: string;
  allowMultiple: boolean;
  onPicked: ((files: File[]) => void) | null;
};

let config: Config | null = null;
let taking = false;

function resolveDraftKey() {
  if (config?.draftKey) return config.draftKey;
  const kind = readAddKind();
  if (kind) return `add:${kind}`;
  if (readCorkOpen()) return "cork:pin";
  return null;
}

async function cloneFiles(files: File[]) {
  const out: File[] = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    out.push(
      new File([bytes], file.name || "photo.jpg", {
        type: file.type || "image/jpeg",
        lastModified: file.lastModified || Date.now(),
      }),
    );
  }
  return out;
}

async function take(input: HTMLInputElement) {
  if (taking) return;
  const picked = input.files ? Array.from(input.files) : [];
  if (!picked.length) return;

  taking = true;
  try {
    const draftKey = resolveDraftKey();
    const allowMultiple = Boolean(config?.allowMultiple);
    const keep = allowMultiple ? picked : picked.slice(0, 1);
    // Clone before clearing — iOS can invalidate File references after dismiss.
    const clones = await cloneFiles(keep);
    if (!draftKey || !clones.length) {
      input.value = "";
      return;
    }

    // Persist before clearing so a reload mid-write can still drain input.files.
    await setPhotoDraftAsync(draftKey, clones);
    input.value = "";
    config?.onPicked?.(clones);
    window.dispatchEvent(
      new CustomEvent("lately:photos-picked", {
        detail: { draftKey, count: clones.length },
      }),
    );
  } finally {
    taking = false;
  }
}

function styleHidden(input: HTMLInputElement) {
  input.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;margin:0;overflow:hidden;z-index:0;pointer-events:none";
}

function wire(input: HTMLInputElement) {
  input.addEventListener("change", () => {
    void take(input);
  });
  const drain = () => {
    if (input.files?.length) void take(input);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") drain();
  });
  window.addEventListener("focus", drain);
  window.addEventListener("pageshow", drain);
}

function ensureLibraryInput() {
  let input = document.getElementById(LIBRARY_ID) as HTMLInputElement | null;
  if (input) return input;

  input = document.createElement("input");
  input.id = LIBRARY_ID;
  input.type = "file";
  input.accept = "image/*";
  input.multiple = false;
  input.setAttribute("autocomplete", "off");
  styleHidden(input);
  document.documentElement.appendChild(input);
  wire(input);
  return input;
}

function ensureCameraInput() {
  let input = document.getElementById(CAMERA_ID) as HTMLInputElement | null;
  if (input) return input;

  input = document.createElement("input");
  input.id = CAMERA_ID;
  input.type = "file";
  input.accept = "image/*";
  input.setAttribute("capture", "environment");
  input.multiple = false;
  input.setAttribute("autocomplete", "off");
  styleHidden(input);
  document.documentElement.appendChild(input);
  wire(input);
  return input;
}

export function bindPhotoPicker(next: PhotoPickerReceiver | null) {
  if (typeof document === "undefined") return;
  const library = ensureLibraryInput();
  ensureCameraInput();
  if (next) {
    config = next;
    library.multiple = next.allowMultiple;
  } else if (config) {
    // Keep draft key across unmounts so a late change event is not dropped.
    config = { ...config, onPicked: null };
  }
}

export function libraryInputId() {
  if (typeof document !== "undefined") ensureLibraryInput();
  return LIBRARY_ID;
}

export function cameraInputId() {
  if (typeof document !== "undefined") ensureCameraInput();
  return CAMERA_ID;
}
