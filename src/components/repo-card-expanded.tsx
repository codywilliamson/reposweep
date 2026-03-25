"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { renameRepo, updateDescription } from "@/actions/repos"
import type { Repo } from "@/lib/types"

interface RepoCardExpandedProps {
  repo: Repo
  onRequestVisibilityChange: () => void
  onRequestArchiveChange: () => void
  onRequestDelete: () => void
}

export function RepoCardExpanded({ repo, onRequestVisibilityChange, onRequestArchiveChange, onRequestDelete }: RepoCardExpandedProps) {
  const [name, setName] = useState(repo.name)
  const [description, setDescription] = useState(repo.description ?? "")
  const [isPending, startTransition] = useTransition()

  const saveName = () => {
    if (name === repo.name || !name.trim()) return
    startTransition(async () => {
      const result = await renameRepo(repo.owner.login, repo.name, name)
      if (result.success) {
        toast.success(`Renamed to ${name}`)
      } else {
        toast.error(result.rateLimited ? `Rate limited — try again later` : "Failed to rename")
        setName(repo.name)
      }
    })
  }

  const saveDescription = () => {
    if (description === (repo.description ?? "")) return
    startTransition(async () => {
      const result = await updateDescription(repo.owner.login, repo.name, description)
      if (result.success) {
        toast.success("Description updated")
      } else {
        toast.error(result.rateLimited ? `Rate limited — try again later` : "Failed to update description")
        setDescription(repo.description ?? "")
      }
    })
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
          <Button size="sm" variant="outline" disabled={isPending} onClick={onRequestVisibilityChange}>
            {repo.private ? "Make Public" : "Make Private"}
          </Button>
          <Button size="sm" variant="outline" disabled={isPending} onClick={onRequestArchiveChange}>
            {repo.archived ? "Unarchive" : "Archive"}
          </Button>
          <Button size="sm" variant="destructive" disabled={isPending} onClick={onRequestDelete}>
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
