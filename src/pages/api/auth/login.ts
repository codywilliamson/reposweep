import type { APIRoute } from "astro";
import { getLoginUrl, getAuthEnv } from "@/lib/auth";
import { getRuntimeEnv } from "@/lib/storage";

export const GET: APIRoute = ({ locals }) => {
  const env = getAuthEnv(getRuntimeEnv(locals));
  return Response.redirect(getLoginUrl(env), 302);
};
