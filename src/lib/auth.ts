import type { GitHubSession } from "./types";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

export function getLoginUrl(): string {
  const clientId = import.meta.env.GITHUB_CLIENT_ID;
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo delete_repo",
    redirect_uri: getRedirectUri(),
  });
  return `${GITHUB_AUTH_URL}?${params}`;
}

function getRedirectUri(): string {
  const base = import.meta.env.SITE ?? "http://localhost:4321";
  return `${base}/api/auth/callback`;
}

export async function exchangeCode(code: string): Promise<GitHubSession> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: import.meta.env.GITHUB_CLIENT_ID,
      client_secret: import.meta.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const userRes = await fetch(GITHUB_USER_URL, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const user = await userRes.json();

  return {
    accessToken: data.access_token,
    login: user.login,
    avatarUrl: user.avatar_url,
    name: user.name,
  };
}

// simple cookie-based session — encode as base64 json
export function encodeSession(session: GitHubSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export function decodeSession(cookie: string): GitHubSession | null {
  try {
    return JSON.parse(Buffer.from(cookie, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export function getSessionFromCookies(cookies: { get(name: string): { value: string } | undefined }): GitHubSession | null {
  const cookie = cookies.get("session");
  if (!cookie) return null;
  return decodeSession(cookie.value);
}
