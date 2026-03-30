# RepoSweep v2

GitHub repo management dashboard rebuilt on the ShockStack frontend stack.

## Tech Stack

- **Framework:** Astro 5 (SSR, Cloudflare Workers via `@astrojs/cloudflare`)
- **Islands:** Vue 3 (interactive components hydrate client-side)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/vite`
- **Theming:** CSS custom properties (`--ss-*`) with Tailwind `@theme` bridge
- **Auth:** Direct GitHub OAuth (cookie-based sessions)
- **API:** Octokit for GitHub REST API
- **Package manager:** pnpm

## Conventions

- ShockStack design token naming: `--ss-{category}-{name}`
- Tailwind classes use mapped names: `bg-bg-primary`, `text-accent-purple`, etc.
- Vue components for interactivity, Astro components for static/layout
- Server-side route protection via middleware
- API routes under `src/pages/api/`

## Cloudflare Workers Gotchas

- **User-Agent required:** GitHub API rejects requests without a `User-Agent` header. Workers `fetch` doesn't set one automatically (Node does). Always include `"User-Agent": "RepoSweep"` on GitHub API calls.
- **Runtime env:** secrets are accessed via `Astro.locals.runtime.env`, not `import.meta.env` (which is build-time only and empty on CF). Use `getAuthEnv()` helper in `src/lib/auth.ts`.
- **Local dev:** `.env` file feeds `import.meta.env` during `pnpm dev`. Prod secrets set via `wrangler secret put`.
