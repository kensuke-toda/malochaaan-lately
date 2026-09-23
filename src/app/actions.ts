"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { downloadAllowedCover, findFallbackCover } from "@/lib/books/covers";
import { fetchOpenBdBook } from "@/lib/books/openbd";
import { isBookIsbn, normalizeIsbn } from "@/lib/books/isbn";
import { createUserClient } from "@/lib/supabase/server";
import type { Intent } from "@/types";
import { CORK_BRAND } from "@/lib/data";
import { todayKey } from "@/lib/utils";

const CONTENT_TABLES = ["things", "places", "books", "sounds", "podcasts", "posts", "movies", "works"] as const;
type ContentTable = (typeof CONTENT_TABLES)[number];

function parseIntent(formData: FormData): Intent {
  return formData.get("intent") === "want" ? "want" : "happened";
}

function missingColumn(error: { message?: string } | null | undefined, column: string) {
  const msg = (error?.message ?? "").toLowerCase();
  return msg.includes(column) && (msg.includes("schema cache") || msg.includes("could not find"));
}

function notNullColumn(error: { message?: string } | null | undefined) {
  return error?.message?.match(/null value in column "([^"]+)"/i)?.[1] ?? null;
}

const NOT_NULL_FALLBACKS: Record<string, () => unknown> = {
  visited_date: () => todayKey(),
  entry_date: () => todayKey(),
};

async function insertContent(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  table: ContentTable,
  row: Record<string, unknown>,
  select = false,
) {
  const run = (payload: Record<string, unknown>) =>
    select ? supabase.from(table).insert(payload).select().single() : supabase.from(table).insert(payload);

  let payload = { ...row };
  let result = await run(payload);
  for (let i = 0; i < 4 && result.error; i++) {
    const err = result.error;
    if (missingColumn(err, "intent") && "intent" in payload) {
      const { intent: _intent, ...rest } = payload;
      payload = rest;
      result = await run(payload);
      continue;
    }
    if (table === "posts" && err.message.toLowerCase().includes("title")) {
      payload = { ...payload, title: payload.body };
      result = await run(payload);
      continue;
    }
    const column = notNullColumn(err);
    const fallback = column ? NOT_NULL_FALLBACKS[column] : undefined;
    if (column && fallback && payload[column] == null) {
      payload = { ...payload, [column]: fallback() };
      result = await run(payload);
      continue;
    }
    break;
  }
  return result;
}

export type BookLookupResult = {
  title: string;
  author: string;
  coverUrl: string | null;
};

async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

async function uploadImage(bucket: string, file: File) {
  const supabase = await createUserClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) {
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/soon");
  revalidatePath("/admin");
}

