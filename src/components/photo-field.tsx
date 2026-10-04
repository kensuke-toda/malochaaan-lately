"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type ChangeEvent } from "react";
import { bindLibraryReceiver, libraryInputId } from "@/lib/library-input";

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

function CameraButton({
  allowMultiple,
  onFiles,
}: {
  allowMultiple: boolean;
  onFiles: (files: File[]) => void;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    onFiles(allowMultiple ? picked : picked.slice(0, 1));
  }

  return (
    <label className="relative flex min-h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]">
      <span className="pointer-events-none">写真を撮る</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple={allowMultiple || undefined}
        aria-label="写真を撮る"
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
  draftKey,
}: {
  label: string;
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
  draftKey: string;
}) {
  const allowMultiple = Boolean(multiple);
  const appleTouch = useSyncExternalStore(subscribeNoop, isAppleTouchDevice, () => false);
  const preview = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);
  const inputId = useSyncExternalStore(subscribeNoop, libraryInputId, () => "lately-library-file-input");
  const onFilesRef = useRef(onFiles);

  useEffect(() => {
    onFilesRef.current = onFiles;
  }, [onFiles]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    bindLibraryReceiver({
      draftKey,
      allowMultiple,
      onFiles: (next) => onFilesRef.current(next),
    });
    return () => bindLibraryReceiver(null);
  }, [draftKey, allowMultiple]);

  const hint = !files.length
    ? appleTouch
      ? allowMultiple
        ? "選んで右上の青チェック"
        : "1枚だけ選んで右上の青チェック"
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
        <span className="max-w-full text-xs leading-relaxed text-[#6B6258]">{hint}</span>
        {appleTouch && !files.length ? (
          <span className="max-w-full text-[11px] leading-relaxed text-[#B85C38]">
            たくさん選ぶと戻れないことがあります。1枚だけにしてください。
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <CameraButton allowMultiple={allowMultiple} onFiles={onFiles} />
        <label
          htmlFor={inputId}
          className="relative flex min-h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]"
        >
          ライブラリから選ぶ
        </label>
      </div>
    </div>
  );
}
