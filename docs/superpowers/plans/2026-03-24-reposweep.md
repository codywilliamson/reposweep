# reposweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal web GUI for managing GitHub repos — toggle visibility, delete, rename, archive, and edit descriptions, individually or in bulk.

**Architecture:** Next.js 16 App Router with Server Components for data fetching and Server Actions for mutations. Auth.js v5 (beta) handles GitHub OAuth. No database — all state lives in GitHub, session in encrypted JWT cookie.

**Tech Stack:** Next.js 16, next-auth 5.0.0-beta.30, shadcn/ui, Tailwind CSS 4, Framer Motion, Octokit, pnpm

---

## File Structure

```
src/
  app/
    layout.tsx              # root layout, font, providers (session + sonner toaster)
    page.tsx                # login page (redirects to /dashboard if authed)
    dashboard/
      page.tsx              # server component — fetches repos via octokit
      loading.tsx           # skeleton loading state for dashboard
  components/
    login-button.tsx        # "sign in with github" button
    sign-out-button.tsx     # sign out button (used in dashboard header)
    repo-grid.tsx           # client component — manages filter/sort/selection/expanded state
    repo-card.tsx           # single repo card (collapsed state)
    repo-card-expanded.tsx  # expanded card (edit fields + action buttons)
    filter-bar.tsx          # search input + filter pills + sort dropdown
    bulk-action-bar.tsx     # floating bottom bar (appears on selection)
    confirm-modal.tsx       # reusable simple confirmation modal
    delete-modal.tsx        # type-to-confirm deletion modal
  actions/
    repos.ts               # server actions for all repo mutations
  lib/
    github.ts              # octokit client factory
    auth.ts                 # auth.js config (github provider, jwt callbacks)
    types.ts                # shared types (Repo, FilterState, SortOption, etc.)
  middleware.ts             # protects /dashboard, redirects unauthenticated users
.env.local                  # GITHUB_ID, GITHUB_SECRET, AUTH_SECRET
README.md                   # setup + run instructions
```

---

### Task 1: Project Scaffolding + Git + GitHub Repo

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.local`, `.gitignore`, `README.md`

- [ ] **Step 1: Initialize Next.js project**

```bash
pnpm create next-app@latest reposweep --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

Move contents from `reposweep/` into the current directory (we're already in `gh-mgmt/`):

```bash
mv reposweep/* reposweep/.* . 2>/dev/null; rmdir reposweep
```

- [ ] **Step 2: Git init + initial commit**

```bash
git init
git add -A
git commit -m "chore: scaffold next.js 16 project"
```

- [ ] **Step 3: Create GitHub repo and push**

```bash
gh repo create reposweep --public --description "personal web gui for managing github repos — bulk visibility, delete, rename, archive" --source . --push
```

- [ ] **Step 4: Add .superpowers/ to .gitignore**

Append `.superpowers/` to `.gitignore`.

- [ ] **Step 5: Write README.md**

```markdown
# reposweep

personal web gui for managing your github repos. quickly toggle visibility, delete, rename, archive, and edit descriptions — individually or in bulk.

## setup

1. create a github oauth app at https://github.com/settings/developers
   - callback url: `http://localhost:3000/api/auth/callback/github`
2. copy `.env.local.example` to `.env.local` and fill in your credentials
3. install and run:

\```bash
pnpm install
pnpm dev
\```

open http://localhost:3000

## stack

next.js 16, auth.js v5, shadcn/ui, tailwind, framer motion, octokit
```

- [ ] **Step 6: Create .env.local.example**

```bash
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_SECRET=
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add readme, env example, update gitignore"
```

---

### Task 2: Install Dependencies + shadcn/ui Init

**Files:**
- Modify: `package.json`
- Create: `components.json` (shadcn config)

- [ ] **Step 1: Install core dependencies**

```bash
pnpm add next-auth@beta @auth/core octokit framer-motion sonner
```

- [ ] **Step 2: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

Choose: New York style, Zinc base color, CSS variables enabled.

- [ ] **Step 3: Add shadcn components we'll need**

```bash
pnpm dlx shadcn@latest add button input badge dialog dropdown-menu checkbox
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add deps — next-auth, octokit, framer-motion, shadcn/ui"
```

---

### Task 3: Auth Setup (GitHub OAuth)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`

- [ ] **Step 1: Create auth config**

Create `src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      authorization: { params: { scope: "repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
})
```

- [ ] **Step 2: Create auth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

- [ ] **Step 3: Create middleware**

Create `src/middleware.ts`:

```typescript
import { auth } from "@/lib/auth"

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/dashboard")) {
    return Response.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: ["/dashboard/:path*"],
}
```

- [ ] **Step 4: Extend session types**

Create `src/lib/types.ts`:

```typescript
import "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
  }
}

export interface Repo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  archived: boolean
  language: string | null
  stargazers_count: number
  updated_at: string
  created_at: string
  html_url: string
  owner: {
    login: string
  }
}

export type Visibility = "all" | "public" | "private"
export type ArchivedFilter = "all" | "active" | "archived"
export type SortField = "name" | "created_at" | "updated_at" | "stargazers_count"
export type SortDirection = "asc" | "desc"

export interface FilterState {
  search: string
  visibility: Visibility
  language: string | null
  archived: ArchivedFilter
  sortField: SortField
  sortDirection: SortDirection
}
```

- [ ] **Step 5: Verify auth works — run dev server, test login flow**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/api/auth/signin` — verify GitHub OAuth button appears. (Full login test requires `.env.local` to be configured with real credentials.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: github oauth with next-auth v5 + route protection middleware"
```

---

### Task 4: GitHub API Client + Server Actions

**Files:**
- Create: `src/lib/github.ts`, `src/actions/repos.ts`

- [ ] **Step 1: Create Octokit factory**

Create `src/lib/github.ts`:

```typescript
import { Octokit } from "octokit"
import { auth } from "@/lib/auth"

export async function getOctokit() {
  const session = await auth()
  if (!session?.accessToken) {
    throw new Error("Not authenticated")
  }
  return new Octokit({ auth: session.accessToken })
}

export async function fetchUserRepos() {
  const octokit = await getOctokit()
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    affiliation: "owner",
    sort: "updated",
  })
  return repos
}
```

- [ ] **Step 2: Create server actions**

Create `src/actions/repos.ts`:

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { getOctokit } from "@/lib/github"

export async function toggleVisibility(owner: string, repo: string, makePrivate: boolean) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, private: makePrivate })
  revalidatePath("/dashboard")
}

