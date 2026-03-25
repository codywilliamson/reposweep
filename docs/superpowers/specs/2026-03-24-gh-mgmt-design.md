# reposweep — GitHub Repository Manager

A personal web GUI for quickly managing your GitHub repositories: toggle visibility, delete, rename, archive, and edit descriptions — individually or in bulk.

**Repo:** `reposweep` (public, GitHub)

## Stack

- **Next.js 16** (App Router, React Server Components, Server Actions)
- **Auth.js v5** (GitHub OAuth provider, JWT session strategy)
- **shadcn/ui** (component library, built on Radix UI + Tailwind)
- **Tailwind CSS v4**
- **Framer Motion** (animations)
- **Octokit** (GitHub REST API client)
- **pnpm** (package manager)

## Scope

- Personal repos only — no org repos, no collaborator repos
- Single authenticated user at a time
- No database — all state lives in GitHub, session in encrypted JWT cookie

## Authentication

- GitHub OAuth with `repo` scope (required for private repo access + mutations)
- Auth.js v5 with JWT session strategy
- OAuth access token stored in encrypted session cookie, passed to Octokit per request
- No server-side token storage

### Flow

1. Unauthenticated → `/` login page with "Sign in with GitHub" button
2. GitHub OAuth consent screen
3. Callback stores access token in encrypted JWT cookie
4. Middleware protects `/dashboard` — redirects to `/` if no session
5. Sign out clears the session

## Pages

### `/` — Login

- Minimal landing page with app name and "Sign in with GitHub" button
- Redirects to `/dashboard` if already authenticated

### `/dashboard` — Repository Management

Single-page repo manager with the following sections:

#### Filter/Search Bar (top)

- Text search by repo name
- Filter pills: visibility (public/private/all), language, archived status
- Sort: name, date created, date updated, stars

#### Repo Grid (card layout)

- Responsive card grid (2-3 columns depending on viewport)
- Each card shows: name, description (truncated), visibility badge (public/private/archived), language, stars, last updated
- Checkbox on each card for bulk selection
- Click card (not checkbox) to expand inline

#### Expanded Card (inline)

- Expands below the card row with smooth layout animation
- Only one card expanded at a time — expanding another collapses the current
- Editable fields: name, description (input fields, save on blur or enter)
- Action buttons: toggle visibility (Make Public / Make Private), Archive/Unarchive, Delete
- Actions trigger confirmation modals as appropriate

#### Floating Action Bar (bottom)

- Slides up from bottom when 1+ repos are selected via checkboxes
- Shows: selection count, action buttons (Make Public, Make Private, Archive, Unarchive, Delete)
- Dismisses when selection is cleared

## Actions

| Action | Scope | API Call | Confirmation |
|--------|-------|----------|-------------|
| Make Public | single/bulk | `PATCH /repos/{owner}/{repo}` `{private: false}` | simple modal |
| Make Private | single/bulk | `PATCH /repos/{owner}/{repo}` `{private: true}` | simple modal |
| Delete | single/bulk | `DELETE /repos/{owner}/{repo}` | type-to-confirm |
| Rename | single only | `PATCH /repos/{owner}/{repo}` `{name: newName}` | none (inline edit) |
| Edit Description | single only | `PATCH /repos/{owner}/{repo}` `{description: newDesc}` | none (inline edit) |
| Archive | single/bulk | `PATCH /repos/{owner}/{repo}` `{archived: true}` | simple modal |
| Unarchive | single/bulk | `PATCH /repos/{owner}/{repo}` `{archived: false}` | simple modal |

## Confirmation Tiers

1. **No confirmation** — rename, edit description (easily reversible, inline edits)
2. **Simple confirm modal** — make public, make private, archive, unarchive. Shows list of affected repos and a confirm button.
3. **Type-to-confirm** — delete only. Shows list of affected repos. Single delete: type the repo name. Bulk delete: type `delete N repos` (e.g. `delete 3 repos`). Button activates only when input matches. Red destructive styling.

## Data Flow

### Fetching

- Server Component on `/dashboard` fetches all user repos via Octokit (`GET /user/repos`, paginated)
- Passes repo list to client component that manages UI state (filters, sort, selection, expanded card)
- Client-side filtering/sorting (no server round-trip for filter changes)

### Mutations

- Each action is a separate Server Action
- Server Actions receive the GitHub access token from the session, call Octokit
- After mutation: `revalidatePath('/dashboard')` to refresh the repo list
- Bulk operations: process repos sequentially, track progress via `useTransition` + state updates
- Partial failures: show which succeeded and which failed — don't roll back successes

### Error Handling

- Toast notifications (top-right) for success/error feedback
- Bulk operation errors: show a summary — "3/5 succeeded, 2 failed" with expandable error details
- Network errors: toast with retry suggestion
- Auth errors (expired token): redirect to login
- Rate limit errors: surface GitHub's `X-RateLimit-Remaining` — show a toast with reset time when approaching or hitting the 5k/hr limit

## Animations (Framer Motion)

- **Card grid load:** staggered entrance animation
- **Card expand/collapse:** `layout` animation with `AnimatePresence`
- **Floating action bar:** slide up/down with spring physics
- **Confirmation modals:** backdrop fade + modal scale-in
- **Toast notifications:** slide in from top-right, auto-dismiss after 5s
- **Filter/sort changes:** `layout` animation on cards for smooth reflow

## File Structure

```
src/
  app/
    layout.tsx              # root layout, providers
    page.tsx                # login page
    dashboard/
      page.tsx              # server component — fetches repos
      loading.tsx           # skeleton loading state
  components/
    login-button.tsx        # github oauth sign-in button
    repo-grid.tsx           # client component — grid + filters + selection state
    repo-card.tsx           # individual repo card (collapsed + expanded states)
    repo-card-expanded.tsx  # expanded card content (edit fields + actions)
    filter-bar.tsx          # search + filter pills + sort dropdown
    bulk-action-bar.tsx     # floating bottom bar
    confirm-modal.tsx       # simple confirmation modal
    delete-modal.tsx        # type-to-confirm deletion modal
    toast.tsx               # toast notification component (or use shadcn sonner)
  actions/
    repos.ts               # all server actions (toggle visibility, delete, rename, etc.)
  lib/
    github.ts              # octokit client factory (takes access token)
    auth.ts                 # auth.js config
  middleware.ts             # route protection
```

## Non-Goals

- No org/collaborator repo management
- No repo creation
- No settings beyond what GitHub exposes (no custom metadata)
- No persistent storage/database
- No multi-user support
- No GitHub App installation flow — simple OAuth only
