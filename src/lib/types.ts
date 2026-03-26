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
