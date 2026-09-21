import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName } from "@/lib/utils";
import type { Sound } from "@/types";

export const revalidate = 0;

export default async function SoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: sound } = await supabase.from("sounds").select("*, profiles(display_name)").eq("id", id).maybeSingle<Sound>();
  if (!sound) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Link href="/#sounds" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <div className="mt-6 flex gap-5">
        {sound.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sound.image_url} alt={sound.title} className="h-32 w-32 rounded-xl object-cover sm:h-40 sm:w-40" />
        )}
        <div>
          <p className="text-xs text-[#6B6258]">{authorName(sound)}が投稿</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">{sound.title}</h1>
          {sound.artist && <p className="mt-1 text-sm text-[#6B6258]">{sound.artist}</p>}
          {sound.url && (
            <a href={sound.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline underline-offset-2">
              聴く →
            </a>
          )}
        </div>
      </div>
      {sound.memo && <p className="mt-6 text-sm leading-relaxed text-[#3D362E]">{sound.memo}</p>}
    </div>
  );
}
