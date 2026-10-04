"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createBookAction,
  createMovieAction,
  createPlaceAction,
  createPodcastAction,
  createPostAction,
  createSoundAction,
  createThingAction,
  createWorkAction,
  type BookLookupResult,
} from "@/app/actions";
import { BookIsbnLookup } from "@/components/book-isbn-lookup";
import { PhotoField, useModalScrollLock } from "@/components/photo-field";
import { clearPhotoDraft, loadPhotoDraft, peekPhotoDraft, setPhotoDraft } from "@/lib/photo-draft";
import { todayKey } from "@/lib/utils";
import type { Intent } from "@/types";

export type ModalKind = "place" | "thing" | "book" | "sound" | "podcast" | "post" | "movie" | "work";

async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
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
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function BookFields({ disabled, intent }: { disabled: boolean; intent: Intent }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  function applyLookup(book: BookLookupResult) {
    setTitle(book.title);
    setAuthor(book.author);
    setCoverUrl(book.coverUrl ?? "");
  }

  return (
    <>
      <BookIsbnLookup disabled={disabled} onFound={applyLookup} />
      <input
        name="title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="書名（必須）"
        className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base"
      />
      <input
        name="author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="著者"
        className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base"
      />
      <input type="hidden" name="cover_url" value={coverUrl} />
      {coverUrl ? (
        <div className="flex items-center gap-3 rounded-xl bg-[#E8DFD0] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="" className="h-20 w-14 shrink-0 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#6B6258]">取得した書影を使います。下で写真を選ぶと差し替えます。</p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setCoverUrl("")}
              className="mt-2 min-h-11 text-sm text-[#B85C38]"
            >
              書影を外す
            </button>
          </div>
        </div>
      ) : null}
      {intent === "want" ? (
        <input type="hidden" name="status" value="reading" />
      ) : (
        <select name="status" defaultValue="finished" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base">
          <option value="finished">読了</option>
          <option value="reading">読書中</option>
        </select>
      )}
      <textarea name="memo" placeholder={intent === "want" ? "メモ" : "感想・メモ"} rows={2} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
    </>
  );
}

