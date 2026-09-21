import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName } from "@/lib/utils";
import type { Book } from "@/types";

export const revalidate = 0;

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: book } = await supabase.from("books").select("*, profiles(display_name)").eq("id", id).maybeSingle<Book>();
  if (!book) notFound();

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href="/#books" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <div className="mt-6 flex items-start gap-4 sm:gap-5">
        {book.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.image_url} alt={book.title} className="w-28 shrink-0 rounded-xl object-cover sm:w-40" />
        )}
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-[#8B5A6B] px-2 py-0.5 text-[10px] text-[#F4EEE4]">
            {book.status === "reading" ? "読書中" : "読了"}
          </span>
          <h1 className="mt-2 font-display text-2xl font-semibold break-words">{book.title}</h1>
          {book.author && <p className="mt-1 text-sm text-[#6B6258]">{book.author}</p>}
          <p className="mt-1 text-xs text-[#6B6258]">{authorName(book)}が投稿</p>
        </div>
      </div>
      {book.memo && <p className="mt-6 text-sm leading-relaxed text-[#3D362E]">{book.memo}</p>}
    </div>
  );
}
