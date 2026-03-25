"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface RateLimitBannerProps {
  resetsAt: number | null
  pendingCount: number
}

export function RateLimitBanner({ resetsAt, pendingCount }: RateLimitBannerProps) {
  const [countdown, setCountdown] = useState("")

  useEffect(() => {
    if (!resetsAt) return
    const tick = () => {
      const remaining = Math.max(0, resetsAt - Date.now())
      const seconds = Math.ceil(remaining / 1000)
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      setCountdown(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [resetsAt])

  return (
    <AnimatePresence>
      {resetsAt && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 overflow-hidden"
        >
          <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
              <span className="text-sm">⏳</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-yellow-200">
                GitHub API rate limit reached
              </p>
              <p className="text-xs text-yellow-200/60">
                Resuming in {countdown}
                {pendingCount > 0 && ` · ${pendingCount} operation${pendingCount > 1 ? "s" : ""} queued`}
              </p>
            </div>
            <div className="shrink-0">
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
