import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isWantRow, stripWantMark } from "@/lib/intent";
import { authorName } from "@/lib/utils";
import type { Podcast } from "@/types";

export const revalidate = 0;

export default async function PodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: podcast } = await supabase.from("podcasts").select("*, profiles(display_name)").eq("id", id).maybeSingle<Podcast>();
  if (!podcast) notFound();
  const title = stripWantMark(podcast.title);
  const memo = stripWantMark(podcast.memo);

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href={isWantRow(podcast) ? "/soon#podcasts" : "/#podcasts"} className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      {podcast.image_url ? (
        <div className="relative mt-6 aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={podcast.image_url} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : null}
      <p className="mt-6 text-xs text-[#6B6258]">{authorName(podcast)}が投稿</p>
      <h1 className="mt-1 font-display text-2xl font-semibold break-words">{title}</h1>
      {podcast.artist && <p className="mt-1 text-sm text-[#6B6258]">{podcast.artist}</p>}
      {podcast.url && (
        <a href={podcast.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline underline-offset-2">
          聴く →
        </a>
      )}
      {memo ? <p className="mt-6 text-sm leading-relaxed text-[#3D362E]">{memo}</p> : null}
    </div>
  );
}
