"use client";

import { setPhotoDraft } from "@/lib/photo-draft";

const INPUT_ID = "lately-library-file-input";

export type LibraryReceiver = {
  draftKey: string;
  allowMultiple: boolean;
  onFiles: (files: File[]) => void;
};

let receiver: LibraryReceiver | null = null;

async function copyFiles(files: File[]) {
  const copied: File[] = [];
  for (const file of files) {
    try {
      const bytes = await file.arrayBuffer();
      copied.push(
        new File([bytes], file.name || "photo.jpg", {
          type: file.type || "image/jpeg",
          lastModified: file.lastModified,
        }),
      );
    } catch {
      copied.push(file);
    }
  }
  return copied;
}

function ensureInput() {
  let input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
  if (input) return input;

  input = document.createElement("input");
  input.id = INPUT_ID;
  input.type = "file";
  input.accept = "image/*";
  // Needed so iOS shows the top-right confirm (blue check). App keeps 1 file unless allowMultiple.
  input.multiple = true;
  input.setAttribute("autocomplete", "off");
  input.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;margin:0;z-index:0";
  document.documentElement.appendChild(input);

  const take = () => {
    const current = receiver;
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (!current || !picked.length) return;
    const keep = current.allowMultiple ? picked : picked.slice(0, 1);
    void (async () => {
      const files = await copyFiles(keep);
      setPhotoDraft(current.draftKey, files);
      current.onFiles(files);
      window.dispatchEvent(new CustomEvent("lately:photos-picked"));
    })();
  };

  input.addEventListener("change", take);
  // If iOS restores the page after confirm, try to drain any leftover files.
  const drain = () => {
    if (input.files?.length) take();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") drain();
  });
  window.addEventListener("focus", drain);
  window.addEventListener("pageshow", drain);

  return input;
}

export function bindLibraryReceiver(next: LibraryReceiver | null) {
  receiver = next;
  if (typeof document !== "undefined") ensureInput();
}

export function libraryInputId() {
  if (typeof document !== "undefined") ensureInput();
  return INPUT_ID;
}
