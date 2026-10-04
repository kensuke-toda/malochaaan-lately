"use client";

import { useEffect, useState } from "react";

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif";

export function useModalScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };
    html.style.overflow = "visible";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);
}

function FloatingFileInput({
  slot,
  title,
  camera,
  multiple,
  onFiles,
}: {
  slot: HTMLDivElement | null;
  title: string;
  camera?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  useEffect(() => {
    if (!slot) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT;
    input.setAttribute("aria-label", title);
    if (camera) input.setAttribute("capture", "environment");
    if (multiple) input.multiple = true;
    input.style.position = "fixed";
    input.style.zIndex = "80";
    input.style.margin = "0";
    input.style.padding = "0";
    input.style.opacity = "0.02";
    input.style.fontSize = "16px";
    let frozen = false;
    const place = () => {
      if (frozen) return;
      const rect = slot.getBoundingClientRect();
      input.style.top = `${rect.top}px`;
      input.style.left = `${rect.left}px`;
      input.style.width = `${rect.width}px`;
      input.style.height = `${rect.height}px`;
    };
    place();
    const onPointerDown = () => {
      frozen = true;
    };
    const onChange = () => {
      const picked = input.files ? Array.from(input.files) : [];
      input.value = "";
      frozen = false;
      place();
      if (picked.length) onFiles(multiple ? picked : picked.slice(0, 1));
    };
    input.addEventListener("pointerdown", onPointerDown);
    input.addEventListener("change", onChange);
    document.documentElement.appendChild(input);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      input.remove();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [slot, title, camera, multiple, onFiles]);

  return null;
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
  const [cameraSlot, setCameraSlot] = useState<HTMLDivElement | null>(null);
  const [librarySlot, setLibrarySlot] = useState<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!files[0]) {
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(files[0]);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [files]);

  const hint = !files.length
    ? "まだ選んでいません"
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
        <div ref={setCameraSlot} className="flex min-h-11 items-center justify-center rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]">
          写真を撮る
        </div>
        <div ref={setLibrarySlot} className="flex min-h-11 items-center justify-center rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]">
          ライブラリから選ぶ
        </div>
      </div>
      <FloatingFileInput slot={cameraSlot} title="写真を撮る" camera onFiles={onFiles} />
      <FloatingFileInput slot={librarySlot} title="ライブラリから選ぶ" multiple={multiple} onFiles={onFiles} />
    </div>
  );
}
