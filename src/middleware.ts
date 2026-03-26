import { defineMiddleware } from "astro:middleware";
import { getSessionFromCookies } from "./lib/auth";

const PROTECTED = ["/dashboard"];

export const onRequest = defineMiddleware((ctx, next) => {
  const isProtected = PROTECTED.some((p) => ctx.url.pathname.startsWith(p));

  if (isProtected) {
    const session = getSessionFromCookies(ctx.cookies);
    if (!session) return ctx.redirect("/");
    ctx.locals.session = session;
  }

  return next();
});
