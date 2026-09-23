"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPinAction, deletePinAction, updatePinLayoutAction } from "@/app/actions";
import { authorName } from "@/lib/utils";
import type { Pin, Profile } from "@/types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function colorDist(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function sampleBlock(data: Uint8ClampedArray, w: number, h: number, x: number, y: number, size: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let n = 0;
  const x2 = Math.min(w, x + size);
  const y2 = Math.min(h, y + size);
  for (let yy = Math.max(0, y); yy < y2; yy++) {
    for (let xx = Math.max(0, x); xx < x2; xx++) {
      const i = (yy * w + xx) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      a += data[i + 3];
      n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n, a: a / n };
}

/** iPhoneの背景削除あとに残る白・クリームの余白を、端からだけ抜く */
function punchLightMatte(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const n = width * height;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;
  if (transparent / n > 0.04) return;

  const s = Math.max(2, Math.round(Math.min(width, height) * 0.02));
  const corners = [
    sampleBlock(data, width, height, 0, 0, s),
    sampleBlock(data, width, height, width - s, 0, s),
    sampleBlock(data, width, height, 0, height - s, s),
    sampleBlock(data, width, height, width - s, height - s, s),
  ];
  if (corners.some((c) => c.a < 200)) return;
  const avg = {
    r: corners.reduce((t, c) => t + c.r, 0) / 4,
    g: corners.reduce((t, c) => t + c.g, 0) / 4,
    b: corners.reduce((t, c) => t + c.b, 0) / 4,
  };
  if (corners.some((c) => colorDist(c, avg) > 30)) return;
  if ((avg.r + avg.g + avg.b) / 3 < 190) return;

  const tol = 36;
  let matte = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.hypot(data[i] - avg.r, data[i + 1] - avg.g, data[i + 2] - avg.b) < tol) matte++;
  }
  const ratio = matte / n;
  if (ratio < 0.06 || ratio > 0.62) return;

  const match = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return Math.hypot(data[i] - avg.r, data[i + 1] - avg.g, data[i + 2] - avg.b) < tol;
  };
  const seen = new Uint8Array(n);
  const qx = new Int32Array(n);
  const qy = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const push = (x: number, y: number) => {
    const idx = y * width + x;
    if (seen[idx] || !match(x, y)) return;
    seen[idx] = 1;
    qx[qt] = x;
    qy[qt] = y;
    qt++;
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (qh < qt) {
    const x = qx[qh];
    const y = qy[qh++];
    data[(y * width + x) * 4 + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      const d = Math.hypot(data[i] - avg.r, data[i + 1] - avg.g, data[i + 2] - avg.b);
      if (d < tol || d >= tol + 24) continue;
      const near =
        data[((y - 1) * width + x) * 4 + 3] === 0 ||
        data[((y + 1) * width + x) * 4 + 3] === 0 ||
        data[(y * width + x - 1) * 4 + 3] === 0 ||
        data[(y * width + x + 1) * 4 + 3] === 0;
      if (near) data[i + 3] = Math.round(data[i + 3] * ((d - tol) / 24));
    }
  }

  ctx.putImageData(image, 0, 0);
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
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    punchLightMatte(ctx, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return file;
    return new File([blob], "pin.png", { type: "image/png" });
  } catch {
    return file;
  }
}

type Draft = Pick<Pin, "id" | "x" | "y" | "scale" | "rotation" | "z_index">;

type Board = {
  ownerId: string;
  name: string;
  pins: Pin[];
};

function boardsFrom(pins: Pin[], profiles: Profile[], userId: string | null, displayName: string | null): Board[] {
  const map = new Map<string, Board>();
  for (const profile of profiles) {
    map.set(profile.id, { ownerId: profile.id, name: profile.display_name, pins: [] });
  }
  for (const pin of pins) {
    const existing = map.get(pin.created_by);
    if (existing) {
      existing.pins.push(pin);
    } else {
      map.set(pin.created_by, { ownerId: pin.created_by, name: authorName(pin), pins: [pin] });
    }
  }
  if (userId && !map.has(userId)) {
    map.set(userId, { ownerId: userId, name: displayName ?? "メンバー", pins: [] });
  }
  return [...map.values()].sort((a, b) => {
    if (a.ownerId === userId) return -1;
    if (b.ownerId === userId) return 1;
    return a.name.localeCompare(b.name, "ja");
  });
}

