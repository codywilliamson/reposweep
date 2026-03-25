"use client"

import { useState, useMemo, useTransition } from "react"
import { AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { Repo, FilterState } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"
import { RepoCard } from "@/components/repo-card"
import { ConfirmModal } from "@/components/confirm-modal"
import { DeleteModal } from "@/components/delete-modal"
import { toggleVisibility, toggleArchive, deleteRepo } from "@/actions/repos"

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
  const [isPending, startTransition] = useTransition()

  const [confirmModal, setConfirmModal] = useState<{
    title: string
    description: string
    repos: string[]
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

  const [deleteTargets, setDeleteTargets] = useState<Repo[] | null>(null)

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

  const requestVisibilityChange = (repo: Repo) => {
    const action = repo.private ? "public" : "private"
    setConfirmModal({
      title: `Make ${repo.name} ${action}?`,
      description: repo.private
        ? "This repository will be visible to everyone on the internet."
        : "This repository will only be visible to you.",
      repos: [repo.name],
      confirmLabel: repo.private ? "Make Public" : "Make Private",
      onConfirm: () => {
        startTransition(async () => {
          try {
            await toggleVisibility(repo.owner.login, repo.name, !repo.private)
            toast.success(`${repo.name} is now ${action}`)
          } catch {
            toast.error(`Failed to make ${repo.name} ${action}`)
          }
          setConfirmModal(null)
        })
      },
    })
  }

  const requestArchiveChange = (repo: Repo) => {
    const action = repo.archived ? "unarchive" : "archive"
    setConfirmModal({
      title: `${repo.archived ? "Unarchive" : "Archive"} ${repo.name}?`,
      description: repo.archived
        ? "This repository will be active again."
        : "This repository will be archived and read-only.",
      repos: [repo.name],
      confirmLabel: repo.archived ? "Unarchive" : "Archive",
      onConfirm: () => {
        startTransition(async () => {
          try {
            await toggleArchive(repo.owner.login, repo.name, !repo.archived)
            toast.success(`${repo.name} ${action}d`)
          } catch {
            toast.error(`Failed to ${action} ${repo.name}`)
          }
          setConfirmModal(null)
        })
      },
    })
  }

  const requestDelete = (repo: Repo) => {
    setDeleteTargets([repo])
  }

  const handleDeleteConfirm = () => {
    if (!deleteTargets) return
    startTransition(async () => {
      for (const repo of deleteTargets) {
        try {
          await deleteRepo(repo.owner.login, repo.name)
          toast.success(`Deleted ${repo.name}`)
        } catch {
          toast.error(`Failed to delete ${repo.name}`)
        }
      }
      setDeleteTargets(null)
      setSelectedIds(new Set())
    })
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
              onRequestVisibilityChange={() => requestVisibilityChange(repo)}
              onRequestArchiveChange={() => requestArchiveChange(repo)}
              onRequestDelete={() => requestDelete(repo)}
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
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title ?? ""}
        description={confirmModal?.description ?? ""}
        repos={confirmModal?.repos ?? []}
        confirmLabel={confirmModal?.confirmLabel ?? ""}
        onConfirm={confirmModal?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmModal(null)}
        loading={isPending}
      />
      <DeleteModal
        open={deleteTargets !== null}
        repos={deleteTargets?.map((r) => r.name) ?? []}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargets(null)}
        loading={isPending}
      />
    </>
  )
}
