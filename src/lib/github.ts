import { Octokit } from "octokit";
import type { CommitInsights, CommitTrendDirection, Repo, RepoCommitSpread, WeeklyCommitTotal } from "./types";
import { getSessionStore, type KVNamespaceLike } from "./storage";

const USER_AGENT = "RepoSweep";
const COMMIT_INSIGHTS_CACHE_TTL = 60 * 15;
const MAX_INSIGHT_REPOS = 60;
const COMMIT_ACTIVITY_RETRY_DELAYS_MS = [300, 900, 1500];

interface CommitActivityWeek {
  total: number;
  week: number;
}

interface RepoCommitActivity {
  repo: Repo;
  weeklyTotals: WeeklyCommitTotal[];
  commits: number;
  commitsLast30Days: number;
  commitsLast7Days: number;
  previous7DayCommits: number;
  averageWeeklyCommits: number;
  trendDirection: CommitTrendDirection;
  trendDelta: number;
  sparkline: number[];
}

export function createOctokit(token: string) {
  return new Octokit({
    auth: token,
    userAgent: USER_AGENT,
  });
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

export async function fetchCommitInsights(
  token: string,
  repos: Repo[],
  login: string,
  days = 90,
  runtimeEnv?: unknown,
): Promise<CommitInsights> {
  const normalizedDays = clamp(days, 28, 364);
  const store = getSessionStore(runtimeEnv);
  const cacheKey = `cache:commit-insights:${login}:${normalizedDays}`;

  const cached = await readCachedInsights(store, cacheKey);
  if (cached) return cached;

  const candidates = repos
    .filter((repo) => Boolean(repo.pushed_at))
    .sort((a, b) => new Date(b.pushed_at ?? 0).getTime() - new Date(a.pushed_at ?? 0).getTime())
    .slice(0, MAX_INSIGHT_REPOS);

  const repoActivity = await mapWithConcurrency(candidates, 6, (repo) =>
    fetchRepoCommitActivity(token, repo, normalizedDays),
  );

  const activeRepos = repoActivity
    .filter((activity) => activity.commits > 0)
    .sort((a, b) => b.commits - a.commits);

  const weeklyTotals = buildWeeklyTotals(activeRepos, normalizedDays);
  const totalCommits = activeRepos.reduce((sum, repo) => sum + repo.commits, 0);
  const commitsLast30Days = activeRepos.reduce((sum, repo) => sum + repo.commitsLast30Days, 0);
  const commitsLast7Days = activeRepos.reduce((sum, repo) => sum + repo.commitsLast7Days, 0);
  const previous7DayCommits = activeRepos.reduce((sum, repo) => sum + repo.previous7DayCommits, 0);
  const activeRepoCount = activeRepos.length;
  const averageDailyCommits = roundTo(totalCommits / normalizedDays, 1);
  const averageWeeklyCommits = roundTo(totalCommits / Math.max(1, normalizedDays / 7), 1);
  const averageCommitsPerActiveRepo = activeRepoCount
    ? roundTo(totalCommits / activeRepoCount, 1)
    : 0;
  const topRepoShare = totalCommits ? roundTo((activeRepos[0]?.commits ?? 0) / totalCommits * 100, 1) : 0;
  const overallTrend = calculateTrend(commitsLast7Days, previous7DayCommits);

  const insights: CommitInsights = {
    days: normalizedDays,
    generatedAt: new Date().toISOString(),
    totalRepoCount: repos.length,
    analyzedRepoCount: candidates.length,
    activeRepoCount,
    totalCommits,
    commitsLast30Days,
    commitsLast7Days,
    previous7DayCommits,
    averageDailyCommits,
    averageWeeklyCommits,
    averageCommitsPerActiveRepo,
    topRepoShare,
    trendDirection: overallTrend.direction,
    trendDelta: overallTrend.delta,
    weeklyTotals,
    repoSpread: activeRepos.slice(0, 12).map(toRepoCommitSpread),
  };

  await writeCachedInsights(store, cacheKey, insights);
  return insights;
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

async function fetchRepoCommitActivity(token: string, repo: Repo, days: number): Promise<RepoCommitActivity> {
  const weeks = await getCommitActivityWeeks(token, repo.owner.login, repo.name);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const inRangeWeeks = weeks
    .filter((week) => week.week * 1000 >= cutoff)
    .map((week) => ({
      weekStart: new Date(week.week * 1000).toISOString(),
      total: week.total,
    }));

  const commits = inRangeWeeks.reduce((sum, week) => sum + week.total, 0);
  const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const previous7Days = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const commitsLast30Days = inRangeWeeks
    .filter((week) => new Date(week.weekStart).getTime() >= last30Days)
    .reduce((sum, week) => sum + week.total, 0);
  const commitsLast7Days = inRangeWeeks
    .filter((week) => new Date(week.weekStart).getTime() >= last7Days)
    .reduce((sum, week) => sum + week.total, 0);
  const previous7DayCommits = inRangeWeeks
    .filter((week) => {
      const time = new Date(week.weekStart).getTime();
      return time >= previous7Days && time < last7Days;
    })
    .reduce((sum, week) => sum + week.total, 0);
  const averageWeeklyCommits = inRangeWeeks.length ? roundTo(commits / inRangeWeeks.length, 1) : 0;
  const sparkline = inRangeWeeks.slice(-8).map((week) => week.total);
  const trend = calculateTrend(
    sparkline.slice(-4).reduce((sum, total) => sum + total, 0),
    sparkline.slice(0, Math.max(0, sparkline.length - 4)).reduce((sum, total) => sum + total, 0),
  );

  return {
    repo,
    weeklyTotals: inRangeWeeks,
    commits,
    commitsLast30Days,
    commitsLast7Days,
    previous7DayCommits,
    averageWeeklyCommits,
    trendDirection: trend.direction,
    trendDelta: trend.delta,
    sparkline,
  };
}

async function getCommitActivityWeeks(token: string, owner: string, repo: string): Promise<CommitActivityWeek[]> {
  const octokit = createOctokit(token);

  for (let attempt = 0; attempt <= COMMIT_ACTIVITY_RETRY_DELAYS_MS.length; attempt++) {
    const response = await octokit.request("GET /repos/{owner}/{repo}/stats/commit_activity", {
      owner,
      repo,
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (response.status !== 202) {
      return response.data as CommitActivityWeek[];
    }

    const delay = COMMIT_ACTIVITY_RETRY_DELAYS_MS[attempt];
    if (!delay) break;
    await sleep(delay);
  }

  return [];
}

function buildWeeklyTotals(repoActivity: RepoCommitActivity[], days: number): WeeklyCommitTotal[] {
  const totals = new Map<string, number>();

  for (const repo of repoActivity) {
    for (const week of repo.weeklyTotals) {
      totals.set(week.weekStart, (totals.get(week.weekStart) ?? 0) + week.total);
    }
  }

  return Array.from(totals.entries())
    .map(([weekStart, total]) => ({ weekStart, total }))
    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
    .slice(-Math.ceil(days / 7));
}

function toRepoCommitSpread(activity: RepoCommitActivity): RepoCommitSpread {
  return {
    id: activity.repo.id,
    name: activity.repo.name,
    fullName: activity.repo.full_name,
    htmlUrl: activity.repo.html_url,
    commits: activity.commits,
    commitsLast30Days: activity.commitsLast30Days,
    commitsLast7Days: activity.commitsLast7Days,
    averageWeeklyCommits: activity.averageWeeklyCommits,
    trendDirection: activity.trendDirection,
    trendDelta: activity.trendDelta,
    sparkline: activity.sparkline,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function runWorker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

async function readCachedInsights(store: KVNamespaceLike | null, key: string): Promise<CommitInsights | null> {
  if (!store) return null;

  const cached = await store.get(key, "text");
  if (!cached) return null;

  try {
    return JSON.parse(cached) as CommitInsights;
  } catch {
    return null;
  }
}

async function writeCachedInsights(store: KVNamespaceLike | null, key: string, insights: CommitInsights) {
  if (!store) return;
  await store.put(key, JSON.stringify(insights), { expirationTtl: COMMIT_INSIGHTS_CACHE_TTL });
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return { direction: "steady" as const, delta: 0 };
  }

  if (previous === 0) {
    return { direction: "up" as const, delta: 100 };
  }

  const delta = roundTo(((current - previous) / previous) * 100, 1);

  if (Math.abs(delta) < 8) {
    return { direction: "steady" as const, delta };
  }

  return {
    direction: delta > 0 ? "up" as const : "down" as const,
    delta,
  };
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
