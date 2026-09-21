import "server-only";
import { createHash } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "lately_admin_session";

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }
  return password;
}

/** パスワードそのものを Cookie に保存しないための固定トークン */
function getExpectedSessionToken() {
  return createHash("sha256").update(getAdminPassword()).digest("hex");
}

export function verifyAdminPassword(password: string) {
  return password === getAdminPassword();
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, getExpectedSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return token === getExpectedSessionToken();
}