export function Corkboard({
  pins,
  profiles,
  userId,
  displayName,
  loggedIn,
}: {
  pins: Pin[];
  profiles: Profile[];
  userId: string | null;
  displayName: string | null;
  loggedIn: boolean;
}) {
  const boards = useMemo(
    () => boardsFrom(pins, profiles, userId, displayName),
    [pins, profiles, userId, displayName],
  );
  const many = boards.length > 1;
  const [locked, setLocked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeId, setActiveId] = useState(boards[0]?.ownerId ?? null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const showAdd = Boolean(loggedIn && userId && activeId === userId);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const panes = [...root.children];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-owner");
        if (id) setActiveId(id);
      },
      { root, threshold: 0.55 },
    );
    panes.forEach((pane) => io.observe(pane));
    return () => io.disconnect();
  }, [boards]);

  return (
    <section id="cork" className="mb-16">
      <div className="mb-4 flex min-h-8 items-end justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Cork</h2>
        {loggedIn ? (
          showAdd ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="shrink-0 rounded-full bg-[#B85C38] px-3 py-1.5 text-xs font-semibold text-[#F4EEE4]"
            >
              ＋ 貼る
            </button>
          ) : (
            <span className="invisible shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold">＋ 貼る</span>
          )
        ) : null}
      </div>
      <div
        ref={scrollerRef}
        data-no-tab-swipe
        className={`flex items-start snap-x snap-mandatory gap-4 overscroll-x-contain pb-1 [scrollbar-width:thin]${locked ? " overflow-hidden" : " overflow-x-auto"}`}
      >
        {boards.map((board) => (
          <div
            key={board.ownerId}
            data-owner={board.ownerId}
            className={many ? "w-[calc(100%-1.25rem)] shrink-0 snap-start" : "w-full shrink-0 snap-start"}
          >
            <CorkPane board={board} userId={userId} loggedIn={loggedIn} onEditingChange={setLocked} />
          </div>
        ))}
      </div>
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

function CorkPane({
  board,
  userId,
  loggedIn,
  onEditingChange,
}: {
  board: Board;
  userId: string | null;
  loggedIn: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const mine = loggedIn && userId != null && board.ownerId === userId;
  const paneRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Record<string, true>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const nextZ = useRef(Math.max(0, ...board.pins.map((p) => p.z_index)) + 1);

  useEffect(() => {
    onEditingChange(editing);
    return () => onEditingChange(false);
  }, [editing, onEditingChange]);

  useEffect(() => {
    if (!editing) return;
    function onDocPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (paneRef.current?.contains(target)) return;
      setEditing(false);
      setSelected(null);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [editing]);

  const shown = board.pins
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
    const pin = board.pins.find((p) => p.id === id);
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
    if (!editing || !mine) return;
    const pin = shown.find((p) => p.id === id);
    if (!pin) return;
    event.preventDefault();
    event.stopPropagation();
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
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
    <div ref={paneRef}>
      <div
        ref={boardRef}
        data-allow-multitouch={editing ? "" : undefined}
        className={`relative isolate aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-inner sm:aspect-[16/10]${mine && !editing ? " cursor-pointer" : ""}`}
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
          if (mine && !editing) setEditing(true);
        }}
      >
        <span className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-full bg-[#F4EEE4]/90 px-2 py-0.5 text-[10px] text-[#2F2A24]">
          {board.name}
        </span>
        {shown.map((pin) => {
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
                if (!mine) return;
                if (!editing) {
                  setEditing(true);
                  setSelected(pin.id);
                }
              }}
            >
              <div className={`relative ${on && editing ? "ring-2 ring-[#B85C38] ring-offset-2 ring-offset-transparent" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pin.image_url}
                  alt={pin.memo ?? "ステッカー"}
                  className="block h-auto w-full"
                  draggable={false}
                />
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

      {editing && selected && shown.some((pin) => pin.id === selected) ? (
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
    </div>
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
