"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Box = { top: number; left: number; width: number; height: number };

function OverlayFileInput({
  target,
  camera,
  multiple,
  ticket,
  onFiles,
  onPicked,
}: {
  target: HTMLElement | null;
  camera?: boolean;
  multiple?: boolean;
  ticket: number;
  onFiles: (files: File[]) => void;
  onPicked: () => void;
}) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    if (!target) return;
    const update = () => {
      const rect = target.getBoundingClientRect();
      setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [target, ticket]);

  if (!box) return null;

  return createPortal(
    <input
      key={ticket}
      type="file"
      accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
      multiple={multiple}
      onChange={(e) => {
        const next = e.target.files ? Array.from(e.target.files) : [];
        if (next.length) onFiles(multiple ? next : next.slice(0, 1));
        e.target.blur();
        e.target.value = "";
        onPicked();
      }}
      ref={(el) => {
        if (!el) return;
        if (camera) el.setAttribute("capture", "environment");
        else el.removeAttribute("capture");
      }}
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: Math.max(box.width, 44),
        height: Math.max(box.height, 44),
        opacity: 0.01,
        zIndex: 80,
        fontSize: 16,
      }}
    />,
    document.body,
  );
}

function Choice({ children, buttonRef }: { children: ReactNode; buttonRef: (node: HTMLSpanElement | null) => void }) {
  return (
    <span
      ref={buttonRef}
      className="relative flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#2F2A24] px-3 text-sm font-semibold text-[#F4EEE4]"
    >
      {children}
    </span>
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
  const [ticket, setTicket] = useState(0);
  const [cameraEl, setCameraEl] = useState<HTMLSpanElement | null>(null);
  const [libraryEl, setLibraryEl] = useState<HTMLSpanElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLSpanElement | null>(null);
  const libraryRef = useRef<HTMLSpanElement | null>(null);

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

  function remember(kind: "camera" | "library") {
    return (node: HTMLSpanElement | null) => {
      if (kind === "camera") {
        cameraRef.current = node;
        setCameraEl(node);
      } else {
        libraryRef.current = node;
        setLibraryEl(node);
      }
    };
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
      <div className="mt-3 flex gap-2">
        <Choice buttonRef={remember("camera")}>写真を撮る</Choice>
        <Choice buttonRef={remember("library")}>ライブラリから選ぶ</Choice>
      </div>
      <OverlayFileInput
        target={cameraEl}
        camera
        ticket={ticket}
        onFiles={onFiles}
        onPicked={() => setTicket((value) => value + 1)}
      />
      <OverlayFileInput
        target={libraryEl}
        multiple={multiple}
        ticket={ticket}
        onFiles={onFiles}
        onPicked={() => setTicket((value) => value + 1)}
      />
    </div>
  );
}
