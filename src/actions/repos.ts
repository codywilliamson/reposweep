"use server"

import { revalidatePath } from "next/cache"
import { getOctokit } from "@/lib/github"
import { RequestError } from "octokit"

function handleError(e: unknown): never {
  if (e instanceof RequestError && e.status === 403) {
    const resetHeader = e.response?.headers?.["x-ratelimit-reset"]
    if (resetHeader) {
      const resetTime = new Date(Number(resetHeader) * 1000)
      throw new Error(`Rate limited. Resets at ${resetTime.toLocaleTimeString()}`)
    }
  }
  throw e
}

export async function toggleVisibility(owner: string, repo: string, makePrivate: boolean) {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, private: makePrivate })
  } catch (e) {
    handleError(e)
  }
  revalidatePath("/dashboard")
}

export async function deleteRepo(owner: string, repo: string) {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.delete({ owner, repo })
  } catch (e) {
    handleError(e)
  }
  revalidatePath("/dashboard")
}

export async function renameRepo(owner: string, repo: string, newName: string) {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, name: newName })
  } catch (e) {
    handleError(e)
  }
  revalidatePath("/dashboard")
}

export async function updateDescription(owner: string, repo: string, description: string) {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, description })
  } catch (e) {
    handleError(e)
  }
  revalidatePath("/dashboard")
}

export async function toggleArchive(owner: string, repo: string, archive: boolean) {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, archived: archive })
  } catch (e) {
    handleError(e)
  }
  revalidatePath("/dashboard")
}

export type BulkResult = {
  repo: string
  success: boolean
  error?: string
}

export async function bulkAction(
  repos: { owner: string; repo: string }[],
  action: "make_public" | "make_private" | "archive" | "unarchive" | "delete"
): Promise<BulkResult[]> {
  const octokit = await getOctokit()
  const results: BulkResult[] = []

  for (const { owner, repo } of repos) {
    try {
      switch (action) {
        case "make_public":
          await octokit.rest.repos.update({ owner, repo, private: false })
          break
        case "make_private":
          await octokit.rest.repos.update({ owner, repo, private: true })
          break
        case "archive":
          await octokit.rest.repos.update({ owner, repo, archived: true })
          break
        case "unarchive":
          await octokit.rest.repos.update({ owner, repo, archived: false })
          break
        case "delete":
          await octokit.rest.repos.delete({ owner, repo })
          break
      }
      results.push({ repo, success: true })
    } catch (e) {
      let errorMsg = "Unknown error"
      if (e instanceof RequestError && e.status === 403) {
        const resetHeader = e.response?.headers?.["x-ratelimit-reset"]
        if (resetHeader) {
          const resetTime = new Date(Number(resetHeader) * 1000)
          errorMsg = `Rate limited. Resets at ${resetTime.toLocaleTimeString()}`
        }
      } else if (e instanceof Error) {
        errorMsg = e.message
      }
      results.push({ repo, success: false, error: errorMsg })
    }
  }

  revalidatePath("/dashboard")
  return results
}
