"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { AddModal, type ModalKind } from "@/components/add-modal";

const kinds: { kind: ModalKind; label: string }[] = [
  { kind: "place", label: "お店" },
  { kind: "thing", label: "モノ" },
  { kind: "book", label: "本" },
  { kind: "movie", label: "映画" },
  { kind: "sound", label: "音楽" },
  { kind: "podcast", label: "ポッドキャスト" },
  { kind: "post", label: "投稿" },
  { kind: "work", label: "仕事" },
];

type AddFlowValue = {
  loggedIn: boolean;
  openAdd: (kind?: ModalKind) => void;
};

const AddFlowContext = createContext<AddFlowValue | null>(null);

export function useAddFlow() {
  const value = useContext(AddFlowContext);
  if (!value) throw new Error("useAddFlow must be used within AddFlowProvider");
  return value;
}

export function AddFlowProvider({
  loggedIn,
  children,
}: {
  loggedIn: boolean;
  children: ReactNode;
}) {
  const [picker, setPicker] = useState(false);
  const [kind, setKind] = useState<ModalKind | null>(null);

  function openAdd(next?: ModalKind) {
    if (!loggedIn) return;
    if (next) {
      setPicker(false);
      setKind(next);
      return;
    }
    setKind(null);
    setPicker(true);
  }

  return (
    <AddFlowContext.Provider value={{ loggedIn, openAdd }}>
      {children}
      {picker ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#2F2A24]/40 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPicker(false);
          }}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-[#F4EEE4] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">何を追加する？</h3>
              <button type="button" onClick={() => setPicker(false)} className="min-h-11 min-w-11 text-[#6B6258]">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {kinds.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  className="min-h-14 rounded-xl bg-[#E8DFD0] px-3 py-3 text-sm font-medium"
                  onClick={() => {
                    setPicker(false);
                    setKind(item.kind);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {kind ? <AddModal kind={kind} onClose={() => setKind(null)} /> : null}
    </AddFlowContext.Provider>
  );
}
