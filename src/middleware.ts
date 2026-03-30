import { defineMiddleware } from "astro:middleware";
import { getSessionFromCookies } from "./lib/auth";
import { getRuntimeEnv } from "./lib/storage";

const PROTECTED = ["/dashboard", "/insights"];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const isProtected = PROTECTED.some((p) => ctx.url.pathname.startsWith(p));

  if (isProtected) {
    const session = await getSessionFromCookies(ctx.cookies, getRuntimeEnv(ctx.locals));
    if (!session) return ctx.redirect("/");
    ctx.locals.session = session;
  }

  return next();
});
