"use client"

import { useState, useMemo, useEffect } from "react"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { Repo, FilterState } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"
import { RepoCard } from "@/components/repo-card"
import { ConfirmModal } from "@/components/confirm-modal"
import { DeleteModal } from "@/components/delete-modal"
import { BulkActionBar } from "@/components/bulk-action-bar"
import { RateLimitBanner } from "@/components/rate-limit-banner"
import { QueueStatus } from "@/components/queue-status"
import { useOperationQueue } from "@/lib/use-operation-queue"
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

  const [confirmModal, setConfirmModal] = useState<{
    title: string
    description: string
    repos: string[]
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

  const [deleteTargets, setDeleteTargets] = useState<Repo[] | null>(null)

  const {
    queue,
    enqueue,
    clearQueue,
    clearCompleted,
    rateLimitResetsAt,
    pendingCount,
  } = useOperationQueue()

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

  // single repo actions — queue them
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
        enqueue([{
          id: `vis-${repo.name}-${Date.now()}`,
          label: `${repo.name} → ${action}`,
          execute: () => toggleVisibility(repo.owner.login, repo.name, !repo.private),
        }])
        setConfirmModal(null)
        toast.success(`Queued: make ${repo.name} ${action}`)
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
        enqueue([{
          id: `arch-${repo.name}-${Date.now()}`,
          label: `${action} ${repo.name}`,
          execute: () => toggleArchive(repo.owner.login, repo.name, !repo.archived),
        }])
        setConfirmModal(null)
        toast.success(`Queued: ${action} ${repo.name}`)
      },
    })
  }

  const requestDelete = (repo: Repo) => {
    setDeleteTargets([repo])
  }

  const handleDeleteConfirm = () => {
    if (!deleteTargets) return
    enqueue(
      deleteTargets.map((repo) => ({
        id: `del-${repo.name}-${Date.now()}`,
        label: `delete ${repo.name}`,
        execute: () => deleteRepo(repo.owner.login, repo.name),
      }))
    )
    toast.success(`Queued: delete ${deleteTargets.length} repo${deleteTargets.length > 1 ? "s" : ""}`)
    setDeleteTargets(null)
    setSelectedIds(new Set())
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

  const selectedRepos = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.id)),
    [filtered, selectedIds]
  )

  // bulk actions — all go through the queue
  const bulkMakePublic = () => {
    setConfirmModal({
      title: `Make ${selectedRepos.length} repos public?`,
      description: "These repositories will be visible to everyone on the internet.",
      repos: selectedRepos.map((r) => r.name),
      confirmLabel: "Make Public",
      onConfirm: () => {
        enqueue(
          selectedRepos.map((r) => ({
            id: `vis-${r.name}-${Date.now()}`,
            label: `${r.name} → public`,
            execute: () => toggleVisibility(r.owner.login, r.name, false),
          }))
        )
        toast.success(`Queued: make ${selectedRepos.length} repos public`)
        setConfirmModal(null)
        setSelectedIds(new Set())
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
        enqueue(
          selectedRepos.map((r) => ({
            id: `vis-${r.name}-${Date.now()}`,
            label: `${r.name} → private`,
            execute: () => toggleVisibility(r.owner.login, r.name, true),
          }))
        )
        toast.success(`Queued: make ${selectedRepos.length} repos private`)
        setConfirmModal(null)
        setSelectedIds(new Set())
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
        enqueue(
          selectedRepos.map((r) => ({
            id: `arch-${r.name}-${Date.now()}`,
            label: `archive ${r.name}`,
            execute: () => toggleArchive(r.owner.login, r.name, true),
          }))
        )
        toast.success(`Queued: archive ${selectedRepos.length} repos`)
        setConfirmModal(null)
        setSelectedIds(new Set())
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
        enqueue(
          selectedRepos.map((r) => ({
            id: `arch-${r.name}-${Date.now()}`,
            label: `unarchive ${r.name}`,
            execute: () => toggleArchive(r.owner.login, r.name, false),
          }))
        )
        toast.success(`Queued: unarchive ${selectedRepos.length} repos`)
        setConfirmModal(null)
        setSelectedIds(new Set())
      },
    })
  }

  const bulkDelete = () => {
    setDeleteTargets(selectedRepos)
  }

  return (
    <>
      <RateLimitBanner resetsAt={rateLimitResetsAt} pendingCount={pendingCount} />
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
      />
      <DeleteModal
        open={deleteTargets !== null}
        repos={deleteTargets?.map((r) => r.name) ?? []}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargets(null)}
      />
      <QueueStatus
        queue={queue}
        onClear={clearQueue}
        onClearCompleted={clearCompleted}
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