export async function createThingAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "商品名は必須です" };
  const image = formData.get("image");
  let originalImageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      originalImageUrl = await uploadImage("things-images", image);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
  }
  const supabase = await createUserClient();
  const { error } = await insertContent(supabase, "things", {
    name,
    brand: String(formData.get("brand") ?? "").trim() || null,
    product_url: String(formData.get("product_url") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    original_image_url: originalImageUrl,
    intent: parseIntent(formData),
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function createPlaceAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "店名は必須です" };
  const image = formData.get("image");
  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage("places-images", image);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
  }
  const intent = parseIntent(formData);
  const supabase = await createUserClient();
  const { error } = await insertContent(supabase, "places", {
    name,
    visited_date: intent === "want" ? null : String(formData.get("visited_date") ?? "") || todayKey(),
    memo: String(formData.get("memo") ?? "").trim() || null,
    image_url: imageUrl,
    intent,
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

async function uploadCoverFromUrl(coverUrl: string) {
  const cover = await downloadAllowedCover(coverUrl);
  const file = new File([new Uint8Array(cover.bytes)], `cover.${cover.ext}`, { type: cover.contentType });
  return uploadImage("books-images", file);
}

export async function lookupBookByIsbnAction(rawIsbn: string): Promise<{ book?: BookLookupResult; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "ログインが必要です" };
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn || !isBookIsbn(isbn)) {
    return { error: "ISBNの形式が正しくありません。978/979で始まる本のISBNを入力してください。" };
  }
  try {
    const book = await fetchOpenBdBook(isbn);
    if (!book) return { error: "書誌情報が見つかりませんでした。手入力してください。" };
    if (!book.coverUrl) {
      book.coverUrl = await findFallbackCover(isbn);
    }
    return { book };
  } catch {
    return { error: "書誌情報の取得に失敗しました" };
  }
}

export async function createBookAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "書名は必須です" };
  const image = formData.get("image");
  const coverUrl = String(formData.get("cover_url") ?? "").trim();
  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage("books-images", image);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
  } else if (coverUrl) {
    try {
      imageUrl = await uploadCoverFromUrl(coverUrl);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "書影の取得に失敗しました" };
    }
  }
  const intent = parseIntent(formData);
  const status = String(formData.get("status") ?? (intent === "want" ? "reading" : "finished"));
  const supabase = await createUserClient();
  const { error } = await insertContent(supabase, "books", {
    title,
    author: String(formData.get("author") ?? "").trim() || null,
    status: status === "reading" ? "reading" : "finished",
    memo: String(formData.get("memo") ?? "").trim() || null,
    image_url: imageUrl,
    intent,
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function createSoundAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "曲名は必須です" };
  const image = formData.get("image");
  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage("sounds-images", image);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
  }
  const supabase = await createUserClient();
  const { error } = await insertContent(supabase, "sounds", {
    title,
    artist: String(formData.get("artist") ?? "").trim() || null,
    url: String(formData.get("url") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    image_url: imageUrl,
    intent: parseIntent(formData),
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function createPodcastAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "エピソード名は必須です" };
  const image = formData.get("image");
  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage("podcasts-images", image);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
  }
  const supabase = await createUserClient();
  const { error } = await insertContent(supabase, "podcasts", {
    title,
    artist: String(formData.get("artist") ?? "").trim() || null,
    url: String(formData.get("url") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    image_url: imageUrl,
    intent: parseIntent(formData),
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "本文は必須です" };
  const supabase = await createUserClient();
  const { data: post, error } = await insertContent(
    supabase,
    "posts",
    {
      body,
      entry_date: String(formData.get("entry_date") ?? "") || todayKey(),
      intent: parseIntent(formData),
      created_by: user.id,
    },
    true,
  );
  if (error || !post) return { error: `保存に失敗しました: ${error?.message}` };

  const photos = formData
    .getAll("photos")
    .filter((p): p is File => p instanceof File && p.size > 0);
  for (let i = 0; i < photos.length; i++) {
    let url: string;
    try {
      url = await uploadImage("posts-images", photos[i]);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
    const { error: photoError } = await supabase.from("post_photos").insert({
      post_id: post.id,
      image_url: url,
      sort_order: i,
    });
    if (photoError) return { error: `写真の保存に失敗しました: ${photoError.message}` };
  }
  revalidateAll();
}

export async function createMovieAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "タイトルは必須です" };
  const image = formData.get("image");
  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage("movies-images", image);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
  }
  const supabase = await createUserClient();
  const { error } = await insertContent(supabase, "movies", {
    title,
    body: String(formData.get("body") ?? "").trim() || null,
    image_url: imageUrl,
    intent: parseIntent(formData),
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function createWorkAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "タイトルは必須です" };
  const supabase = await createUserClient();
  const { error } = await insertContent(supabase, "works", {
    title,
    period_label: String(formData.get("period_label") ?? "").trim() || null,
    summary: String(formData.get("summary") ?? "").trim() || null,
    intent: parseIntent(formData),
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

async function deleteOwn(table: string, id: string) {
  const user = await requireUser();
  const supabase = await createUserClient();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("created_by", user.id);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);
  revalidateAll();
}

export async function deleteThingAction(formData: FormData) {
  await deleteOwn("things", String(formData.get("id") ?? ""));
}
export async function deletePlaceAction(formData: FormData) {
  await deleteOwn("places", String(formData.get("id") ?? ""));
}
export async function deleteBookAction(formData: FormData) {
  await deleteOwn("books", String(formData.get("id") ?? ""));
}
export async function deleteSoundAction(formData: FormData) {
  await deleteOwn("sounds", String(formData.get("id") ?? ""));
}
export async function deletePodcastAction(formData: FormData) {
  await deleteOwn("podcasts", String(formData.get("id") ?? ""));
}
export async function deletePostAction(formData: FormData) {
  await deleteOwn("posts", String(formData.get("id") ?? ""));
}
export async function deleteMovieAction(formData: FormData) {
  await deleteOwn("movies", String(formData.get("id") ?? ""));
}
export async function deleteWorkAction(formData: FormData) {
  await deleteOwn("works", String(formData.get("id") ?? ""));
}

export async function createPinAction(formData: FormData) {
  const user = await requireUser();
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) return { error: "写真は必須です" };
  let imageUrl: string;
  try {
    imageUrl = await uploadImage("things-images", image);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
  }
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const layout = JSON.stringify({
    x: Number(formData.get("x") ?? 0.5),
    y: Number(formData.get("y") ?? 0.45),
    scale: Number(formData.get("scale") ?? 1),
    rotation: Number(formData.get("rotation") ?? 0),
  });
  const supabase = await createUserClient();
  const { data: top } = await supabase
    .from("things")
    .select("sort_order")
    .eq("brand", CORK_BRAND)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("things").insert({
    name: memo || "ステッカー",
    brand: CORK_BRAND,
    product_url: layout,
    memo,
    original_image_url: imageUrl,
    sort_order: (top?.sort_order ?? 0) + 1,
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function updatePinLayoutAction(input: {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_index: number;
}) {
  const user = await requireUser();
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("things")
    .update({
      product_url: JSON.stringify({
        x: input.x,
        y: input.y,
        scale: input.scale,
        rotation: input.rotation,
      }),
      sort_order: input.z_index,
    })
    .eq("id", input.id)
    .eq("brand", CORK_BRAND)
    .eq("created_by", user.id);
  if (error) throw new Error(`更新に失敗しました: ${error.message}`);
}

export async function deletePinAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("things")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("created_by", user.id);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);
  revalidateAll();
}

export async function recordHappenedAction(formData: FormData) {
  const user = await requireUser();
  const table = String(formData.get("table") ?? "") as ContentTable;
  const id = String(formData.get("id") ?? "");
  if (!CONTENT_TABLES.includes(table) || !id) throw new Error("不正なリクエストです");

  const extra: Record<string, unknown> = { intent: "happened" };
  if (table === "places") extra.visited_date = todayKey();
  if (table === "posts" || table === "movies") extra.entry_date = todayKey();

  const supabase = await createUserClient();
  let { error } = await supabase.from(table).update(extra).eq("id", id).eq("created_by", user.id);
  if (missingColumn(error, "intent") && "intent" in extra) {
    const { intent: _intent, ...rest } = extra;
    if (Object.keys(rest).length) {
      ({ error } = await supabase.from(table).update(rest).eq("id", id).eq("created_by", user.id));
    } else {
      error = null;
    }
  }
  if (error) throw new Error(`更新に失敗しました: ${error.message}`);
  revalidateAll();
}