export async function deleteRepo(owner: string, repo: string) {
  const octokit = await getOctokit()
  await octokit.rest.repos.delete({ owner, repo })
  revalidatePath("/dashboard")
}

export async function renameRepo(owner: string, repo: string, newName: string) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, name: newName })
  revalidatePath("/dashboard")
}

export async function updateDescription(owner: string, repo: string, description: string) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, description })
  revalidatePath("/dashboard")
}

export async function toggleArchive(owner: string, repo: string, archive: boolean) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, archived: archive })
  revalidatePath("/dashboard")
}

export type BulkResult = {
  repo: string
  success: boolean
  error?: string
}

export async function bulkAction(
  repos: { owner: string; repo: string }[],
  action: "make_public" | "make_private" | "archive" | "unarchive" | "delete"
): Promise<BulkResult[]> {
  const octokit = await getOctokit()
  const results: BulkResult[] = []

  for (const { owner, repo } of repos) {
    try {
      switch (action) {
        case "make_public":
          await octokit.rest.repos.update({ owner, repo, private: false })
          break
        case "make_private":
          await octokit.rest.repos.update({ owner, repo, private: true })
          break
        case "archive":
          await octokit.rest.repos.update({ owner, repo, archived: true })
          break
        case "unarchive":
          await octokit.rest.repos.update({ owner, repo, archived: false })
          break
        case "delete":
          await octokit.rest.repos.delete({ owner, repo })
          break
      }
      results.push({ repo, success: true })
    } catch (e) {
      results.push({ repo, success: false, error: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  revalidatePath("/dashboard")
  return results
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: octokit client + server actions for all repo mutations"
```

---

### Task 5: Login Page

**Files:**
- Create: `src/components/login-button.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`

- [ ] **Step 1: Update root layout**

Modify `src/app/layout.tsx` — add Inter font, Sonner toaster, minimal layout:

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "reposweep",
  description: "manage your github repos",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create login button**

Create `src/components/login-button.tsx`:

```typescript
"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function LoginButton() {
  return (
    <Button size="lg" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
      Sign in with GitHub
    </Button>
  )
}
```

- [ ] **Step 3: Create login page**

Modify `src/app/page.tsx`:

```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginButton } from "@/components/login-button"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">reposweep</h1>
        <p className="mt-2 text-muted-foreground">manage your github repos</p>
      </div>
      <LoginButton />
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: login page with github oauth button"
```

---

### Task 6: Dashboard Page + Repo Fetching + Loading State

**Files:**
- Create: `src/app/dashboard/page.tsx`, `src/app/dashboard/loading.tsx`, `src/components/sign-out-button.tsx`

- [ ] **Step 1: Create sign-out button**

Create `src/components/sign-out-button.tsx`:

```typescript
"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </Button>
  )
}
```

- [ ] **Step 2: Create dashboard page (server component)**

Create `src/app/dashboard/page.tsx`:

```typescript
import { fetchUserRepos } from "@/lib/github"
import { auth } from "@/lib/auth"
import { SignOutButton } from "@/components/sign-out-button"
import { RepoGrid } from "@/components/repo-grid"
import type { Repo } from "@/lib/types"

export default async function Dashboard() {
  const session = await auth()
  const repos = (await fetchUserRepos()) as Repo[]

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">reposweep</h1>
          <p className="text-sm text-muted-foreground">
            {session?.user?.name} &middot; {repos.length} repos
          </p>
        </div>
        <SignOutButton />
      </header>
      <RepoGrid repos={repos} />
    </main>
  )
}
```

- [ ] **Step 3: Create loading skeleton**

Create `src/app/dashboard/loading.tsx`:

```typescript
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-20 animate-pulse rounded bg-muted" />
      </header>
      <div className="mb-6 h-10 w-full animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Create stub RepoGrid (placeholder for now)**

