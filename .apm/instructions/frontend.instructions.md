---
applyTo: "src/**/*.{ts,vue,astro}"
description: "Astro + Vue frontend standards"
---

## Frontend Stack

- **Framework:** Astro 5 (SSR, Cloudflare Workers via `@astrojs/cloudflare`)
- **Islands:** Vue 3 (interactive components hydrate client-side)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/vite`
- **Theming:** CSS custom properties (`--ss-*`) with Tailwind `@theme` bridge
- **Icons:** lucide-vue-next
- **UI primitives:** reka-ui

## Patterns

- Vue components handle interactivity; Astro components handle static/layout
- Use Astro's island architecture — hydrate Vue components with `client:load` or `client:visible`
- Design tokens live in `src/tokens/`, styles in `src/styles/`
- Layouts in `src/layouts/`
