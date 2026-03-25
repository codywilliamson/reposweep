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
