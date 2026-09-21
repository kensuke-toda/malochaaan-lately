"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  isAdminAuthenticated,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/admin?error=1");
  }
  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin");
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
}

async function uploadImage(bucket: string, file: File) {
  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function createThingAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const productUrl = String(formData.get("product_url") ?? "").trim() || null;
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const image = formData.get("image") as File | null;

  if (!name) {
    throw new Error("名前は必須です");
  }

  let originalImageUrl: string | null = null;
  if (image && image.size > 0) {
    originalImageUrl = await uploadImage("things-images", image);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("things").insert({
    name,
    brand,
    product_url: productUrl,
    memo,
    original_image_url: originalImageUrl,
    // 背景透過処理（processed_image_url）は Phase 2 で自動化予定。
    // それまでは original_image_url をそのまま表示に使う。
  });
  if (error) {
    throw new Error(`保存に失敗しました: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteThingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("things").delete().eq("id", id);
  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createDiaryEntryAction(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const entryDate = String(formData.get("entry_date") ?? "").trim();
  const photos = formData.getAll("photos") as File[];

  if (!title) {
    throw new Error("タイトルは必須です");
  }

  const supabase = createAdminClient();
  const { data: entry, error } = await supabase
    .from("diary_entries")
    .insert({
      title,
      body,
      entry_date: entryDate || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error || !entry) {
    throw new Error(`保存に失敗しました: ${error?.message}`);
  }

  const validPhotos = photos.filter((p) => p && p.size > 0);
  for (let i = 0; i < validPhotos.length; i++) {
    const url = await uploadImage("diary-images", validPhotos[i]);
    const { error: photoError } = await supabase.from("diary_photos").insert({
      diary_entry_id: entry.id,
      image_url: url,
      sort_order: i,
    });
    if (photoError) {
      throw new Error(`写真の保存に失敗しました: ${photoError.message}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteDiaryEntryAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("diary_entries").delete().eq("id", id);
  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}
