import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DiaryEntry } from "@/types";
import { formatDate } from "@/lib/utils";

export const revalidate = 0;

export default async function DiaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    notFound();
  }

  const { id } = await params;
  const supabase = createClient();
  const { data: entry } = await supabase
    .from("diary_entries")
    .select("*, diary_photos(*)")
    .eq("id", id)
    .single<DiaryEntry>();

  if (!entry) {
    notFound();
  }

  const photos = [...(entry.diary_photos ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Link href="/" className="text-sm text-zinc-400">
        ← 戻る
      </Link>

      <p className="mt-6 text-sm text-zinc-400">
        {formatDate(entry.entry_date)}
      </p>
      <h1 className="text-xl font-semibold">{entry.title}</h1>

      {entry.body && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">
          {entry.body}
        </p>
      )}

      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={photo.image_url}
              alt={entry.title}
              className="aspect-square w-full rounded object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
