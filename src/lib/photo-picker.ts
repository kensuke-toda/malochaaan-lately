"use client";

const LIBRARY_INPUT_ID = "lately-library-file-input";
const CAMERA_INPUT_ID = "lately-camera-file-input";

type PickOptions = {
  multiple: boolean;
  camera?: boolean;
  onFiles: (files: File[]) => void;
};

function isAppleTouchDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function ensureInput(id: string, camera: boolean) {
  let input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) {
    input = document.createElement("input");
    input.id = id;
    input.type = "file";
    input.accept = "image/*";
    // Keep a real DOM node outside React so iOS can still deliver files after remounts.
    input.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;margin:0";
    document.documentElement.appendChild(input);
  }
  if (camera) input.setAttribute("capture", "environment");
  else input.removeAttribute("capture");
  return input;
}

export function pickPhotos({ multiple, camera, onFiles }: PickOptions) {
  const input = ensureInput(camera ? CAMERA_INPUT_ID : LIBRARY_INPUT_ID, Boolean(camera));
  // On iPhone/iPad, single-select PHPicker can show a checkmark with no「追加」.
  // Enabling multiple surfaces the confirm control; we still keep one file unless asked.
  const needsConfirmControl = !camera && isAppleTouchDevice();
  input.multiple = multiple || needsConfirmControl;

  const finish = () => {
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    input.removeEventListener("change", finish);
    if (!picked.length) return;
    onFiles(multiple ? picked : picked.slice(0, 1));
  };

  input.removeEventListener("change", finish);
  input.addEventListener("change", finish);
  input.click();
}
