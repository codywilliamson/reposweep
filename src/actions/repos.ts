"use server"

import { revalidatePath } from "next/cache"
import { getOctokit } from "@/lib/github"
import { RequestError } from "octokit"

export type ActionResult = {
  success: boolean
  error?: string
  rateLimited?: boolean
  rateLimitResetsAt?: number
}

function parseRateLimit(e: unknown): ActionResult {
  if (e instanceof RequestError && e.status === 403) {
    const resetHeader = e.response?.headers?.["x-ratelimit-reset"]
    if (resetHeader) {
      return {
        success: false,
        error: "Rate limited",
        rateLimited: true,
        rateLimitResetsAt: Number(resetHeader) * 1000,
      }
    }
  }
  return {
    success: false,
    error: e instanceof Error ? e.message : "Unknown error",
  }
}

export async function toggleVisibility(owner: string, repo: string, makePrivate: boolean): Promise<ActionResult> {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, private: makePrivate })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (e) {
    return parseRateLimit(e)
  }
}

export async function deleteRepo(owner: string, repo: string): Promise<ActionResult> {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.delete({ owner, repo })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (e) {
    return parseRateLimit(e)
  }
}

export async function renameRepo(owner: string, repo: string, newName: string): Promise<ActionResult> {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, name: newName })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (e) {
    return parseRateLimit(e)
  }
}

export async function updateDescription(owner: string, repo: string, description: string): Promise<ActionResult> {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, description })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (e) {
    return parseRateLimit(e)
  }
}

export async function toggleArchive(owner: string, repo: string, archive: boolean): Promise<ActionResult> {
  const octokit = await getOctokit()
  try {
    await octokit.rest.repos.update({ owner, repo, archived: archive })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (e) {
    return parseRateLimit(e)
  }
}
