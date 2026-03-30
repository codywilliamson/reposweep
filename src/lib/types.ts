export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  private: boolean;
  archived: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  owner: { login: string };
}

export interface GitHubSession {
  accessToken: string;
  login: string;
  avatarUrl: string;
  name: string | null;
}

export type CommitTrendDirection = "up" | "down" | "steady";

export interface WeeklyCommitTotal {
  weekStart: string;
  total: number;
}

export interface RepoCommitSpread {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  commits: number;
  commitsLast30Days: number;
  commitsLast7Days: number;
  averageWeeklyCommits: number;
  trendDirection: CommitTrendDirection;
  trendDelta: number;
  sparkline: number[];
}

export interface CommitInsights {
  days: number;
  generatedAt: string;
  totalRepoCount: number;
  analyzedRepoCount: number;
  activeRepoCount: number;
  totalCommits: number;
  commitsLast30Days: number;
  commitsLast7Days: number;
  previous7DayCommits: number;
  averageDailyCommits: number;
  averageWeeklyCommits: number;
  averageCommitsPerActiveRepo: number;
  topRepoShare: number;
  trendDirection: CommitTrendDirection;
  trendDelta: number;
  weeklyTotals: WeeklyCommitTotal[];
  repoSpread: RepoCommitSpread[];
}

export type Visibility = "all" | "public" | "private";
export type ArchivedFilter = "all" | "active" | "archived";
export type SortField = "name" | "created" | "updated" | "stars";
export type SortDir = "asc" | "desc";

export interface FilterState {
  search: string;
  visibility: Visibility;
  archived: ArchivedFilter;
  language: string;
  sortField: SortField;
  sortDir: SortDir;
}

export type OperationStatus = "pending" | "processing" | "done" | "failed";

export interface QueuedOperation {
  id: string;
  label: string;
  status: OperationStatus;
  error?: string;
}
