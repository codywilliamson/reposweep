"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function LoginButton() {
  return (
    <Button size="lg" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
      Sign in with GitHub
    </Button>
  )
}
