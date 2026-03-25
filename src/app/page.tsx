import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginButton } from "@/components/login-button"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight login-title">reposweep</h1>
        <p className="mt-2 text-muted-foreground">manage your github repos</p>
      </div>
      <LoginButton />
    </main>
  )
}
