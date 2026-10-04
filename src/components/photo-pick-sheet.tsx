"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  bindPhotoPicker,
  cameraInputId,
  libraryInputId,
} from "@/lib/photo-picker";
import { setPhotoDraftAsync } from "@/lib/photo-draft";

type PhotoPickSheetProps = {
  multiple?: boolean;
  draftKey: string;
  initialFiles: File[];
  onClose: () => void;
  onConfirm: (files: File[]) => void;
};

function subscribeNoop() {
  return () => {};
}

function useObjectUrls(files: File[]) {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => {
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [urls]);
  return urls;
}

export function PhotoPickSheet({
  multiple,
  draftKey,
  initialFiles,
  onClose,
  onConfirm,
}: PhotoPickSheetProps) {
  const allowMultiple = Boolean(multiple);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [selected, setSelected] = useState<number[]>(() => initialFiles.map((_, index) => index));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previews = useObjectUrls(files);
  const libraryId = useSyncExternalStore(subscribeNoop, libraryInputId, () => "lately-durable-library-input");
  const cameraId = useSyncExternalStore(subscribeNoop, cameraInputId, () => "lately-durable-camera-input");
  const onConfirmRef = useRef(onConfirm);
  const filesRef = useRef(files);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    bindPhotoPicker({
      draftKey,
      allowMultiple,
      onPicked: (picked) => {
        setError(null);
        if (!allowMultiple) {
          // Single photo: land straight on the edit form with the pick applied.
          onConfirmRef.current(picked);
          return;
        }
        const start = filesRef.current.length;
        const next = [...filesRef.current, ...picked];
        setFiles(next);
        setSelected((current) => [...current, ...picked.map((_, index) => start + index)]);
        void setPhotoDraftAsync(draftKey, next);
      },
    });
    return () => bindPhotoPicker(null);
  }, [draftKey, allowMultiple]);

  useEffect(() => {
    const onPicking = () => {
      setLoading(true);
      setError(null);
    };
    const onSettled = () => setLoading(false);
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setLoading(false);
      setError(detail?.message || "写真を読み込めませんでした");
    };
    window.addEventListener("lately:photos-picking", onPicking);
    window.addEventListener("lately:photos-pick-settled", onSettled);
    window.addEventListener("lately:photos-pick-error", onError);
    return () => {
      window.removeEventListener("lately:photos-picking", onPicking);
      window.removeEventListener("lately:photos-pick-settled", onSettled);
      window.removeEventListener("lately:photos-pick-error", onError);
    };
  }, []);

  function toggleSelect(index: number) {
    if (!allowMultiple) {
      setSelected([index]);
      return;
    }
    setSelected((current) => {
      if (current.includes(index)) return current.filter((item) => item !== index);
      return [...current, index];
    });
  }

  function orderOf(index: number) {
    const order = selected.indexOf(index);
    return order >= 0 ? order + 1 : null;
  }

  const confirmed = selected
    .slice()
    .sort((a, b) => a - b)
    .map((index) => files[index])
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#2F2A24]/45 sm:items-center sm:p-4">
      <div className="flex max-h-[min(85dvh,40rem)] w-full max-w-md flex-col rounded-t-3xl bg-[#2A2622] text-[#F4EEE4] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center text-xl text-[#F4EEE4]/80"
            aria-label="閉じる"
          >
            ✕
          </button>
          <h3 className="font-display text-base font-semibold">写真を選択</h3>
          <span className="min-w-11" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:none]">
            {files.map((file, index) => {
              const badge = orderOf(index);
              return (
                <button
                  key={`${file.name}-${file.lastModified}-${index}`}
                  type="button"
                  onClick={() => toggleSelect(index)}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#3A342E]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previews[index]} alt="" className="h-full w-full object-cover" />
                  {badge ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-[#2F2A24]/25">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4EEE4] text-sm font-bold text-[#2F2A24]">
                        {badge}
                      </span>
                    </span>
                  ) : (
                    <span className="absolute right-2 top-2 h-5 w-5 rounded-full border border-[#F4EEE4]/70" />
                  )}
                </button>
              );
            })}

            <label
              htmlFor={libraryId}
              className="relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#F4EEE4]/30 bg-[#3A342E] text-xs text-[#F4EEE4]/80"
            >
              <span className="text-2xl leading-none">＋</span>
              <span>追加</span>
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs text-[#F4EEE4]/55">追加方法</p>
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor={cameraId}
                className="relative flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#3A342E] text-sm font-medium"
              >
                カメラ
              </label>
              <label
                htmlFor={libraryId}
                className="relative flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#3A342E] text-sm font-medium"
              >
                ライブラリ
              </label>
            </div>
            <p className="text-[11px] leading-relaxed text-[#F4EEE4]/45">
              写真を選んだら右上のチェック（または「追加」）を押してください。カメラ写真は読み込みに数秒かかることがあります。うまくいかない写真は、一度「写真」アプリで開いてから選び直してください。
            </p>
            {loading ? <p className="text-sm font-medium text-[#F4EEE4]">読み込み中…</p> : null}
            {error ? <p className="text-sm leading-relaxed text-[#F0A090]">{error}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full bg-[#3A342E] text-sm font-semibold text-[#F4EEE4]"
          >
            閉じる
          </button>
          <button
            type="button"
            disabled={!confirmed.length}
            onClick={() => onConfirm(confirmed)}
            className="min-h-12 rounded-full bg-[#F4EEE4] text-sm font-semibold text-[#2F2A24] disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
