import type { APIRoute } from "astro";
import { getLoginUrl, getAuthEnv } from "@/lib/auth";

export const GET: APIRoute = ({ locals }) => {
  const env = getAuthEnv((locals as any).runtime?.env);
  return Response.redirect(getLoginUrl(env), 302);
};
