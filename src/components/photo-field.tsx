"use client";

import { useEffect, useState, type PointerEvent } from "react";

function releaseAncestors(start: HTMLElement) {
  const saved: { el: HTMLElement; css: string }[] = [];
  let el: HTMLElement | null = start.parentElement;
  while (el) {
    saved.push({ el, css: el.style.cssText });
    el.style.setProperty("overflow", "visible", "important");
    el.style.setProperty("overflow-x", "visible", "important");
    el.style.setProperty("overflow-y", "visible", "important");
    const position = getComputedStyle(el).position;
    if (position === "fixed" || position === "sticky") {
      el.style.setProperty("position", "absolute", "important");
    }
    if (getComputedStyle(el).transform !== "none") {
      el.style.setProperty("transform", "none", "important");
    }
    el = el.parentElement;
  }
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const item of saved.reverse()) item.el.style.cssText = item.css;
  };
}

function PhotoButton({
  title,
  camera,
  multiple,
  onFiles,
}: {
  title: string;
  camera?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  function prepare(event: PointerEvent<HTMLInputElement>) {
    const restore = releaseAncestors(event.currentTarget);
    event.currentTarget.addEventListener("change", () => restore(), { once: true });
    event.currentTarget.addEventListener("cancel", () => restore(), { once: true });
    window.setTimeout(() => {
      window.addEventListener("focus", () => window.setTimeout(restore, 600), { once: true });
    }, 800);
  }

  return (
    <div className="relative block min-h-11">
      <span className="pointer-events-none flex min-h-11 items-center justify-center rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]">
        {title}
      </span>
      <input
        type="file"
        accept="image/*"
        multiple={multiple ? true : undefined}
        aria-label={title}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer text-base opacity-[0.02]"
        ref={(el) => {
          if (!el) return;
          if (camera) el.setAttribute("capture", "environment");
          else el.removeAttribute("capture");
        }}
        onPointerDown={prepare}
        onChange={(e) => {
          const picked = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = "";
          if (picked.length) onFiles(multiple ? picked : picked.slice(0, 1));
        }}
      />
    </div>
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
        <PhotoButton title="写真を撮る" camera onFiles={onFiles} />
        <PhotoButton title={multiple ? "ライブラリから選ぶ（複数可）" : "ライブラリから選ぶ"} multiple={multiple} onFiles={onFiles} />
      </div>
    </div>
  );
}
