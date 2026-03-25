# reposweep

personal web gui for managing your github repos. quickly toggle visibility, delete, rename, archive, and edit descriptions — individually or in bulk.

## setup

1. create a github oauth app at https://github.com/settings/developers
   - callback url: `http://localhost:3000/api/auth/callback/github`
2. copy `.env.local.example` to `.env.local` and fill in your credentials
3. install and run:

```bash
pnpm install
pnpm dev
```

open http://localhost:3000

## stack

next.js 16, auth.js v5, shadcn/ui, tailwind, framer motion, octokit
