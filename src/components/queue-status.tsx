"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { QueuedOperation } from "@/lib/use-operation-queue"

interface QueueStatusProps {
  queue: QueuedOperation[]
  onClear: () => void
  onClearCompleted: () => void
}

export function QueueStatus({ queue, onClear, onClearCompleted }: QueueStatusProps) {
  const active = queue.filter((op) => op.status !== "done")
  const done = queue.filter((op) => op.status === "done")
  const show = queue.length > 0

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2"
        >
          <div className="flex flex-col gap-1.5 rounded-xl border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-sm max-w-md">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-muted-foreground">
                {active.length > 0
                  ? `Processing ${active.length} operation${active.length > 1 ? "s" : ""}...`
                  : `${done.length} operation${done.length > 1 ? "s" : ""} completed`}
              </span>
              <div className="flex gap-1.5">
                {done.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={onClearCompleted}>
                    Clear done
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={onClear}>
                  Clear all
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {queue.slice(0, 8).map((op) => (
                <span
                  key={op.id}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                    op.status === "done"
                      ? "bg-green-500/10 text-green-400"
                      : op.status === "failed"
                        ? "bg-red-500/10 text-red-400"
                        : op.status === "processing"
                          ? "bg-blue-500/10 text-blue-400"
                          : op.status === "waiting"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-muted text-muted-foreground"
                  }`}
                >
                  {op.status === "processing" && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />}
                  {op.status === "waiting" && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />}
                  {op.status === "done" && "✓"}
                  {op.status === "failed" && "✗"}
                  {op.label}
                </span>
              ))}
              {queue.length > 8 && (
                <span className="text-xs text-muted-foreground">+{queue.length - 8} more</span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
