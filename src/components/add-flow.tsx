"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AddModal, type ModalKind } from "@/components/add-modal";
import { clearPhotoDraft } from "@/lib/photo-draft";
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
  { kind: "work", label: "やりたい仕事" },
];

const KIND_SET = new Set<string>(happenedKinds.map((item) => item.kind));

function isModalKind(value: string | null | undefined): value is ModalKind {
  return Boolean(value && KIND_SET.has(value));
}

function readAddKindFromUrl() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("add");
  return isModalKind(value) ? value : null;
}

function writeAddKindToUrl(kind: ModalKind | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (kind) url.searchParams.set("add", kind);
  else url.searchParams.delete("add");
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(window.history.state, "", next);
}

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restore = () => {
      if (!loggedIn) {
        writeAddKindToUrl(null);
        setKind(null);
        setHydrated(true);
        return;
      }
      setKind(readAddKindFromUrl());
      setHydrated(true);
    };
    restore();
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, [loggedIn, pathname]);

  function openKind(next: ModalKind) {
    setPicker(false);
    setKind(next);
    writeAddKindToUrl(next);
  }

  function closeKind() {
    if (kind) void clearPhotoDraft(`add:${kind}`);
    setKind(null);
    writeAddKindToUrl(null);
  }

  function openAdd(next?: ModalKind) {
    if (!loggedIn) return;
    if (next) {
      openKind(next);
      return;
    }
    setKind(null);
    writeAddKindToUrl(null);
    setPicker(true);
  }

  const activeKind = loggedIn && hydrated ? kind : null;

  return (
    <AddFlowContext.Provider value={{ loggedIn, intent, openAdd }}>
      <div className={activeKind ? "hidden" : undefined}>{children}</div>
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
                  onClick={() => openKind(item.kind)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {activeKind ? <AddModal key={activeKind} kind={activeKind} intent={intent} onClose={closeKind} /> : null}
    </AddFlowContext.Provider>
  );
}
