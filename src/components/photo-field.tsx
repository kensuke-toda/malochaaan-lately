"use client";

import { useEffect, useMemo, useSyncExternalStore, type ChangeEvent } from "react";

const ACCEPT = "image/*";

function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function subscribeNoop() {
  return () => {};
}

async function copyFile(file: File) {
  const bytes = await file.arrayBuffer();
  return new File([bytes], file.name || "photo.jpg", {
    type: file.type || "image/jpeg",
    lastModified: file.lastModified,
  });
}

export function useModalScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
    };
    // Keep the document scrollable so iOS can restore the page after PHPicker.
    html.style.overflow = "visible";
    body.style.overflow = "visible";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
    };
  }, []);
}

function FileButton({
  title,
  camera,
  allowMultiple,
  onFiles,
}: {
  title: string;
  camera?: boolean;
  allowMultiple: boolean;
  onFiles: (files: File[]) => void;
}) {
  // Library picks always use multiple so iOS PHPicker shows 「追加」.
  // Single-select mode can leave a checkmark with no way to confirm.
  const inputMultiple = camera ? allowMultiple : true;

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const picked = input.files ? Array.from(input.files) : [];
    if (!picked.length) return;
    const copied: File[] = [];
    for (const file of picked) {
      try {
        copied.push(await copyFile(file));
      } catch {
        copied.push(file);
      }
    }
    input.value = "";
    onFiles(allowMultiple ? copied : copied.slice(0, 1));
  }

  return (
    <label className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]">
      {title}
      <input
        type="file"
        accept={ACCEPT}
        capture={camera ? "environment" : undefined}
        multiple={inputMultiple || undefined}
        aria-label={title}
        onChange={handleChange}
        className="absolute inset-0 z-10 block h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

export function PhotoField({
  label,
  multiple,
  files,
  onFiles,
}: {
  label: string;
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
}) {
  const allowMultiple = Boolean(multiple);
  const appleTouch = useSyncExternalStore(subscribeNoop, isAppleTouchDevice, () => false);
  const preview = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const hint = !files.length
    ? appleTouch
      ? allowMultiple
        ? "写真を選んで右上の「追加」"
        : "1枚選んで右上の「追加」"
      : "まだ選んでいません"
    : files.length === 1
      ? files[0].name
      : `${files.length} 枚選択中`;

  return (
    <div className="rounded-xl border border-dashed border-[#2F2A24]/30 bg-[#E8DFD0] px-3 py-4 text-center">
      <div className="flex flex-col items-center justify-center gap-1">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="mb-1 h-24 w-24 rounded-lg object-cover" />
        ) : null}
        <span className="text-sm font-medium text-[#2F2A24]">{label}</span>
        <span className="max-w-full truncate text-xs leading-relaxed text-[#6B6258]">{hint}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <FileButton title="写真を撮る" camera allowMultiple={allowMultiple} onFiles={onFiles} />
        <FileButton title="ライブラリから選ぶ" allowMultiple={allowMultiple} onFiles={onFiles} />
      </div>
    </div>
  );
}
