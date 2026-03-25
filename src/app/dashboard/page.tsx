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
