import type { APIRoute } from "astro";
import { clearSession } from "@/lib/auth";
import { getRuntimeEnv } from "@/lib/storage";

export const GET: APIRoute = async ({ cookies, redirect, locals }) => {
  await clearSession(cookies, getRuntimeEnv(locals));
  return redirect("/");
};
