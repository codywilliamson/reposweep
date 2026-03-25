"use client"

import { useState, useMemo, useTransition, useEffect } from "react"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { Repo, FilterState } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"
import { RepoCard } from "@/components/repo-card"
import { ConfirmModal } from "@/components/confirm-modal"
import { DeleteModal } from "@/components/delete-modal"
import { BulkActionBar } from "@/components/bulk-action-bar"
import { toggleVisibility, toggleArchive, deleteRepo, bulkAction } from "@/actions/repos"

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expandedId !== null) {
          setExpandedId(null)
        } else if (selectedIds.size > 0) {
          setSelectedIds(new Set())
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const target = e.target as HTMLElement
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return
        e.preventDefault()
        setSelectedIds(new Set(filtered.map((r) => r.id)))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [expandedId, selectedIds.size, filtered])

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

  const selectedRepos = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.id)),
    [filtered, selectedIds]
  )

  const bulkMakePublic = () => {
    setConfirmModal({
      title: `Make ${selectedRepos.length} repos public?`,
      description: "These repositories will be visible to everyone on the internet.",
      repos: selectedRepos.map((r) => r.name),
      confirmLabel: "Make Public",
      onConfirm: () => {
        startTransition(async () => {
          const results = await bulkAction(
            selectedRepos.map((r) => ({ owner: r.owner.login, repo: r.name })),
            "make_public"
          )
          const succeeded = results.filter((r) => r.success).length
          const failed = results.filter((r) => !r.success).length
          if (failed === 0) toast.success(`${succeeded} repos made public`)
          else toast.error(`${succeeded}/${results.length} succeeded, ${failed} failed`)
          setConfirmModal(null)
          setSelectedIds(new Set())
        })
      },
    })
  }

  const bulkMakePrivate = () => {
    setConfirmModal({
      title: `Make ${selectedRepos.length} repos private?`,
      description: "These repositories will only be visible to you.",
      repos: selectedRepos.map((r) => r.name),
      confirmLabel: "Make Private",
      onConfirm: () => {
        startTransition(async () => {
          const results = await bulkAction(
            selectedRepos.map((r) => ({ owner: r.owner.login, repo: r.name })),
            "make_private"
          )
          const succeeded = results.filter((r) => r.success).length
          const failed = results.filter((r) => !r.success).length
          if (failed === 0) toast.success(`${succeeded} repos made private`)
          else toast.error(`${succeeded}/${results.length} succeeded, ${failed} failed`)
          setConfirmModal(null)
          setSelectedIds(new Set())
        })
      },
    })
  }

  const bulkArchive = () => {
    setConfirmModal({
      title: `Archive ${selectedRepos.length} repos?`,
      description: "These repositories will be archived and read-only.",
      repos: selectedRepos.map((r) => r.name),
      confirmLabel: "Archive",
      onConfirm: () => {
        startTransition(async () => {
          const results = await bulkAction(
            selectedRepos.map((r) => ({ owner: r.owner.login, repo: r.name })),
            "archive"
          )
          const succeeded = results.filter((r) => r.success).length
          const failed = results.filter((r) => !r.success).length
          if (failed === 0) toast.success(`${succeeded} repos archived`)
          else toast.error(`${succeeded}/${results.length} succeeded, ${failed} failed`)
          setConfirmModal(null)
          setSelectedIds(new Set())
        })
      },
    })
  }

  const bulkUnarchive = () => {
    setConfirmModal({
      title: `Unarchive ${selectedRepos.length} repos?`,
      description: "These repositories will be active again.",
      repos: selectedRepos.map((r) => r.name),
      confirmLabel: "Unarchive",
      onConfirm: () => {
        startTransition(async () => {
          const results = await bulkAction(
            selectedRepos.map((r) => ({ owner: r.owner.login, repo: r.name })),
            "unarchive"
          )
          const succeeded = results.filter((r) => r.success).length
          const failed = results.filter((r) => !r.success).length
          if (failed === 0) toast.success(`${succeeded} repos unarchived`)
          else toast.error(`${succeeded}/${results.length} succeeded, ${failed} failed`)
          setConfirmModal(null)
          setSelectedIds(new Set())
        })
      },
    })
  }

  const bulkDelete = () => {
    setDeleteTargets(selectedRepos)
  }

  return (
    <>
      <FilterBar filters={filters} languages={languages} onChange={setFilters} />
      <LayoutGroup>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-16 text-center"
            >
              <p className="text-lg text-muted-foreground">No repos match your filters</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setFilters(defaultFilters)}
              >
                Clear filters
              </Button>
            </motion.div>
          )}
        </div>
      </LayoutGroup>
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
      <BulkActionBar
        count={selectedIds.size}
        onMakePublic={bulkMakePublic}
        onMakePrivate={bulkMakePrivate}
        onArchive={bulkArchive}
        onUnarchive={bulkUnarchive}
        onDelete={bulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />
    </>
  )
}
