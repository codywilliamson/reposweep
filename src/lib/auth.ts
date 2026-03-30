import type { GitHubSession } from "./types";
import { getSessionStore } from "./storage";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const SESSION_COOKIE = "session";
const SESSION_TTL = 60 * 60 * 24 * 7;

interface AuthEnv {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

// in prod: read from cloudflare runtime bindings
// in dev: read from import.meta.env (populated by .env file)
export function getAuthEnv(runtimeEnv?: unknown): AuthEnv {
  const env = (runtimeEnv ?? {}) as Record<string, unknown>;

  if (import.meta.env.DEV) {
    return {
      GITHUB_CLIENT_ID: import.meta.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: import.meta.env.GITHUB_CLIENT_SECRET,
    };
  }
  return {
    GITHUB_CLIENT_ID: (env.GITHUB_CLIENT_ID as string) ?? "",
    GITHUB_CLIENT_SECRET: (env.GITHUB_CLIENT_SECRET as string) ?? "",
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

// legacy cookie payload for local fallback when KV is not configured
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

function getSessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    maxAge: SESSION_TTL,
  };
}

export async function persistSession(
  cookies: { set(name: string, value: string, options: Record<string, unknown>): void },
  session: GitHubSession,
  runtimeEnv?: unknown,
) {
  const store = getSessionStore(runtimeEnv);
  const cookieOptions = getSessionCookieOptions();

  if (!store) {
    cookies.set(SESSION_COOKIE, encodeSession(session), cookieOptions);
    return;
  }

  const sessionId = crypto.randomUUID();
  await store.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
  cookies.set(SESSION_COOKIE, sessionId, cookieOptions);
}

export async function getSessionFromCookies(
  cookies: { get(name: string): { value: string } | undefined },
  runtimeEnv?: unknown,
): Promise<GitHubSession | null> {
  const cookie = cookies.get(SESSION_COOKIE);
  if (!cookie) return null;
  const store = getSessionStore(runtimeEnv);

  if (!store) {
    return decodeSession(cookie.value);
  }

  const record = await store.get(`session:${cookie.value}`, "text");
  if (!record) return null;

  try {
    return JSON.parse(record) as GitHubSession;
  } catch {
    return null;
  }
}

export async function clearSession(
  cookies: {
    get(name: string): { value: string } | undefined;
    delete(name: string, options: Record<string, unknown>): void;
  },
  runtimeEnv?: unknown,
) {
  const cookie = cookies.get(SESSION_COOKIE);
  const store = getSessionStore(runtimeEnv);

  if (cookie && store) {
    await store.delete(`session:${cookie.value}`);
  }

  cookies.delete(SESSION_COOKIE, { path: "/" });
}
