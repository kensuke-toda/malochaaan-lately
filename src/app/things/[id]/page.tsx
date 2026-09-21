import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName } from "@/lib/utils";
import type { Thing } from "@/types";

export const revalidate = 0;

export default async function ThingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: thing } = await supabase.from("things").select("*, profiles(display_name)").eq("id", id).maybeSingle<Thing>();
  if (!thing) notFound();
  const imageUrl = thing.processed_image_url ?? thing.original_image_url;

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href="/#things" className="inline-block text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <div className="relative mt-6 aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={thing.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="mt-6">
        <p className="text-xs text-[#6B6258]">{authorName(thing)}が投稿</p>
        {thing.brand ? <p className="mt-2 text-sm text-[#6B6258]">{thing.brand}</p> : null}
        <h1 className="mt-1 font-display text-2xl font-semibold break-words">{thing.name}</h1>
        {thing.memo ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#3D362E]">{thing.memo}</p>
        ) : null}
        {thing.product_url ? (
          <a
            href={thing.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm underline underline-offset-2"
          >
            商品ページ →
          </a>
        ) : null}
      </div>
    </div>
  );
}
