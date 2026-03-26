import { Octokit } from "octokit";
import type { Repo } from "./types";

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function fetchUserRepos(token: string): Promise<Repo[]> {
  const octokit = createOctokit(token);
  const repos: Repo[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: "updated",
      affiliation: "owner",
    });

    if (data.length === 0) break;
    repos.push(...(data as unknown as Repo[]));
    if (data.length < 100) break;
    page++;
  }

  return repos;
}

export async function toggleVisibility(token: string, owner: string, repo: string, isPrivate: boolean) {
  const octokit = createOctokit(token);
  return octokit.rest.repos.update({ owner, repo, private: isPrivate });
}

export async function deleteRepo(token: string, owner: string, repo: string) {
  const octokit = createOctokit(token);
  return octokit.rest.repos.delete({ owner, repo });
}

export async function renameRepo(token: string, owner: string, repo: string, newName: string) {
  const octokit = createOctokit(token);
  return octokit.rest.repos.update({ owner, repo, name: newName });
}

export async function updateDescription(token: string, owner: string, repo: string, description: string) {
  const octokit = createOctokit(token);
  return octokit.rest.repos.update({ owner, repo, description });
}

export async function toggleArchive(token: string, owner: string, repo: string, archived: boolean) {
  const octokit = createOctokit(token);
  return octokit.rest.repos.update({ owner, repo, archived });
}
