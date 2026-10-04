"use client";

import { readAddKind, readCorkOpen } from "@/lib/add-session";
import { normalizePickedImage } from "@/lib/normalize-image";
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
  try {
    const keep = allowMultiple ? picked : picked.slice(0, 1);
    // Normalize (HEIC → JPEG) before clearing — iOS can invalidate File refs after dismiss.
    const clones = await prepareFiles(keep);
    if (!draftKey || !clones.length) {
      input.value = "";
      return;
    }

    // Persist before clearing so a reload mid-write can still drain input.files.
    await setPhotoDraftAsync(draftKey, clones);
    input.value = "";
    onPicked?.(clones);
    emit("lately:photos-picked", { draftKey, count: clones.length });
  } catch {
    emit("lately:photos-pick-error", {
      draftKey,
      message:
        "この写真を読み込めませんでした。スクショは通りやすいです。カメラ写真は一度「写真」アプリで開いてから選び直すか、設定で iCloud 写真のダウンロードを確認してください。",
    });
  } finally {
    taking = false;
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
