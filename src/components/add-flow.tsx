"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AddModal, type ModalKind } from "@/components/add-modal";
import type { Intent } from "@/types";

const happenedKinds: { kind: ModalKind; label: string }[] = [
  { kind: "place", label: "お店" },
  { kind: "thing", label: "モノ" },
  { kind: "book", label: "本" },
  { kind: "movie", label: "映画" },
  { kind: "sound", label: "音楽" },
  { kind: "podcast", label: "ポッドキャスト" },
  { kind: "post", label: "投稿" },
  { kind: "work", label: "仕事" },
];

const wantKinds: { kind: ModalKind; label: string }[] = [
  { kind: "place", label: "行きたいお店" },
  { kind: "thing", label: "欲しいもの" },
  { kind: "book", label: "読みたい本" },
  { kind: "movie", label: "観たい映画" },
  { kind: "sound", label: "聴きたい音楽" },
  { kind: "podcast", label: "聴きたいポッドキャスト" },
  { kind: "post", label: "やりたいこと" },
  { kind: "work", label: "やりたい仕事" },
];

type AddFlowValue = {
  loggedIn: boolean;
  intent: Intent;
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
  const pathname = usePathname();
  const intent: Intent = pathname === "/soon" ? "want" : "happened";
  const kinds = intent === "want" ? wantKinds : happenedKinds;
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
    <AddFlowContext.Provider value={{ loggedIn, intent, openAdd }}>
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
              <h3 className="font-display text-lg font-semibold">{intent === "want" ? "これから何を？" : "何を追加する？"}</h3>
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
      {kind ? <AddModal kind={kind} intent={intent} onClose={() => setKind(null)} /> : null}
    </AddFlowContext.Provider>
  );
}
