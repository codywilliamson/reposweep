"use client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { FilterState, Visibility, ArchivedFilter, SortField } from "@/lib/types"

const SORT_OPTIONS: { label: string; field: SortField }[] = [
  { label: "Name", field: "name" },
  { label: "Created", field: "created_at" },
  { label: "Updated", field: "updated_at" },
  { label: "Stars", field: "stargazers_count" },
]

interface FilterBarProps {
  filters: FilterState
  languages: string[]
  onChange: (filters: FilterState) => void
}

export function FilterBar({ filters, languages, onChange }: FilterBarProps) {
  const update = (partial: Partial<FilterState>) =>
    onChange({ ...filters, ...partial })

  return (
    <div className="mb-6 flex flex-col gap-3">
      <Input
        placeholder="Search repos..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="max-w-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* visibility pills */}
        {(["all", "public", "private"] as Visibility[]).map((v) => (
          <Badge
            key={v}
            variant={filters.visibility === v ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => update({ visibility: v })}
          >
            {v}
          </Badge>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* archived pills */}
        {(["all", "active", "archived"] as ArchivedFilter[]).map((a) => (
          <Badge
            key={a}
            variant={filters.archived === a ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => update({ archived: a })}
          >
            {a}
          </Badge>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* language dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" />}
          >
            {filters.language ?? "All languages"}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => update({ language: null })}>
              All languages
            </DropdownMenuItem>
            {languages.map((lang) => (
              <DropdownMenuItem key={lang} onClick={() => update({ language: lang })}>
                {lang}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" />}
          >
            Sort: {SORT_OPTIONS.find((o) => o.field === filters.sortField)?.label}
            {filters.sortDirection === "asc" ? " ↑" : " ↓"}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.field}
                onClick={() =>
                  update({
                    sortField: opt.field,
                    sortDirection:
                      filters.sortField === opt.field
                        ? filters.sortDirection === "asc" ? "desc" : "asc"
                        : "desc",
                  })
                }
              >
                {opt.label}
                {filters.sortField === opt.field && (filters.sortDirection === "asc" ? " ↑" : " ↓")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
