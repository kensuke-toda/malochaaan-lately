"use server";

import { logoutAction as logout } from "@/app/login/actions";

export async function logoutAction() {
  await logout();
}
