"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type PhotoPickSheetProps = {
  multiple?: boolean;
  initialFiles: File[];
  onClose: () => void;
  onConfirm: (files: File[]) => void;
};

function useObjectUrls(files: File[]) {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => {
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [urls]);
  return urls;
}

export function PhotoPickSheet({ multiple, initialFiles, onClose, onConfirm }: PhotoPickSheetProps) {
  const allowMultiple = Boolean(multiple);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [selected, setSelected] = useState<number[]>(() => initialFiles.map((_, index) => index));
  const previews = useObjectUrls(files);

  function addFiles(picked: File[]) {
    if (!picked.length) return;
    if (!allowMultiple) {
      const next = picked.slice(0, 1);
      setFiles(next);
      setSelected(next.length ? [0] : []);
      return;
    }
    const start = files.length;
    const next = [...files, ...picked];
    setFiles(next);
    setSelected((current) => [...current, ...picked.map((_, index) => start + index)]);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    addFiles(allowMultiple ? picked : picked.slice(0, 1));
  }

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

            <label className="relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#F4EEE4]/30 bg-[#3A342E] text-xs text-[#F4EEE4]/80">
              <span className="text-2xl leading-none">＋</span>
              <span>追加</span>
              <input
                type="file"
                accept="image/*"
                multiple={allowMultiple || undefined}
                onChange={handleInput}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs text-[#F4EEE4]/55">追加方法</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="relative flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#3A342E] text-sm font-medium">
                カメラ
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleInput}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <label className="relative flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#3A342E] text-sm font-medium">
                ファイルから
                <input
                  type="file"
                  accept="image/*"
                  multiple={allowMultiple || undefined}
                  onChange={handleInput}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
            <p className="text-[11px] leading-relaxed text-[#F4EEE4]/45">
              iPhone ではメニューの「ファイルを選択」が確実です。「フォトライブラリ」だと戻れないことがあります。
            </p>
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
