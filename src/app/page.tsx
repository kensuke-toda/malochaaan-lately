import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DiaryEntry, Thing } from "@/types";
import { formatDate } from "@/lib/utils";

export const revalidate = 0;

export default async function Home() {
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
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("diary_entries")
        .select("*, diary_photos(*)")
        .order("entry_date", { ascending: false })
        .limit(10),
    ]);
    things = thingsRes.data;
    diaryEntries = diaryRes.data;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-16">
        <h1 className="text-2xl font-semibold">Lately</h1>
        <p className="mt-2 text-sm text-zinc-500">
          最近買ってよかったモノと、日々の日記。
        </p>
      </header>

      {!configured && (
        <div className="mb-12 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabaseが未設定です。<code>.env.local</code>
          にプロジェクトのURLとキーを設定してください（
          <code>.env.example</code> 参照）。
        </div>
      )}

      <section className="mb-16">
        <h2 className="mb-4 text-lg font-semibold">Things</h2>
        {things?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(things as Thing[]).map((thing) => (
              <Link
                key={thing.id}
                href={`/things/${thing.id}`}
                className="group flex flex-col gap-2"
              >
                <div className="aspect-square overflow-hidden rounded bg-zinc-100">
                  {(thing.processed_image_url || thing.original_image_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thing.processed_image_url ?? thing.original_image_url ?? ""}
                      alt={thing.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="text-xs">
                  {thing.brand && (
                    <p className="text-zinc-400">{thing.brand}</p>
                  )}
                  <p className="line-clamp-2">{thing.name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">まだ登録されていません。</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Diary</h2>
        {diaryEntries?.length ? (
          <ul className="flex flex-col gap-6">
            {(diaryEntries as DiaryEntry[]).map((entry) => (
              <li key={entry.id}>
                <Link href={`/diary/${entry.id}`} className="block">
                  <p className="text-xs text-zinc-400">
                    {formatDate(entry.entry_date)}
                  </p>
                  <p className="font-medium">{entry.title}</p>
                  {entry.body && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                      {entry.body}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">まだ登録されていません。</p>
        )}
      </section>
    </div>
  );
}
