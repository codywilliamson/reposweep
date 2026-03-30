import type { APIRoute } from "astro";
import { getSessionFromCookies } from "@/lib/auth";
import * as github from "@/lib/github";
import { getRuntimeEnv } from "@/lib/storage";

export const POST: APIRoute = async ({ params, request, cookies, locals }) => {
  const session = await getSessionFromCookies(cookies, getRuntimeEnv(locals));
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const { owner, repo } = body;
  const action = params.action;

  try {
    switch (action) {
      case "toggle-visibility":
        await github.toggleVisibility(session.accessToken, owner, repo, body.private);
        break;
      case "delete":
        await github.deleteRepo(session.accessToken, owner, repo);
        break;
      case "rename":
        await github.renameRepo(session.accessToken, owner, repo, body.newName);
        break;
      case "update-description":
        await github.updateDescription(session.accessToken, owner, repo, body.description);
        break;
      case "toggle-archive":
        await github.toggleArchive(session.accessToken, owner, repo, body.archived);
        break;
      default:
        return new Response("Unknown action", { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e.status || 500;
    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }
};
