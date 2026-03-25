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
