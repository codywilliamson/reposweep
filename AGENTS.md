# RepoSweep v2

GitHub repo management dashboard rebuilt on the ShockStack frontend stack.

## Tech Stack

- **Framework:** Astro 5 (SSR, Node adapter)
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
