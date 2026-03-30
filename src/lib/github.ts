import { Octokit } from "octokit";
import type {
  CommitInsights,
  CommitInsightsFilters,
  CommitTrendDirection,
  Repo,
  RepoCommitSpread,
  WeeklyCommitTotal,
} from "./types";
import { getSessionStore, type KVNamespaceLike } from "./storage";

const USER_AGENT = "RepoSweep";
const COMMIT_INSIGHTS_CACHE_TTL = 60 * 10;
const DEFAULT_REPO_LIMIT = 25;
const COMMIT_FETCH_CONCURRENCY = 4;

interface CommitListItem {
  commit: {
    author?: { date?: string | null } | null;
    committer?: { date?: string | null } | null;
  };
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
  filters: CommitInsightsFilters,
  runtimeEnv?: unknown,
): Promise<CommitInsights> {
  const normalizedFilters = normalizeInsightFilters(filters);
  const store = getSessionStore(runtimeEnv);
  const cacheKey = [
    "cache:commit-insights",
    login,
    normalizedFilters.days,
    normalizedFilters.visibility,
    normalizedFilters.archived,
    normalizedFilters.limit,
    normalizedFilters.sort,
    normalizedFilters.search || "-",
  ].join(":");

  const cached = await readCachedInsights(store, cacheKey);
  if (cached) return cached;

  const since = new Date(Date.now() - normalizedFilters.days * 24 * 60 * 60 * 1000);
  const until = new Date();
  const matchingRepos = repos
    .filter((repo) => matchesVisibility(repo, normalizedFilters.visibility))
    .filter((repo) => matchesArchived(repo, normalizedFilters.archived))
    .filter((repo) => matchesSearch(repo, normalizedFilters.search))
    .filter((repo) => {
      if (!repo.pushed_at) return false;
      return new Date(repo.pushed_at).getTime() >= since.getTime();
    })
    .sort((a, b) => new Date(b.pushed_at ?? 0).getTime() - new Date(a.pushed_at ?? 0).getTime());

  const analyzedRepos = matchingRepos.slice(0, normalizedFilters.limit);
  const repoActivity = await mapWithConcurrency(analyzedRepos, COMMIT_FETCH_CONCURRENCY, (repo) =>
    fetchRepoCommitActivity(token, repo, since, until),
  );

  const activeRepos = repoActivity
    .filter((activity) => activity.commits > 0)
    .sort((a, b) => compareRepoActivity(a, b, normalizedFilters.sort));

  const weeklyTotals = buildWeeklyTotals(activeRepos, since, until);
  const totalCommits = activeRepos.reduce((sum, repo) => sum + repo.commits, 0);
  const commitsLast30Days = activeRepos.reduce((sum, repo) => sum + repo.commitsLast30Days, 0);
  const commitsLast7Days = activeRepos.reduce((sum, repo) => sum + repo.commitsLast7Days, 0);
  const previous7DayCommits = activeRepos.reduce((sum, repo) => sum + repo.previous7DayCommits, 0);
  const activeRepoCount = activeRepos.length;
  const averageDailyCommits = roundTo(totalCommits / normalizedFilters.days, 1);
  const averageWeeklyCommits = roundTo(totalCommits / Math.max(1, normalizedFilters.days / 7), 1);
  const averageCommitsPerActiveRepo = activeRepoCount ? roundTo(totalCommits / activeRepoCount, 1) : 0;
  const topRepoShare = totalCommits ? roundTo(((activeRepos[0]?.commits ?? 0) / totalCommits) * 100, 1) : 0;
  const overallTrend = calculateTrend(commitsLast7Days, previous7DayCommits);

  const insights: CommitInsights = {
    days: normalizedFilters.days,
    generatedAt: new Date().toISOString(),
    totalRepoCount: repos.length,
    matchingRepoCount: matchingRepos.length,
    analyzedRepoCount: analyzedRepos.length,
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
    repoSpread: activeRepos.map(toRepoCommitSpread),
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

async function fetchRepoCommitActivity(
  token: string,
  repo: Repo,
  since: Date,
  until: Date,
): Promise<RepoCommitActivity> {
  const commits = await listRepoCommits(token, repo.owner.login, repo.name, since, until);
  const weeklyMap = new Map<string, number>();
  const last7Cutoff = until.getTime() - 7 * 24 * 60 * 60 * 1000;
  const previous7Cutoff = until.getTime() - 14 * 24 * 60 * 60 * 1000;
  const last30Cutoff = until.getTime() - 30 * 24 * 60 * 60 * 1000;
  let commitsLast30Days = 0;
  let commitsLast7Days = 0;
  let previous7DayCommits = 0;

  for (const commit of commits) {
    const commitDate = getCommitDate(commit);
    if (!commitDate) continue;

    const time = new Date(commitDate).getTime();
    const weekStart = toWeekStartKey(commitDate);
    weeklyMap.set(weekStart, (weeklyMap.get(weekStart) ?? 0) + 1);

    if (time >= last30Cutoff) commitsLast30Days++;
    if (time >= last7Cutoff) commitsLast7Days++;
    if (time >= previous7Cutoff && time < last7Cutoff) previous7DayCommits++;
  }

  const weeklyTotals = buildRepoWeeklyTotals(weeklyMap, since, until);
  const sparkline = weeklyTotals.slice(-8).map((week) => week.total);
  const trend = calculateTrend(commitsLast7Days, previous7DayCommits);
  const totalCommits = commits.length;

  return {
    repo,
    weeklyTotals,
    commits: totalCommits,
    commitsLast30Days,
    commitsLast7Days,
    previous7DayCommits,
    averageWeeklyCommits: weeklyTotals.length ? roundTo(totalCommits / weeklyTotals.length, 1) : 0,
    trendDirection: trend.direction,
    trendDelta: trend.delta,
    sparkline,
  };
}

async function listRepoCommits(
  token: string,
  owner: string,
  repo: string,
  since: Date,
  until: Date,
): Promise<CommitListItem[]> {
  const octokit = createOctokit(token);
  const commits: CommitListItem[] = [];

  try {
    for await (const response of octokit.paginate.iterator(octokit.rest.repos.listCommits, {
      owner,
      repo,
      per_page: 100,
      since: since.toISOString(),
      until: until.toISOString(),
      headers: {
        "User-Agent": USER_AGENT,
      },
    })) {
      commits.push(...(response.data as CommitListItem[]));
    }
  } catch {
    return [];
  }

  return commits;
}

function buildWeeklyTotals(repoActivity: RepoCommitActivity[], since: Date, until: Date): WeeklyCommitTotal[] {
  const totals = new Map<string, number>();

  for (const repo of repoActivity) {
    for (const week of repo.weeklyTotals) {
      totals.set(week.weekStart, (totals.get(week.weekStart) ?? 0) + week.total);
    }
  }

  return fillWeeklyRange(totals, since, until);
}

function buildRepoWeeklyTotals(weeklyMap: Map<string, number>, since: Date, until: Date): WeeklyCommitTotal[] {
  return fillWeeklyRange(weeklyMap, since, until);
}

function fillWeeklyRange(weeklyMap: Map<string, number>, since: Date, until: Date): WeeklyCommitTotal[] {
  const totals: WeeklyCommitTotal[] = [];
  const current = startOfWeek(since);
  const end = startOfWeek(until);

  while (current.getTime() <= end.getTime()) {
    const key = current.toISOString();
    totals.push({
      weekStart: key,
      total: weeklyMap.get(key) ?? 0,
    });
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return totals;
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

function normalizeInsightFilters(filters: CommitInsightsFilters): CommitInsightsFilters {
  return {
    days: clamp(filters.days, 7, 365),
    visibility: filters.visibility,
    archived: filters.archived,
    search: filters.search.trim(),
    limit: clamp(filters.limit || DEFAULT_REPO_LIMIT, 1, 100),
    sort: filters.sort,
  };
}

function compareRepoActivity(a: RepoCommitActivity, b: RepoCommitActivity, sort: CommitInsightsFilters["sort"]) {
  switch (sort) {
    case "last7":
      return b.commitsLast7Days - a.commitsLast7Days || b.commits - a.commits;
    case "last30":
      return b.commitsLast30Days - a.commitsLast30Days || b.commits - a.commits;
    case "avgWeekly":
      return b.averageWeeklyCommits - a.averageWeeklyCommits || b.commits - a.commits;
    default:
      return b.commits - a.commits;
  }
}

function matchesVisibility(repo: Repo, visibility: CommitInsightsFilters["visibility"]) {
  if (visibility === "all") return true;
  return visibility === "private" ? repo.private : !repo.private;
}

function matchesArchived(repo: Repo, archived: CommitInsightsFilters["archived"]) {
  if (archived === "all") return true;
  return archived === "archived" ? repo.archived : !repo.archived;
}

function matchesSearch(repo: Repo, search: string) {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return repo.name.toLowerCase().includes(normalized) || repo.full_name.toLowerCase().includes(normalized);
}

function getCommitDate(commit: CommitListItem) {
  return commit.commit.author?.date ?? commit.commit.committer?.date ?? null;
}

function toWeekStartKey(value: string) {
  return startOfWeek(new Date(value)).toISOString();
}

function startOfWeek(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
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
