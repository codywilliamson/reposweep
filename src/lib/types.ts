import "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string
  }
}


export interface Repo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  archived: boolean
  language: string | null
  stargazers_count: number
  updated_at: string
  created_at: string
  html_url: string
  owner: {
    login: string
  }
}

export type Visibility = "all" | "public" | "private"
export type ArchivedFilter = "all" | "active" | "archived"
export type SortField = "name" | "created_at" | "updated_at" | "stargazers_count"
export type SortDirection = "asc" | "desc"

export interface FilterState {
  search: string
  visibility: Visibility
  language: string | null
  archived: ArchivedFilter
  sortField: SortField
  sortDirection: SortDirection
}
