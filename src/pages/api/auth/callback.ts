import type { APIRoute } from "astro";
import { exchangeCode, encodeSession, getAuthEnv } from "@/lib/auth";

export const GET: APIRoute = async ({ url, cookies, redirect, locals }) => {
  const code = url.searchParams.get("code");
  if (!code) return redirect("/");

  const env = getAuthEnv((locals as any).runtime?.env);

  try {
    const session = await exchangeCode(code, env);
    cookies.set("session", encodeSession(session), {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return redirect("/dashboard");
  } catch (e: any) {
    return redirect(`/?error=${encodeURIComponent(e.message || "auth_failed")}`);
  }
};
