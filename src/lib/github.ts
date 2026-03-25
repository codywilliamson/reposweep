import { Octokit } from "octokit"
import { auth } from "@/lib/auth"

export async function getOctokit() {
  const session = await auth()
  if (!session?.accessToken) {
    throw new Error("Not authenticated")
  }
  return new Octokit({ auth: session.accessToken })
}

export async function fetchUserRepos() {
  const octokit = await getOctokit()
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    affiliation: "owner",
    sort: "updated",
  })
  return repos
}
