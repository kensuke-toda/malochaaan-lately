"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createUserClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=1");
  }
  redirect("/");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createUserClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
