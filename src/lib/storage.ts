export interface KVNamespaceLike {
  get(key: string, type: "text"): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RuntimeEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_STORE?: KVNamespaceLike;
}

export function getRuntimeEnv(source?: unknown): RuntimeEnv {
  const runtimeEnv = (source as { runtime?: { env?: RuntimeEnv } } | undefined)?.runtime?.env;
  if (runtimeEnv) return runtimeEnv;
  return (source as RuntimeEnv | undefined) ?? {};
}

export function getSessionStore(source?: unknown): KVNamespaceLike | null {
  return getRuntimeEnv(source).SESSION_STORE ?? null;
}