Create `src/components/repo-grid.tsx`:

```typescript
"use client"

import type { Repo } from "@/lib/types"

export function RepoGrid({ repos }: { repos: Repo[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <div key={repo.id} className="rounded-lg border p-4">
          <p className="font-semibold">{repo.name}</p>
          <p className="text-sm text-muted-foreground">{repo.description}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Verify — dev server shows repos after login**

```bash
pnpm dev
```

Log in, verify dashboard loads with repo cards.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: dashboard page with repo fetching + loading skeleton"
```

---

### Task 7: Filter Bar

**Files:**
- Create: `src/components/filter-bar.tsx`
- Modify: `src/components/repo-grid.tsx`

- [ ] **Step 1: Create filter bar component**

Create `src/components/filter-bar.tsx`:

```typescript
"use client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { FilterState, Visibility, ArchivedFilter, SortField, SortDirection } from "@/lib/types"

const SORT_OPTIONS: { label: string; field: SortField }[] = [
  { label: "Name", field: "name" },
  { label: "Created", field: "created_at" },
  { label: "Updated", field: "updated_at" },
  { label: "Stars", field: "stargazers_count" },
]

interface FilterBarProps {
  filters: FilterState
  languages: string[]
  onChange: (filters: FilterState) => void
}

export function FilterBar({ filters, languages, onChange }: FilterBarProps) {
  const update = (partial: Partial<FilterState>) =>
    onChange({ ...filters, ...partial })

  return (
    <div className="mb-6 flex flex-col gap-3">
      <Input
        placeholder="Search repos..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="max-w-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* visibility pills */}
        {(["all", "public", "private"] as Visibility[]).map((v) => (
          <Badge
            key={v}
            variant={filters.visibility === v ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => update({ visibility: v })}
          >
            {v}
          </Badge>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* archived pills */}
        {(["all", "active", "archived"] as ArchivedFilter[]).map((a) => (
          <Badge
            key={a}
            variant={filters.archived === a ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => update({ archived: a })}
          >
            {a}
          </Badge>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* language dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {filters.language ?? "All languages"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => update({ language: null })}>
              All languages
            </DropdownMenuItem>
            {languages.map((lang) => (
              <DropdownMenuItem key={lang} onClick={() => update({ language: lang })}>
                {lang}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort: {SORT_OPTIONS.find((o) => o.field === filters.sortField)?.label}
              {filters.sortDirection === "asc" ? " ↑" : " ↓"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.field}
                onClick={() =>
                  update({
                    sortField: opt.field,
                    sortDirection:
                      filters.sortField === opt.field
                        ? filters.sortDirection === "asc" ? "desc" : "asc"
                        : "desc",
                  })
                }
              >
                {opt.label}
                {filters.sortField === opt.field && (filters.sortDirection === "asc" ? " ↑" : " ↓")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrate filter bar into repo-grid**

Update `src/components/repo-grid.tsx` to add filter state, extract unique languages, pass to FilterBar, and apply client-side filtering + sorting:

```typescript
"use client"

