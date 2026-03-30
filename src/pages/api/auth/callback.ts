import type { APIRoute } from "astro";
import { exchangeCode, getAuthEnv, persistSession } from "@/lib/auth";
import { getRuntimeEnv } from "@/lib/storage";

export const GET: APIRoute = async ({ url, cookies, redirect, locals }) => {
  const code = url.searchParams.get("code");
  if (!code) return redirect("/");

  const runtimeEnv = getRuntimeEnv(locals);
  const env = getAuthEnv(runtimeEnv);

  try {
    const session = await exchangeCode(code, env);
    await persistSession(cookies, session, runtimeEnv);
    return redirect("/dashboard");
  } catch (e: any) {
    return redirect(`/?error=${encodeURIComponent(e.message || "auth_failed")}`);
  }
};
