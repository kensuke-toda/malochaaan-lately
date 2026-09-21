import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DiaryEntry, Thing } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  createDiaryEntryAction,
  createThingAction,
  deleteDiaryEntryAction,
  deleteThingAction,
  loginAction,
  logoutAction,
} from "./actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const authenticated = await isAdminAuthenticated();
  const { error } = await searchParams;

  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <h1 className="mb-6 text-xl font-semibold">管理画面ログイン</h1>
        <form action={loginAction} className="flex flex-col gap-3">
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-700"
          >
            ログイン
          </button>
          {error && (
            <p className="text-sm text-red-600">パスワードが違います</p>
          )}
        </form>
      </div>
    );
  }

  const configured = isSupabaseConfigured();
  let things: Thing[] | null = null;
  let diaryEntries: DiaryEntry[] | null = null;

  if (configured) {
    const supabase = createClient();
    const [thingsRes, diaryRes] = await Promise.all([
      supabase
        .from("things")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("diary_entries")
        .select("*")
        .order("entry_date", { ascending: false }),
    ]);
    things = thingsRes.data;
    diaryEntries = diaryRes.data;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">管理画面</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-zinc-500 underline">
            ログアウト
          </button>
        </form>
      </div>

      {!configured && (
        <div className="mb-8 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabaseが未設定のため、保存はできません。<code>.env.local</code>
          を設定してください。
        </div>
      )}

      {/* Things 追加フォーム */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">モノを追加</h2>
        <form
          action={createThingAction}
          className="flex flex-col gap-3 rounded border border-zinc-200 p-4"
        >
          <input
            type="text"
            name="name"
            placeholder="商品名（必須）"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <input
            type="text"
            name="brand"
            placeholder="ブランド名"
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <input
            type="url"
            name="product_url"
            placeholder="商品ページURL"
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <textarea
            name="memo"
            placeholder="メモ"
            rows={2}
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <input type="file" name="image" accept="image/*" />
          <p className="text-xs text-zinc-500">
            背景透過は未実装です（Phase
            2で自動化予定）。透過済み画像を用意できる場合は事前に加工してからアップロードしてください。
          </p>
          <button
            type="submit"
            className="self-start rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
          >
            追加する
          </button>
        </form>

        <ul className="mt-4 divide-y divide-zinc-200">
          {(things as Thing[] | null)?.map((thing) => (
            <li
              key={thing.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span>
                {thing.brand && (
                  <span className="text-zinc-400">{thing.brand} / </span>
                )}
                {thing.name}
              </span>
              <form action={deleteThingAction}>
                <input type="hidden" name="id" value={thing.id} />
                <button type="submit" className="text-red-600 underline">
                  削除
                </button>
              </form>
            </li>
          ))}
          {!things?.length && (
            <li className="py-2 text-sm text-zinc-400">まだありません</li>
          )}
        </ul>
      </section>

      {/* 日記 追加フォーム */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">日記を追加</h2>
        <form
          action={createDiaryEntryAction}
          className="flex flex-col gap-3 rounded border border-zinc-200 p-4"
        >
          <input
            type="date"
            name="entry_date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <input
            type="text"
            name="title"
            placeholder="タイトル（必須）"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <textarea
            name="body"
            placeholder="本文"
            rows={4}
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <input type="file" name="photos" accept="image/*" multiple />
          <button
            type="submit"
            className="self-start rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
          >
            追加する
          </button>
        </form>

        <ul className="mt-4 divide-y divide-zinc-200">
          {(diaryEntries as DiaryEntry[] | null)?.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span>
                <span className="text-zinc-400">
                  {formatDate(entry.entry_date)} /{" "}
                </span>
                {entry.title}
              </span>
              <form action={deleteDiaryEntryAction}>
                <input type="hidden" name="id" value={entry.id} />
                <button type="submit" className="text-red-600 underline">
                  削除
                </button>
              </form>
            </li>
          ))}
          {!diaryEntries?.length && (
            <li className="py-2 text-sm text-zinc-400">まだありません</li>
          )}
        </ul>
      </section>
    </div>
  );
}
