"use client";

import { useState } from "react";
import { lookupBookByIsbnAction, type BookLookupResult } from "@/app/actions";
import { decodeBookIsbnFromFile } from "@/lib/books/decode-barcode";
import { normalizeIsbn } from "@/lib/books/isbn";

export function BookIsbnLookup({
  disabled,
  onFound,
}: {
  disabled?: boolean;
  onFound: (book: BookLookupResult) => void;
}) {
  const [isbn, setIsbn] = useState("");
  const [busy, setBusy] = useState<"scan" | "lookup" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "error">("ok");

  async function lookup(raw: string) {
    const normalized = normalizeIsbn(raw);
    if (!normalized) {
      setMessageKind("error");
      setMessage("ISBNの形式が正しくありません。978/979で始まる10桁または13桁を入力してください。");
      return;
    }
    setIsbn(normalized);
    setBusy("lookup");
    setMessageKind("ok");
    setMessage("書誌情報を取得しています…");
    try {
      const result = await lookupBookByIsbnAction(normalized);
      if (result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }
      if (!result.book) {
        setMessageKind("error");
        setMessage("書誌情報が見つかりませんでした。手入力してください。");
        return;
      }
      onFound(result.book);
      setMessageKind("ok");
      setMessage(`「${result.book.title}」を入力しました`);
    } catch (err) {
      setMessageKind("error");
      setMessage(err instanceof Error ? err.message : "書誌情報の取得に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleScan(file: File | undefined) {
    if (!file) return;
    setBusy("scan");
    setMessageKind("ok");
    setMessage("バーコードを読み取っています…");
    try {
      const decoded = await decodeBookIsbnFromFile(file);
      if (!decoded.ok) {
        setMessageKind("error");
        setMessage(decoded.error);
        setBusy(null);
        return;
      }
      await lookup(decoded.isbn);
    } catch (err) {
      setMessageKind("error");
      setMessage(err instanceof Error ? err.message : "バーコードの読み取りに失敗しました");
      setBusy(null);
    }
  }

  const locked = disabled || busy !== null;

  function handleManualLookup() {
    void lookup(isbn);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[#E8DFD0] p-3">
      <p className="text-xs leading-relaxed text-[#6B6258]">バーコードを撮るか、ISBNを入力して書名・著者・書影を自動入力できます。</p>
      <label className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[#2F2A24] px-4 text-sm font-semibold text-[#F4EEE4]">
        {busy === "scan" ? "読み取り中…" : "バーコードを撮る / 選ぶ"}
        <input
          type="file"
          accept="image/*"
          disabled={locked}
          className="absolute inset-0 cursor-pointer opacity-0"
          ref={(el) => {
            if (el) el.setAttribute("capture", "environment");
          }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void handleScan(file);
          }}
        />
      </label>
      <div className="flex gap-2">
        <input
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="ISBN（978…）"
          disabled={locked}
          className="min-w-0 flex-1 rounded-xl bg-[#F4EEE4] px-3 py-2.5 text-base"
        />
        <button
          type="button"
          disabled={locked || !isbn.trim()}
          onClick={handleManualLookup}
          className="min-h-11 shrink-0 rounded-full bg-[#8B5A6B] px-3 text-sm font-semibold text-[#F4EEE4] disabled:opacity-60"
        >
          {busy === "lookup" ? "取得中…" : "書誌を取得"}
        </button>
      </div>
      {message ? (
        <p className={`text-xs leading-relaxed ${messageKind === "error" ? "text-[#B85C38]" : "text-[#6B6258]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