import { useState, useMemo } from "react"
import type { Repo, FilterState } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"

const defaultFilters: FilterState = {
  search: "",
  visibility: "all",
  language: null,
  archived: "all",
  sortField: "updated_at",
  sortDirection: "desc",
}

export function RepoGrid({ repos }: { repos: Repo[] }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)

  const languages = useMemo(
    () => [...new Set(repos.map((r) => r.language).filter(Boolean))] as string[],
    [repos]
  )

  const filtered = useMemo(() => {
    let result = repos

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (filters.visibility !== "all") {
      result = result.filter((r) =>
        filters.visibility === "private" ? r.private : !r.private
      )
    }
    if (filters.archived !== "all") {
      result = result.filter((r) =>
        filters.archived === "archived" ? r.archived : !r.archived
      )
    }
    if (filters.language) {
      result = result.filter((r) => r.language === filters.language)
    }

    result.sort((a, b) => {
      const field = filters.sortField
      const dir = filters.sortDirection === "asc" ? 1 : -1
      if (field === "name") return dir * a.name.localeCompare(b.name)
      if (field === "stargazers_count") return dir * (a.stargazers_count - b.stargazers_count)
      return dir * (new Date(a[field]).getTime() - new Date(b[field]).getTime())
    })

    return result
  }, [repos, filters])

  return (
    <>
      <FilterBar filters={filters} languages={languages} onChange={setFilters} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((repo) => (
          <div key={repo.id} className="rounded-lg border p-4">
            <p className="font-semibold">{repo.name}</p>
            <p className="text-sm text-muted-foreground">{repo.description}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No repos match your filters
          </p>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verify — filters and sort work in browser**

```bash
pnpm dev
```

Test search, visibility pills, language dropdown, sort options.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: filter bar with search, visibility, language, archived, sort"
```

---

### Task 8: Repo Cards (Collapsed State)

**Files:**
- Create: `src/components/repo-card.tsx`
- Modify: `src/components/repo-grid.tsx`

- [ ] **Step 1: Create repo card component**

Create `src/components/repo-card.tsx`:

```typescript
"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { Repo } from "@/lib/types"

interface RepoCardProps {
  repo: Repo
  selected: boolean
  expanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
  index: number
}

export function RepoCard({
  repo,
  selected,
  expanded,
  onToggleSelect,
  onToggleExpand,
  index,
}: RepoCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={`rounded-lg border p-4 cursor-pointer transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
      } ${expanded ? "border-primary" : ""}`}
      onClick={onToggleExpand}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{repo.name}</h3>
            <Badge variant={repo.private ? "destructive" : "default"} className="shrink-0 text-xs">
              {repo.private ? "private" : "public"}
            </Badge>
            {repo.archived && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                archived
              </Badge>
            )}
          </div>
          {repo.description && (
            <p className="mt-1 truncate text-sm text-muted-foreground">{repo.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {repo.language && <span>{repo.language}</span>}
            {repo.stargazers_count > 0 && <span>★ {repo.stargazers_count}</span>}
            <span>updated {new Date(repo.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect()}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 shrink-0"
        />
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Update repo-grid to use RepoCard + selection + expand state**

Update `src/components/repo-grid.tsx` — add `selectedIds` set and `expandedId` state, replace inline card div with `<RepoCard />`:

```typescript
// add to existing state
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
const [expandedId, setExpandedId] = useState<number | null>(null)

const toggleSelect = (id: number) => {
  setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

const toggleExpand = (id: number) => {
  setExpandedId((prev) => (prev === id ? null : id))
}
```

Replace the grid cards with:

```tsx
{filtered.map((repo, i) => (
  <RepoCard
    key={repo.id}
    repo={repo}
    selected={selectedIds.has(repo.id)}
    expanded={expandedId === repo.id}
    onToggleSelect={() => toggleSelect(repo.id)}
    onToggleExpand={() => toggleExpand(repo.id)}
    index={i}
  />
))}
```

Wrap the grid in `<AnimatePresence>` from framer-motion for exit animations.

- [ ] **Step 3: Verify — cards render with staggered animation, checkboxes and expand work**

```bash
pnpm dev
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: repo cards with selection, expand state, staggered animations"
```

---

### Task 9: Expanded Card (Inline Edit + Actions)

**Files:**
- Create: `src/components/repo-card-expanded.tsx`
- Modify: `src/components/repo-card.tsx`

- [ ] **Step 1: Create expanded card component**

Create `src/components/repo-card-expanded.tsx`:

```typescript
"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { renameRepo, updateDescription, toggleVisibility, toggleArchive } from "@/actions/repos"
import type { Repo } from "@/lib/types"

interface RepoCardExpandedProps {
  repo: Repo
  onDelete: () => void
}

export function RepoCardExpanded({ repo, onDelete }: RepoCardExpandedProps) {
  const [name, setName] = useState(repo.name)
  const [description, setDescription] = useState(repo.description ?? "")
  const [isPending, startTransition] = useTransition()

  const saveName = () => {
    if (name === repo.name || !name.trim()) return
    startTransition(async () => {
      try {
        await renameRepo(repo.owner.login, repo.name, name)
        toast.success(`Renamed to ${name}`)
      } catch {
        toast.error("Failed to rename")
        setName(repo.name)
      }
    })
  }

  const saveDescription = () => {
    if (description === (repo.description ?? "")) return
    startTransition(async () => {
      try {
        await updateDescription(repo.owner.login, repo.name, description)
        toast.success("Description updated")
      } catch {
        toast.error("Failed to update description")
        setDescription(repo.description ?? "")
      }
    })
  }

  const handleVisibility = () => {
    // triggers confirm modal in parent — for now just call action directly
    // this will be wired to confirm-modal in task 10
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="border-t px-4 pb-4 pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <label className="text-xs uppercase text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            disabled={isPending}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-muted-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => e.key === "Enter" && saveDescription()}
            disabled={isPending}
            placeholder="No description"
            className="mt-1"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                // will be wired to confirm modal in task 10
                await toggleVisibility(repo.owner.login, repo.name, !repo.private)
                toast.success(repo.private ? "Made public" : "Made private")
              })
            }
          >
            {repo.private ? "Make Public" : "Make Private"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await toggleArchive(repo.owner.login, repo.name, !repo.archived)
                toast.success(repo.archived ? "Unarchived" : "Archived")
              })
            }
          >
            {repo.archived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Wire expanded card into repo-card**

Update `src/components/repo-card.tsx` — import `RepoCardExpanded` and `AnimatePresence`. After the card's main content div, conditionally render expanded content:

```tsx
<AnimatePresence>
  {expanded && (
    <RepoCardExpanded
      repo={repo}
      onDelete={() => {/* will wire to delete modal in task 10 */}}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 3: Verify — expand a card, edit name/description, test save on blur**

```bash
pnpm dev
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: expandable card with inline rename, description edit, action buttons"
```

---

### Task 10: Confirmation Modals

**Files:**
- Create: `src/components/confirm-modal.tsx`, `src/components/delete-modal.tsx`
- Modify: `src/components/repo-card-expanded.tsx`, `src/components/repo-grid.tsx`

- [ ] **Step 1: Create simple confirm modal**

Create `src/components/confirm-modal.tsx`:

```typescript
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  repos: string[]
  confirmLabel: string
  confirmVariant?: "default" | "destructive"
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmModal({
  open,
  title,
  description,
  repos,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {repos.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border bg-muted/50 p-3">
                {repos.map((name) => (
                  <div key={name} className="py-1 text-sm">{name}</div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
              <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
                {loading ? "Working..." : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Create type-to-confirm delete modal**

Create `src/components/delete-modal.tsx`:

```typescript
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DeleteModalProps {
  open: boolean
  repos: string[]
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function DeleteModal({ open, repos, onConfirm, onCancel, loading }: DeleteModalProps) {
  const [input, setInput] = useState("")

  const confirmText = repos.length === 1 ? repos[0] : `delete ${repos.length} repos`
  const matches = input === confirmText

  const handleClose = () => {
    setInput("")
    onCancel()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <span className="text-lg text-destructive">⚠</span>
              </div>
              <h3 className="text-lg font-semibold">
                Delete {repos.length === 1 ? repos[0] : `${repos.length} repositories`}?
              </h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This action <strong className="text-destructive">cannot be undone</strong>.
              {repos.length === 1
                ? " This repository will be permanently deleted."
                : " These repositories will be permanently deleted:"}
            </p>
            {repos.length > 1 && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border bg-muted/50 p-3">
                {repos.map((name) => (
                  <div key={name} className="py-1 text-sm">{name}</div>
                ))}
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Type <strong className="text-foreground">{confirmText}</strong> to confirm:
            </p>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="mt-2"
              placeholder={confirmText}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => { onConfirm(); setInput("") }}
                disabled={!matches || loading}
              >
                {loading ? "Deleting..." : "Delete Forever"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Wire modals into repo-grid**

Update `src/components/repo-grid.tsx` — add modal state, render `ConfirmModal` and `DeleteModal` at the bottom of the component. Wire `repo-card-expanded.tsx` action buttons to set modal state via callbacks passed through props.

The grid component manages:
- `modalAction`: `null | { type: "visibility" | "archive", repos: Repo[], makePrivate?: boolean, archive?: boolean }`
- `deleteTargets`: `Repo[] | null`

Pass callbacks to `RepoCardExpanded` for triggering modals instead of calling actions directly.

- [ ] **Step 4: Verify — test all confirmation flows (visibility, archive, delete)**

```bash
pnpm dev
```

Test: expand a card → Make Public → confirm modal → works. Delete → type-to-confirm → works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: confirmation modals — simple confirm + type-to-confirm delete"
```

---

### Task 11: Floating Bulk Action Bar

**Files:**
- Create: `src/components/bulk-action-bar.tsx`
- Modify: `src/components/repo-grid.tsx`

- [ ] **Step 1: Create bulk action bar**

Create `src/components/bulk-action-bar.tsx`:

```typescript
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface BulkActionBarProps {
  count: number
  onMakePublic: () => void
  onMakePrivate: () => void
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  onClear: () => void
}

export function BulkActionBar({
  count,
  onMakePublic,
  onMakePrivate,
  onArchive,
  onUnarchive,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-2xl">
            <span className="text-sm font-semibold whitespace-nowrap">
              {count} selected
            </span>
            <Button size="sm" variant="outline" onClick={onClear}>Clear</Button>
            <div className="h-4 w-px bg-border" />
            <Button size="sm" variant="outline" onClick={onMakePublic}>Make Public</Button>
            <Button size="sm" variant="outline" onClick={onMakePrivate}>Make Private</Button>
            <Button size="sm" variant="outline" onClick={onArchive}>Archive</Button>
            <Button size="sm" variant="outline" onClick={onUnarchive}>Unarchive</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Wire bulk action bar into repo-grid**

Update `src/components/repo-grid.tsx` — render `BulkActionBar` at the bottom, passing:
- `count`: `selectedIds.size`
- Action handlers that set modal state with the selected repos
- `onClear`: clears `selectedIds`

Wire bulk action confirmations to the same `ConfirmModal` and `DeleteModal` — they show the full list of selected repo names.

- [ ] **Step 3: Wire bulk action execution**

When confirmed, call `bulkAction()` from `src/actions/repos.ts` with selected repos. Show results via toast:
- All succeeded: `toast.success("5 repos made public")`
- Partial failure: `toast.error("3/5 succeeded, 2 failed")` with details

Clear selection after completion.

- [ ] **Step 4: Verify — select multiple repos, test each bulk action**

```bash
pnpm dev
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: floating bulk action bar with all bulk operations"
```

---

### Task 12: Polish Animations + Final Touches

**Files:**
- Modify: `src/components/repo-grid.tsx`, `src/components/repo-card.tsx`

- [ ] **Step 1: Add layout animations for filter/sort reflow**

Wrap the card grid in `<LayoutGroup>` from framer-motion. Add `layout` prop to each `RepoCard`'s motion.div so cards animate smoothly when filters change their order/visibility.

- [ ] **Step 2: Add empty state**

When no repos match filters, show an animated empty state with a message and a button to clear filters.

- [ ] **Step 3: Add keyboard shortcuts**

- `Escape`: close expanded card, clear selection
- `Ctrl+A` / `Cmd+A`: select all visible repos (when not in an input)

Add a `useEffect` with keyboard listener in `repo-grid.tsx`.

- [ ] **Step 4: Rate limit handling**

Update `src/actions/repos.ts` — catch 403 responses, check for `X-RateLimit-Remaining` header. If rate limited, throw a descriptive error that the UI shows as a toast with the reset time.

- [ ] **Step 5: Verify everything end-to-end**

```bash
pnpm dev
```

Full flow: login → filter → select → bulk action → confirm → success toast. Expand → rename → delete → type-to-confirm.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: polish — layout animations, empty state, keyboard shortcuts, rate limits"
```

---

### Task 13: Final Push

- [ ] **Step 1: Verify build succeeds**

```bash
pnpm build
```

Fix any type errors or build warnings.

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

- [ ] **Step 3: Verify repo looks good on GitHub**

Check the repo page — README renders, description is correct, repo is public.
