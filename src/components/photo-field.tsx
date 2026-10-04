"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif";

function useBodyScrollable() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "visible";
    body.style.overflow = "visible";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);
}

function LibraryInput({
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
  const frozen = useRef(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!slot) return;
    const update = () => {
      if (frozen.current) return;
      const rect = slot.getBoundingClientRect();
      setBox({
        top: window.scrollY + rect.top,
        left: window.scrollX + rect.left,
        width: rect.width,
        height: Math.max(rect.height, 44),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [slot]);

  if (!box) return null;

  return createPortal(
    <input
      type="file"
      accept={ACCEPT}
      multiple={multiple ? true : undefined}
      aria-label={title}
      ref={(el) => {
        if (!el) return;
        if (camera) el.setAttribute("capture", "environment");
        else el.removeAttribute("capture");
      }}
      onPointerDown={() => {
        frozen.current = true;
      }}
      onChange={(e) => {
        const picked = e.target.files ? Array.from(e.target.files) : [];
        e.target.value = "";
        frozen.current = false;
        if (picked.length) onFiles(multiple ? picked : picked.slice(0, 1));
      }}
      style={{
        position: "absolute",
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        zIndex: 80,
        margin: 0,
        opacity: 1,
        fontSize: 16,
      }}
      className="text-[0px] file:h-full file:w-full file:rounded-full file:border-0 file:bg-[#2F2A24] file:text-sm file:font-semibold file:text-[#F4EEE4]"
    />,
    document.body,
  );
}

function Slot({ title, bind }: { title: string; bind: (node: HTMLDivElement | null) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-[#2F2A24]">{title}</p>
      <div ref={bind} className="h-11" />
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
  const [cameraSlot, setCameraSlot] = useState<HTMLDivElement | null>(null);
  const [librarySlot, setLibrarySlot] = useState<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useBodyScrollable();

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
      <div className="mt-3 flex flex-col gap-3 text-left">
        <Slot title="写真を撮る" bind={setCameraSlot} />
        <Slot title="ライブラリから選ぶ" bind={setLibrarySlot} />
      </div>
      <LibraryInput slot={cameraSlot} title="写真を撮る" camera onFiles={onFiles} />
      <LibraryInput slot={librarySlot} title="ライブラリから選ぶ" multiple={multiple} onFiles={onFiles} />
    </div>
  );
}
