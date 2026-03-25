"use client"

import { useState, useMemo } from "react"
import { AnimatePresence } from "framer-motion"
import type { Repo, FilterState } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"
import { RepoCard } from "@/components/repo-card"

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
        <AnimatePresence>
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
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No repos match your filters
          </p>
        )}
      </div>
    </>
  )
}
