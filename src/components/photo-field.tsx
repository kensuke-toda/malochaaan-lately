"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

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
  const id = `photo-field-${useId().replace(/:/g, "")}`;
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <>
      {mounted
        ? createPortal(
            <input
              id={id}
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={(e) => {
                const next = e.target.files ? Array.from(e.target.files) : [];
                onFiles(multiple ? next : next.slice(0, 1));
              }}
              style={{ width: 1, height: 1, opacity: 0.01, border: 0, padding: 0 }}
            />,
            document.body,
          )
        : null}
      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#2F2A24]/30 bg-[#E8DFD0] px-3 py-4 text-center"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="mb-1 h-24 w-24 rounded-lg object-cover" />
        ) : null}
        <span className="text-sm font-medium text-[#2F2A24]">{label}</span>
        <span className="max-w-full truncate text-xs leading-relaxed text-[#6B6258]">{hint}</span>
      </label>
    </>
  );
}
