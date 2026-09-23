"use client";

import { useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPinAction, deletePinAction, updatePinLayoutAction } from "@/app/actions";
import { authorName } from "@/lib/utils";
import type { Pin } from "@/types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

async function preparePinImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1200;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const keepAlpha = file.type === "image/png" || file.type === "image/webp";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, keepAlpha ? "image/png" : "image/jpeg", keepAlpha ? undefined : 0.82),
    );
    if (!blob) return file;
    return new File([blob], keepAlpha ? "pin.png" : "pin.jpg", { type: blob.type });
  } catch {
    return file;
  }
}

type Draft = Pick<Pin, "id" | "x" | "y" | "scale" | "rotation" | "z_index">;

export function Corkboard({
  pins,
  userId,
  loggedIn,
}: {
  pins: Pin[];
  userId: string | null;
  loggedIn: boolean;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Record<string, true>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const nextZ = useRef(Math.max(0, ...pins.map((p) => p.z_index)) + 1);

  const shown = pins
    .filter((pin) => !removed[pin.id])
    .map((pin) => {
      const draft = drafts[pin.id];
      return draft ? { ...pin, ...draft } : pin;
    });

  function patch(id: string, next: Partial<Draft>) {
    const pin = shown.find((p) => p.id === id);
    if (!pin) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        id,
        x: next.x ?? pin.x,
        y: next.y ?? pin.y,
        scale: next.scale ?? pin.scale,
        rotation: next.rotation ?? pin.rotation,
        z_index: next.z_index ?? pin.z_index,
      },
    }));
  }

  async function persist(id: string) {
    const pin = pins.find((p) => p.id === id);
    const draft = draftsRef.current[id];
    const row = draft ?? pin;
    if (!row) return;
    await updatePinLayoutAction({
      id,
      x: row.x,
      y: row.y,
      scale: row.scale,
      rotation: row.rotation,
      z_index: row.z_index,
    });
  }

  function startDrag(id: string, mode: "move" | "scale" | "rotate", event: ReactPointerEvent) {
    if (!editing) return;
    const pin = shown.find((p) => p.id === id);
    if (!pin || pin.created_by !== userId) return;
    event.preventDefault();
    event.stopPropagation();
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const z = nextZ.current++;
    patch(id, { z_index: z });
    setSelected(id);
    setDragging(id);

    const origin = {
      x: event.clientX,
      y: event.clientY,
      pinX: pin.x,
      pinY: pin.y,
      scale: pin.scale,
      rotation: pin.rotation,
    };

    const onMove = (ev: PointerEvent) => {
      if (mode === "move") {
        patch(id, {
          x: clamp(origin.pinX + (ev.clientX - origin.x) / rect.width, 0.08, 0.92),
          y: clamp(origin.pinY + (ev.clientY - origin.y) / rect.height, 0.1, 0.9),
          z_index: z,
        });
        return;
      }
      if (mode === "scale") {
        const dx = (ev.clientX - origin.x) / rect.width;
        patch(id, { scale: clamp(origin.scale + dx * 2.2, 0.45, 1.8), z_index: z });
        return;
      }
      const cx = rect.left + origin.pinX * rect.width;
      const cy = rect.top + origin.pinY * rect.height;
      const start = Math.atan2(origin.y - cy, origin.x - cx);
      const now = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      patch(id, { rotation: origin.rotation + ((now - start) * 180) / Math.PI, z_index: z });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(null);
      void persist(id);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <section id="cork" className="mb-16">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">Cork</h2>
          <p className="text-xs text-[#6B6258]">
            {loggedIn && !editing ? "ボードをタップすると並べられる。" : "もらったステッカーを、ここに貼る。"}
          </p>
        </div>
        {loggedIn ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-full bg-[#E8DFD0] px-3 py-1.5 text-xs font-semibold text-[#2F2A24]"
            >
              {editing ? "完了" : "並べる"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-full bg-[#B85C38] px-3 py-1.5 text-xs font-semibold text-[#F4EEE4]"
            >
              ＋ 貼る
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <p className="mb-2 text-xs text-[#6B6258]">自分のステッカーをドラッグ。上で回転、右下で大きさ。</p>
      ) : null}

      <div
        ref={boardRef}
        data-no-tab-swipe
        data-allow-multitouch={editing ? "" : undefined}
        className={`relative isolate aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-inner sm:aspect-[16/10]${loggedIn && !editing ? " cursor-pointer" : ""}`}
        style={{
          contain: "paint",
          backgroundColor: "#C4A574",
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(90,60,30,0.18) 1.2px, transparent 1.4px), radial-gradient(circle at 70% 60%, rgba(70,45,20,0.16) 1px, transparent 1.2px), radial-gradient(circle at 40% 80%, rgba(110,75,40,0.2) 0.8px, transparent 1px), linear-gradient(135deg, #d2b48c 0%, #c4a574 40%, #b8956a 100%)",
          backgroundSize: "18px 18px, 22px 22px, 16px 16px, 100% 100%",
        }}
        onPointerDown={() => {
          if (editing) setSelected(null);
        }}
        onClick={() => {
          if (loggedIn && !editing) setEditing(true);
        }}
      >
        {!shown.length ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[#5C4033]/80">
            まだ貼っていません。
          </p>
        ) : null}
        {shown.map((pin) => {
          const mine = userId != null && pin.created_by === userId;
          const on = selected === pin.id;
          return (
            <div
              key={pin.id}
              className="absolute left-0 top-0"
              style={{
                left: `${pin.x * 100}%`,
                top: `${pin.y * 100}%`,
                width: "22%",
                transform: `translate3d(-50%, -50%, 0) rotate(${pin.rotation}deg) scale(${pin.scale})`,
                transformOrigin: "center center",
                zIndex: pin.z_index,
                touchAction: editing && mine ? "none" : "auto",
                willChange: dragging === pin.id ? "transform" : undefined,
                backfaceVisibility: "hidden",
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if ((e.target as Element).closest("button, form")) return;
                if (editing && mine) startDrag(pin.id, "move", e);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!loggedIn) return;
                if (!editing) {
                  setEditing(true);
                  if (mine) setSelected(pin.id);
                }
              }}
            >
              <div className={`relative ${on && editing ? "ring-2 ring-[#B85C38] ring-offset-2 ring-offset-transparent" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pin.image_url}
                  alt={pin.memo ?? "ステッカー"}
                  className="block h-auto w-full rounded-sm shadow-[2px_4px_10px_rgba(47,42,36,0.28)]"
                  draggable={false}
                />
                {!editing ? (
                  <span className="sr-only">{authorName(pin)}</span>
                ) : null}
                {editing && mine && on ? (
                  <>
                    <button
                      type="button"
                      aria-label="回転"
                      className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2F2A24] text-sm text-[#F4EEE4]"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag(pin.id, "rotate", e);
                      }}
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      aria-label="大きさ"
                      className="absolute bottom-0 right-0 h-5 w-5 translate-x-2 translate-y-2 rounded-sm bg-[#2F2A24]"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag(pin.id, "scale", e);
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {editing && selected && shown.some((pin) => pin.id === selected && pin.created_by === userId) ? (
        <button
          type="button"
          className="mt-3 min-h-11 rounded-full bg-[#B85C38] px-4 text-sm font-semibold text-[#F4EEE4]"
          onClick={() => {
            const id = selected;
            setRemoved((prev) => ({ ...prev, [id]: true }));
            setSelected(null);
            const fd = new FormData();
            fd.set("id", id);
            void deletePinAction(fd);
          }}
        >
          選んだステッカーを外す
        </button>
      ) : null}

      {adding ? (
        <AddPinModal
          onClose={() => setAdding(false)}
          defaultX={0.28 + Math.random() * 0.44}
          defaultY={0.32 + Math.random() * 0.36}
          defaultRotation={Math.round((Math.random() - 0.5) * 22)}
        />
      ) : null}
    </section>
  );
}

function AddPinModal({
  onClose,
  defaultX,
  defaultY,
  defaultRotation,
}: {
  onClose: () => void;
  defaultX: number;
  defaultY: number;
  defaultRotation: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileHint, setFileHint] = useState("まだ選んでいません");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const image = fd.get("image");
    if (image instanceof File && image.size > 0) {
      fd.set("image", await preparePinImage(image));
    }
    try {
      const result = await createPinAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2F2A24]/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <form
        className="w-full max-w-md rounded-t-2xl bg-[#F4EEE4] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-6"
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">ステッカーを貼る</h3>
          <button type="button" onClick={onClose} disabled={pending} className="min-h-11 min-w-11 text-[#6B6258]">
            ✕
          </button>
        </div>
        <input type="hidden" name="x" value={defaultX} />
        <input type="hidden" name="y" value={defaultY} />
        <input type="hidden" name="rotation" value={defaultRotation} />
        <div className="flex flex-col gap-3">
          <label className="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#2F2A24]/30 bg-[#E8DFD0] px-3 py-4 text-center">
            <span className="text-sm font-medium">写真を選択</span>
            <span className="max-w-full truncate text-xs text-[#6B6258]">{fileHint}</span>
            <input
              name="image"
              type="file"
              accept="image/*"
              required
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFileHint(file ? file.name : "まだ選んでいません");
              }}
            />
          </label>
          <input name="memo" placeholder="メモ（任意）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
          {error ? <p className="text-sm text-[#B85C38]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-full bg-[#B85C38] px-4 py-2.5 text-sm font-semibold text-[#F4EEE4] disabled:opacity-60"
          >
            {pending ? "貼っています…" : "貼る"}
          </button>
        </div>
      </form>
    </div>
  );
}
