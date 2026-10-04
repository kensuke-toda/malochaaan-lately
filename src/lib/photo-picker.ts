"use client";

import { readAddKind, readCorkOpen } from "@/lib/add-session";
import { normalizePickedImage } from "@/lib/normalize-image";
import { setPhotoDraft } from "@/lib/photo-draft";

const LIBRARY_ID = "lately-durable-library-input";
const CAMERA_ID = "lately-durable-camera-input";
const LOADING_ID = "lately-photo-loading-overlay";

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

function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * iOS single-select often shows a checkmark with no way to confirm (no 追加).
 * Forcing multiple reveals the top-right 追加 button; we still keep 1 file in app logic.
 */
function libraryNeedsMultipleAttribute(allowMultiple: boolean) {
  return allowMultiple || isAppleTouchDevice();
}

function resolveDraftKey() {
  if (config?.draftKey) return config.draftKey;
  const kind = readAddKind();
  if (kind) return `add:${kind}`;
  if (readCorkOpen()) return "cork:pin";
  return null;
}

async function prepareFiles(files: File[]) {
  const out: File[] = [];
  for (const file of files) {
    out.push(await normalizePickedImage(file));
  }
  return out;
}

function emit(name: string, detail?: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function showLoadingOverlay(message: string) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(LOADING_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = LOADING_ID;
    el.setAttribute("role", "status");
    el.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(47,42,36,0.72);color:#F4EEE4;font:600 15px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;text-align:center";
    document.documentElement.appendChild(el);
  }
  el.textContent = message;
  el.style.display = "flex";
}

function hideLoadingOverlay() {
  const el = document.getElementById(LOADING_ID);
  if (el) el.style.display = "none";
}

async function take(input: HTMLInputElement) {
  if (taking) return;
  const picked = input.files ? Array.from(input.files) : [];
  if (!picked.length) return;

  taking = true;
  // Snapshot before awaits — React may unbind while iOS is dismissing.
  const receiver = config;
  const draftKey = receiver?.draftKey || resolveDraftKey();
  const allowMultiple = Boolean(receiver?.allowMultiple);
  const onPicked = receiver?.onPicked;
  emit("lately:photos-picking", { draftKey });
  showLoadingOverlay("写真を読み込み中…\nそのまま待ってください");
  try {
    const keep = allowMultiple ? picked : picked.slice(0, 1);
    // Normalize (HEIC → JPEG) before clearing — iOS can invalidate File refs after dismiss.
    const clones = await prepareFiles(keep);
    if (!draftKey || !clones.length) {
      input.value = "";
      return;
    }

    // Memory + background IDB, then hand off so the edit screen can render immediately.
    setPhotoDraft(draftKey, clones);
    input.value = "";
    onPicked?.(clones);
    emit("lately:photos-picked", { draftKey, count: clones.length });
  } catch {
    emit("lately:photos-pick-error", {
      draftKey,
      message:
        "カメラで撮った写真を読み込めませんでした。下の「カメラ」から撮り直すか、写真アプリでその写真を開いて（ダウンロードして）から、もう一度ライブラリで選んでください。",
    });
  } finally {
    taking = false;
    hideLoadingOverlay();
    emit("lately:photos-pick-settled", { draftKey });
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
  // Include HEIC explicitly — camera roll photos on iPhone are often HEIC/HEIF.
  input.accept = "image/*,image/heic,image/heif,.heic,.heif";
  // Default on for iPhone so the first open already has 追加 available.
  input.multiple = isAppleTouchDevice();
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
  input.accept = "image/*,image/heic,image/heif,.heic,.heif";
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
    library.multiple = libraryNeedsMultipleAttribute(next.allowMultiple);
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
