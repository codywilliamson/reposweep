"use server"

import { revalidatePath } from "next/cache"
import { getOctokit } from "@/lib/github"

export async function toggleVisibility(owner: string, repo: string, makePrivate: boolean) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, private: makePrivate })
  revalidatePath("/dashboard")
}

export async function deleteRepo(owner: string, repo: string) {
  const octokit = await getOctokit()
  await octokit.rest.repos.delete({ owner, repo })
  revalidatePath("/dashboard")
}

export async function renameRepo(owner: string, repo: string, newName: string) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, name: newName })
  revalidatePath("/dashboard")
}

export async function updateDescription(owner: string, repo: string, description: string) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, description })
  revalidatePath("/dashboard")
}

export async function toggleArchive(owner: string, repo: string, archive: boolean) {
  const octokit = await getOctokit()
  await octokit.rest.repos.update({ owner, repo, archived: archive })
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
      results.push({ repo, success: false, error: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  revalidatePath("/dashboard")
  return results
}
