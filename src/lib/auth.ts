import type { GitHubSession } from "./types";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

interface AuthEnv {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

// in prod: read from cloudflare runtime bindings
// in dev: read from import.meta.env (populated by .env file)
export function getAuthEnv(runtimeEnv?: Record<string, unknown>): AuthEnv {
  if (import.meta.env.DEV) {
    return {
      GITHUB_CLIENT_ID: import.meta.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: import.meta.env.GITHUB_CLIENT_SECRET,
    };
  }
  return {
    GITHUB_CLIENT_ID: (runtimeEnv?.GITHUB_CLIENT_ID as string) ?? "",
    GITHUB_CLIENT_SECRET: (runtimeEnv?.GITHUB_CLIENT_SECRET as string) ?? "",
  };
}

function getRedirectUri(): string {
  const base = import.meta.env.DEV ? "http://localhost:4321" : import.meta.env.SITE;
  return `${base}/api/auth/callback`;
}

export function getLoginUrl(env: AuthEnv): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: "repo delete_repo",
    redirect_uri: getRedirectUri(),
  });
  return `${GITHUB_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string, env: AuthEnv): Promise<GitHubSession> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "RepoSweep",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const userRes = await fetch(GITHUB_USER_URL, {
    headers: { Authorization: `Bearer ${data.access_token}`, "User-Agent": "RepoSweep" },
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
  return btoa(JSON.stringify(session));
}

export function decodeSession(cookie: string): GitHubSession | null {
  try {
    return JSON.parse(atob(cookie));
  } catch {
    return null;
  }
}

export function getSessionFromCookies(cookies: { get(name: string): { value: string } | undefined }): GitHubSession | null {
  const cookie = cookies.get("session");
  if (!cookie) return null;
  return decodeSession(cookie.value);
}
