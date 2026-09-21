import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName, formatDate } from "@/lib/utils";
import type { Place } from "@/types";

export const revalidate = 0;

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: place } = await supabase.from("places").select("*, profiles(display_name)").eq("id", id).maybeSingle<Place>();
  if (!place) notFound();

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href="/#places" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <div className="relative mt-6 aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
        {place.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.image_url} alt={place.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      <p className="mt-6 text-xs text-[#6B6258]">
        {authorName(place)}が投稿 ・ {formatDate(place.visited_date)}
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold break-words">{place.name}</h1>
      {place.memo && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#3D362E]">{place.memo}</p>}
    </div>
  );
}
