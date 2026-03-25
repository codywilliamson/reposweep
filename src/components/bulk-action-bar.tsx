"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface BulkActionBarProps {
  count: number
  onMakePublic: () => void
  onMakePrivate: () => void
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  onClear: () => void
}

export function BulkActionBar({
  count,
  onMakePublic,
  onMakePrivate,
  onArchive,
  onUnarchive,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-2xl">
            <span className="text-sm font-semibold whitespace-nowrap">
              {count} selected
            </span>
            <Button size="sm" variant="outline" onClick={onClear}>Clear</Button>
            <div className="h-4 w-px bg-border" />
            <Button size="sm" variant="outline" onClick={onMakePublic}>Make Public</Button>
            <Button size="sm" variant="outline" onClick={onMakePrivate}>Make Private</Button>
            <Button size="sm" variant="outline" onClick={onArchive}>Archive</Button>
            <Button size="sm" variant="outline" onClick={onUnarchive}>Unarchive</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
