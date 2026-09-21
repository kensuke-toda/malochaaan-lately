import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Thing } from "@/types";

export const revalidate = 0;

export default async function ThingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    notFound();
  }

  const { id } = await params;
  const supabase = createClient();
  const { data: thing } = await supabase
    .from("things")
    .select("*")
    .eq("id", id)
    .single<Thing>();

  if (!thing) {
    notFound();
  }

  const imageUrl = thing.processed_image_url ?? thing.original_image_url;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Link href="/" className="text-sm text-zinc-400">
        ← 戻る
      </Link>

      <div className="mt-6 aspect-square overflow-hidden rounded bg-zinc-100">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={thing.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="mt-6">
        {thing.brand && (
          <p className="text-sm text-zinc-400">{thing.brand}</p>
        )}
        <h1 className="text-xl font-semibold">{thing.name}</h1>
        {thing.memo && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">
            {thing.memo}
          </p>
        )}
        {thing.product_url && (
          <a
            href={thing.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm underline"
          >
            商品ページ →
          </a>
        )}
      </div>
    </div>
  );
}
