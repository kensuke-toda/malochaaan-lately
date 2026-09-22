import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName } from "@/lib/utils";
import type { Podcast } from "@/types";

export const revalidate = 0;

export default async function PodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: podcast } = await supabase.from("podcasts").select("*, profiles(display_name)").eq("id", id).maybeSingle<Podcast>();
  if (!podcast) notFound();

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href="/#podcasts" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <div className="mt-6 flex items-start gap-4 sm:gap-5">
        {podcast.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={podcast.image_url} alt={podcast.title} className="h-28 w-28 shrink-0 rounded-xl object-cover sm:h-40 sm:w-40" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#6B6258]">{authorName(podcast)}が投稿</p>
          <h1 className="mt-1 font-display text-2xl font-semibold break-words">{podcast.title}</h1>
          {podcast.artist && <p className="mt-1 text-sm text-[#6B6258]">{podcast.artist}</p>}
          {podcast.url && (
            <a href={podcast.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline underline-offset-2">
              聴く →
            </a>
          )}
        </div>
      </div>
      {podcast.memo && <p className="mt-6 text-sm leading-relaxed text-[#3D362E]">{podcast.memo}</p>}
    </div>
  );
}
