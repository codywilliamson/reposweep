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
