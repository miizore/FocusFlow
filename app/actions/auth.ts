"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE,
  createSessionToken,
  getAdminPassphrase,
} from "@/lib/auth";

export type AuthActionState = {
  success: boolean;
  error?: string;
};

export async function loginWithPassphrase(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const passphrase = String(formData.get("passphrase") ?? "");
  const expected = getAdminPassphrase();

  if (!expected) {
    return {
      success: false,
      error: "服务器未配置 ADMIN_PASSPHRASE，请在 .env.local 中设置。",
    };
  }

  const inputBytes = new TextEncoder().encode(passphrase);
  const expectedBytes = new TextEncoder().encode(expected);
  let mismatch = inputBytes.length === expectedBytes.length ? 0 : 1;
  const len = Math.max(inputBytes.length, expectedBytes.length);
  for (let i = 0; i < len; i += 1) {
    mismatch |= (inputBytes[i] ?? 0) ^ (expectedBytes[i] ?? 0);
  }
  if (mismatch !== 0) {
    return { success: false, error: "口令错误，请重试。" };
  }

  const token = await createSessionToken(expected);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}
