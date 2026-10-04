"use client";

import { useEffect, useMemo, useSyncExternalStore, type ChangeEvent } from "react";

function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function subscribeNoop() {
  return () => {};
}

export function useModalScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
    };
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
  // iOS single-select can check a photo and never dismiss. Library needs multiple so
  // the system shows「追加」; we still keep only one file unless allowMultiple.
  // Camera stays true single-shot.
  const inputMultiple = camera ? allowMultiple : true;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    onFiles(allowMultiple ? picked : picked.slice(0, 1));
  }

  return (
    <label className="relative flex min-h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]">
      <span className="pointer-events-none">{title}</span>
      <input
        type="file"
        accept="image/*"
        capture={camera ? "environment" : undefined}
        multiple={inputMultiple || undefined}
        aria-label={title}
        onChange={handleChange}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.01]"
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
      ? "1枚チェック → 右上の「追加」"
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
