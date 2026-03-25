"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DeleteModalProps {
  open: boolean
  repos: string[]
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function DeleteModal({ open, repos, onConfirm, onCancel, loading }: DeleteModalProps) {
  const [input, setInput] = useState("")

  const confirmText = repos.length === 1 ? repos[0] : `delete ${repos.length} repos`
  const matches = input === confirmText

  const handleClose = () => {
    setInput("")
    onCancel()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <span className="text-lg text-destructive">⚠</span>
              </div>
              <h3 className="text-lg font-semibold">
                Delete {repos.length === 1 ? repos[0] : `${repos.length} repositories`}?
              </h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This action <strong className="text-destructive">cannot be undone</strong>.
              {repos.length === 1
                ? " This repository will be permanently deleted."
                : " These repositories will be permanently deleted:"}
            </p>
            {repos.length > 1 && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border bg-muted/50 p-3">
                {repos.map((name) => (
                  <div key={name} className="py-1 text-sm">{name}</div>
                ))}
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Type <strong className="text-foreground">{confirmText}</strong> to confirm:
            </p>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="mt-2"
              placeholder={confirmText}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => { onConfirm(); setInput("") }}
                disabled={!matches || loading}
              >
                {loading ? "Deleting..." : "Delete Forever"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
