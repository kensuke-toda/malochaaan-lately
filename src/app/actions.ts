"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.from("things").insert({
    name,
    brand: String(formData.get("brand") ?? "").trim() || null,
    product_url: String(formData.get("product_url") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    original_image_url: originalImageUrl,
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
  const supabase = await createUserClient();
  const { error } = await supabase.from("places").insert({
    name,
    visited_date: String(formData.get("visited_date") ?? "") || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    image_url: imageUrl,
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function createBookAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "書名は必須です" };
  const image = formData.get("image");
  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage("books-images", image);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "画像のアップロードに失敗しました" };
    }
  }
  const status = String(formData.get("status") ?? "finished");
  const supabase = await createUserClient();
  const { error } = await supabase.from("books").insert({
    title,
    author: String(formData.get("author") ?? "").trim() || null,
    status: status === "reading" ? "reading" : "finished",
    memo: String(formData.get("memo") ?? "").trim() || null,
    image_url: imageUrl,
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
  const { error } = await supabase.from("sounds").insert({
    title,
    artist: String(formData.get("artist") ?? "").trim() || null,
    url: String(formData.get("url") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    image_url: imageUrl,
    created_by: user.id,
  });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateAll();
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "タイトルは必須です" };
  const supabase = await createUserClient();
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title,
      body: String(formData.get("body") ?? "").trim() || null,
      entry_date: String(formData.get("entry_date") ?? "") || null,
      created_by: user.id,
    })
    .select()
    .single();
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

export async function createWorkAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "タイトルは必須です" };
  const supabase = await createUserClient();
  const { error } = await supabase.from("works").insert({
    title,
    period_label: String(formData.get("period_label") ?? "").trim() || null,
    summary: String(formData.get("summary") ?? "").trim() || null,
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
export async function deletePostAction(formData: FormData) {
  await deleteOwn("posts", String(formData.get("id") ?? ""));
}
export async function deleteWorkAction(formData: FormData) {
  await deleteOwn("works", String(formData.get("id") ?? ""));
}
