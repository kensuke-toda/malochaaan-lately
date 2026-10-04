"use client";

import { useEffect, useMemo, useState } from "react";
import { PhotoPickSheet } from "@/components/photo-pick-sheet";
import { setPhotoDraft } from "@/lib/photo-draft";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const preview = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // If the system picker remounted the page, draft may land after hydrate — open stays closed.
  useEffect(() => {
    const onPhotos = (event: Event) => {
      const detail = (event as CustomEvent<{ draftKey?: string }>).detail;
      if (detail?.draftKey && detail.draftKey !== draftKey) return;
      setSheetOpen(false);
    };
    window.addEventListener("lately:photos-picked", onPhotos);
    return () => window.removeEventListener("lately:photos-picked", onPhotos);
  }, [draftKey]);

  const hint = !files.length
    ? "写真ライブラリから選ぶ"
    : files.length === 1
      ? files[0].name
      : `${files.length} 枚選択中`;

  function confirmFiles(next: File[]) {
    setPhotoDraft(draftKey, next);
    onFiles(next);
    setSheetOpen(false);
  }

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
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]"
        >
          {files.length ? "写真を選び直す" : "写真を選ぶ"}
        </button>
      </div>

      {sheetOpen ? (
        <PhotoPickSheet
          multiple={allowMultiple}
          draftKey={draftKey}
          initialFiles={files}
          onClose={() => setSheetOpen(false)}
          onConfirm={confirmFiles}
        />
      ) : null}
    </div>
  );
}
