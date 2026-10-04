"use client";

import { useEffect, useState, type ChangeEvent } from "react";

const ACCEPT = "image/*";

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
    html.style.overflow = "visible";
    body.style.overflow = "visible";
    const blockBackground = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-add-sheet]")) return;
      event.preventDefault();
    };
    document.addEventListener("touchmove", blockBackground, { passive: false });
    document.addEventListener("wheel", blockBackground, { passive: false });
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      document.removeEventListener("touchmove", blockBackground);
      document.removeEventListener("wheel", blockBackground);
    };
  }, []);
}

function FileButton({
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
    onFiles(multiple ? copied : copied.slice(0, 1));
  }

  return (
    <div className="relative flex min-h-11 items-center justify-center">
      <input
        type="file"
        accept={ACCEPT}
        capture={camera ? "environment" : undefined}
        multiple={multiple ? true : undefined}
        aria-label={title}
        onChange={handleChange}
        className="absolute inset-0 z-10 block h-full w-full cursor-pointer text-base text-transparent file:h-full file:w-full file:cursor-pointer file:rounded-full file:border-0 file:bg-[#2F2A24] file:text-transparent"
      />
      <span className="pointer-events-none relative z-20 text-sm font-semibold text-[#F4EEE4]">{title}</span>
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

  const hint = !files.length ? "まだ選んでいません" : files.length === 1 ? files[0].name : `${files.length} 枚選択中`;

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
        <FileButton title="写真を撮る" camera onFiles={onFiles} />
        <FileButton title="ライブラリから選ぶ" multiple={multiple} onFiles={onFiles} />
      </div>
    </div>
  );
}
