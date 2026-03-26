import type { APIRoute } from "astro";
import { getLoginUrl } from "@/lib/auth";

export const GET: APIRoute = () => {
  return Response.redirect(getLoginUrl(), 302);
};
