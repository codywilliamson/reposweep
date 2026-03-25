"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { ActionResult } from "@/actions/repos"

export type QueuedOperation = {
  id: string
  label: string
  execute: () => Promise<ActionResult>
  status: "pending" | "processing" | "done" | "failed" | "waiting"
  error?: string
}

export function useOperationQueue() {
  const [queue, setQueue] = useState<QueuedOperation[]>([])
  const [rateLimitResetsAt, setRateLimitResetsAt] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enqueue = useCallback((ops: Omit<QueuedOperation, "status">[]) => {
    setQueue((prev) => [
      ...prev,
      ...ops.map((op) => ({ ...op, status: "pending" as const })),
    ])
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    setRateLimitResetsAt(null)
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((op) => op.status !== "done"))
  }, [])

  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setIsProcessing(true)

    while (true) {
      // find next pending op
      let nextIdx = -1
      setQueue((prev) => {
        nextIdx = prev.findIndex((op) => op.status === "pending" || op.status === "waiting")
        return prev
      })

      // need to read state synchronously — use a promise to get it
      const currentQueue = await new Promise<QueuedOperation[]>((resolve) => {
        setQueue((prev) => {
          resolve(prev)
          return prev
        })
      })

      const next = currentQueue.find((op) => op.status === "pending" || op.status === "waiting")
      if (!next) break

      // mark as processing
      setQueue((prev) =>
        prev.map((op) => (op.id === next.id ? { ...op, status: "processing" as const } : op))
      )

      const result = await next.execute()

      if (result.success) {
        setQueue((prev) =>
          prev.map((op) => (op.id === next.id ? { ...op, status: "done" as const } : op))
        )
      } else if (result.rateLimited && result.rateLimitResetsAt) {
        // rate limited — pause everything
        const resetAt = result.rateLimitResetsAt
        setRateLimitResetsAt(resetAt)

        // mark this op and all pending as waiting
        setQueue((prev) =>
          prev.map((op) =>
            op.id === next.id || op.status === "pending"
              ? { ...op, status: "waiting" as const }
              : op
          )
        )

        // wait until rate limit resets + 1s buffer
        const waitMs = Math.max(resetAt - Date.now() + 1000, 1000)
        await new Promise((resolve) => {
          retryTimerRef.current = setTimeout(resolve, waitMs)
        })

        setRateLimitResetsAt(null)

        // mark waiting ops back to pending
        setQueue((prev) =>
          prev.map((op) =>
            op.status === "waiting" ? { ...op, status: "pending" as const } : op
          )
        )
      } else {
        // non-rate-limit failure
        setQueue((prev) =>
          prev.map((op) =>
            op.id === next.id ? { ...op, status: "failed" as const, error: result.error } : op
          )
        )
      }
    }

    processingRef.current = false
    setIsProcessing(false)
  }, [])

  // auto-process when queue changes
  useEffect(() => {
    const hasPending = queue.some((op) => op.status === "pending")
    if (hasPending && !processingRef.current) {
      processQueue()
    }
  }, [queue, processQueue])

  return {
    queue,
    enqueue,
    clearQueue,
    clearCompleted,
    rateLimitResetsAt,
    isProcessing,
    pendingCount: queue.filter((op) => op.status === "pending" || op.status === "waiting").length,
    processingCount: queue.filter((op) => op.status === "processing").length,
    doneCount: queue.filter((op) => op.status === "done").length,
    failedCount: queue.filter((op) => op.status === "failed").length,
  }
}
