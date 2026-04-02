---
applyTo: "src/pages/api/**/*.ts"
description: "API endpoint patterns for Cloudflare Workers runtime"
---

## API Endpoints

- All API routes live under `src/pages/api/`
- Runs on Cloudflare Workers runtime (not Node.js)
- Auth: GitHub OAuth with cookie-based sessions stored in Cloudflare KV
- KV bindings: `SESSION` and `SESSION_STORE` (see `wrangler.toml`)

## GitHub API

- Use Octokit for GitHub REST API calls
- Always set `User-Agent: "RepoSweep"` header — Workers doesn't add one automatically
- Access secrets via `Astro.locals.runtime.env`, never `import.meta.env` at runtime

## Auth Flow

- GitHub OAuth flow with direct token exchange
- Sessions stored in Cloudflare KV
- Server-side route protection via `src/middleware.ts`
- Auth helpers in `src/lib/auth.ts` — use `getAuthEnv()` for env access
