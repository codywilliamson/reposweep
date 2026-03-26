import type { APIRoute } from "astro";
import { exchangeCode, encodeSession } from "@/lib/auth";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  if (!code) return redirect("/");

  try {
    const session = await exchangeCode(code);
    cookies.set("session", encodeSession(session), {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return redirect("/dashboard");
  } catch {
    return redirect("/?error=auth_failed");
  }
};
