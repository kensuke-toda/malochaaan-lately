import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isWantRow, stripWantMark } from "@/lib/intent";
import { authorName } from "@/lib/utils";
import type { Book } from "@/types";

export const revalidate = 0;

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: book } = await supabase.from("books").select("*, profiles(display_name)").eq("id", id).maybeSingle<Book>();
  if (!book) notFound();
  const want = isWantRow(book);
  const memo = stripWantMark(book.memo);

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href={want ? "/soon#books" : "/#books"} className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      {book.image_url ? (
        <div className="relative mt-6 aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={book.image_url} alt={book.title} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : null}
      {want ? null : (
        <span className="mt-6 inline-block rounded-full bg-[#8B5A6B] px-2 py-0.5 text-[10px] text-[#F4EEE4]">
          {book.status === "reading" ? "読書中" : "読了"}
        </span>
      )}
      <h1 className={`${want || !book.image_url ? "mt-6" : "mt-4"} font-display text-2xl font-semibold break-words`}>{book.title}</h1>
      {book.author && <p className="mt-1 text-sm text-[#6B6258]">{book.author}</p>}
      <p className="mt-1 text-xs text-[#6B6258]">{authorName(book)}が投稿</p>
      {memo ? <p className="mt-6 text-sm leading-relaxed text-[#3D362E]">{memo}</p> : null}
    </div>
  );
}
