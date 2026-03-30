# RepoSweep

Manage your GitHub repos — toggle visibility, archive, rename, delete — all from one dashboard.

**[reposweep.dev](https://reposweep.dev)**

## Features

- **Toggle visibility** — switch repos between public and private
- **Bulk actions** — select multiple repos and act on them all at once
- **Archive & delete** — clean house with safety confirmations
- **Rename & describe** — update repo metadata without leaving the dashboard
- **Filter & sort** — search by name, filter by language/visibility, sort by any field
- **Real-time status** — watch operations complete live in the status queue
- **Commit insights** — track commit totals, weekly trendlines, repo spread, and recent velocity
- **KV sessions** — keep GitHub tokens out of browser cookies with an opaque KV-backed session ID

## Tech Stack

- [Astro 5](https://astro.build) (SSR, Cloudflare Workers)
- [Vue 3](https://vuejs.org) (interactive islands)
- [Tailwind CSS 4](https://tailwindcss.com)
- [ShockStack](https://shockstack.dev) design tokens & theming (8 themes)
- GitHub OAuth + Octokit

## Development

```bash
pnpm install
pnpm dev
```

## Cloudflare KV Setup

Create the KV namespaces before deploying:

```bash
pnpm wrangler kv namespace create SESSION
pnpm wrangler kv namespace create SESSION_STORE
```

Then copy the generated IDs into the commented `[[kv_namespaces]]` blocks in [`wrangler.toml`](./wrangler.toml).

## License

MIT
