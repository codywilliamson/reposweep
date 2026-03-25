"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  repos: string[]
  confirmLabel: string
  confirmVariant?: "default" | "destructive"
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmModal({
  open,
  title,
  description,
  repos,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {repos.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border bg-muted/50 p-3">
                {repos.map((name) => (
                  <div key={name} className="py-1 text-sm">{name}</div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
              <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
                {loading ? "Working..." : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