export function AddModal({ kind, intent, onClose }: { kind: ModalKind; intent: Intent; onClose: () => void }) {
  const want = intent === "want";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titles: Record<ModalKind, string> = want
    ? {
        place: "行きたいお店",
        thing: "欲しいもの",
        book: "読みたい本",
        sound: "聴きたい音楽",
        podcast: "聴きたいポッドキャスト",
        post: "やりたいこと",
        movie: "観たい映画",
        work: "やりたい仕事",
      }
    : {
        place: "お店を追加",
        thing: "モノを追加",
        book: "本を追加",
        sound: "音楽を追加",
        podcast: "ポッドキャストを追加",
        post: "投稿を追加",
        movie: "映画を追加",
        work: "仕事を追加",
      };
  const actions = {
    place: createPlaceAction,
    thing: createThingAction,
    book: createBookAction,
    sound: createSoundAction,
    podcast: createPodcastAction,
    post: createPostAction,
    movie: createMovieAction,
    work: createWorkAction,
  };
  const today = todayKey();
  const router = useRouter();
  useModalScrollLock();
  const draftKey = `add:${kind}`;
  const [photos, setPhotos] = useState<File[]>(() => peekPhotoDraft(draftKey));
  const photoKey = kind === "post" ? "photos" : "image";

  useEffect(() => {
    let active = true;
    const hydrate = () => {
      const cached = peekPhotoDraft(draftKey);
      if (cached.length) {
        setPhotos(cached);
        return;
      }
      void loadPhotoDraft(draftKey).then((files) => {
        if (active && files.length) setPhotos(files);
      });
    };
    hydrate();
    const onPhotos = (event: Event) => {
      const detail = (event as CustomEvent<{ draftKey?: string }>).detail;
      if (detail?.draftKey && detail.draftKey !== draftKey) return;
      hydrate();
    };
    window.addEventListener("lately:photos-picked", onPhotos);
    window.addEventListener("pageshow", hydrate);
    window.addEventListener("focus", hydrate);
    return () => {
      active = false;
      window.removeEventListener("lately:photos-picked", onPhotos);
      window.removeEventListener("pageshow", hydrate);
      window.removeEventListener("focus", hydrate);
    };
  }, [draftKey]);

  function updatePhotos(next: File[]) {
    setPhotoDraft(draftKey, next);
    setPhotos(next);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.delete("image");
    fd.delete("photos");
    try {
      for (const file of photos) {
        fd.append(photoKey, await compressImage(file));
      }
      const result = await actions[kind](fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await clearPhotoDraft(draftKey);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-[#F4EEE4]">
        <form className="mx-auto flex w-full max-w-md flex-col gap-3 px-6 pt-6" onSubmit={handleSubmit}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{titles[kind]}</h3>
            <button type="button" onClick={onClose} disabled={pending} className="min-h-11 min-w-11 text-[#6B6258]">
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-3 pb-3">
          <input type="hidden" name="intent" value={intent} />
          {kind === "place" && (
            <>
              <input name="name" required placeholder="店名（必須）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="area" placeholder="エリア・最寄り" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              {want ? null : (
                <input name="visited_date" type="date" defaultValue={today} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              )}
              <textarea name="memo" placeholder="メモ" rows={2} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
            </>
          )}
          {kind === "thing" && (
            <>
              <input name="name" required placeholder="商品名（必須）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="brand" placeholder="ブランド名" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="product_url" type="url" placeholder="商品ページURL" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <textarea name="memo" placeholder="メモ" rows={2} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
            </>
          )}
          {kind === "book" && (
            <>
              <BookFields disabled={pending} intent={intent} />
            </>
          )}
          {kind === "sound" && (
            <>
              <input name="title" required placeholder="曲名（必須）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="artist" placeholder="アーティスト" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="url" type="url" placeholder="リンク" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <textarea name="memo" placeholder="メモ" rows={2} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
            </>
          )}
          {kind === "podcast" && (
            <>
              <input name="title" required placeholder="エピソード名（必須）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="artist" placeholder="番組・ホスト" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="url" type="url" placeholder="リンク" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <textarea name="memo" placeholder="メモ" rows={2} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
            </>
          )}
          {kind === "post" && (
            <>
              <textarea
                name="body"
                required
                placeholder={want ? "やりたいこと" : "いまなにしてる？"}
                rows={5}
                className="w-full min-w-0 resize-y rounded-xl bg-[#E8DFD0] px-3 py-3 text-base leading-relaxed"
              />
              {want ? null : (
                <input name="entry_date" type="date" defaultValue={today} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              )}
            </>
          )}
          {kind === "movie" && (
            <>
              <input name="title" required placeholder="タイトル（必須）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <textarea name="body" placeholder={want ? "なぜ観たいか" : "感想"} rows={3} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
            </>
          )}
          {kind === "work" && (
            <>
              <input name="title" required placeholder="タイトル（必須）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <input name="period_label" placeholder="期間（例: 2026年9月〜）" className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
              <textarea name="summary" placeholder="サマリ" rows={4} className="w-full min-w-0 rounded-xl bg-[#E8DFD0] px-3 py-2.5 text-base" />
            </>
          )}
          </div>
          <div className="flex flex-col gap-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {kind === "place" ? <PhotoField label="お店の写真を選択" draftKey={draftKey} files={photos} onFiles={updatePhotos} /> : null}
            {kind === "thing" || kind === "movie" ? <PhotoField label="写真を選択" draftKey={draftKey} files={photos} onFiles={updatePhotos} /> : null}
            {kind === "book" || kind === "podcast" ? <PhotoField label="カバー画像を選択" draftKey={draftKey} files={photos} onFiles={updatePhotos} /> : null}
            {kind === "sound" ? <PhotoField label="ジャケット画像を選択" draftKey={draftKey} files={photos} onFiles={updatePhotos} /> : null}
            {kind === "post" && !want ? (
              <PhotoField label="写真を選択（複数可）" draftKey={draftKey} multiple files={photos} onFiles={updatePhotos} />
            ) : null}
            {error ? <p className="text-sm text-[#B85C38]">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-full bg-[#B85C38] px-4 py-2.5 text-sm font-semibold text-[#F4EEE4] disabled:opacity-60"
            >
              {pending ? "追加中…" : "追加する"}
            </button>
          </div>
        </form>
    </div>
  );
}
