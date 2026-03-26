<script setup lang="ts">
import type { FilterState, Visibility, ArchivedFilter, SortField, SortDir } from "@/lib/types";

const filters = defineModel<FilterState>("filters", { required: true });

defineProps<{
  languages: string[];
  total: number;
  selectedCount: number;
}>();

defineEmits<{
  selectAll: [];
  clearSelection: [];
}>();

const visibilityOptions: { value: Visibility; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const archivedOptions: { value: ArchivedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const sortOptions: { value: SortField; label: string }[] = [
  { value: "updated", label: "Updated" },
  { value: "name", label: "Name" },
  { value: "created", label: "Created" },
  { value: "stars", label: "Stars" },
];

function toggleSortDir() {
  filters.value = {
    ...filters.value,
    sortDir: filters.value.sortDir === "asc" ? "desc" : "asc",
  };
}
</script>

<template>
  <div class="glass rounded-xl p-4">
    <div class="flex flex-wrap items-center gap-3">
      <!-- search -->
      <div class="relative flex-1 min-w-[200px]">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          v-model="filters.search"
          type="text"
          placeholder="Search repositories..."
          class="w-full rounded-lg border border-border-default bg-bg-primary py-2 pl-10 pr-4 text-sm text-fg-primary placeholder-fg-muted outline-none transition-colors focus:border-accent-purple"
        />
      </div>

      <!-- visibility pills -->
      <div class="flex rounded-lg border border-border-default">
        <button
          v-for="opt in visibilityOptions"
          :key="opt.value"
          @click="filters.visibility = opt.value"
          class="px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg"
          :class="filters.visibility === opt.value ? 'bg-accent-purple text-bg-primary' : 'text-fg-muted hover:text-fg-primary'"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- archived pills -->
      <div class="flex rounded-lg border border-border-default">
        <button
          v-for="opt in archivedOptions"
          :key="opt.value"
          @click="filters.archived = opt.value"
          class="px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg"
          :class="filters.archived === opt.value ? 'bg-accent-cyan text-bg-primary' : 'text-fg-muted hover:text-fg-primary'"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- language dropdown -->
      <select
        v-model="filters.language"
        class="rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-secondary outline-none transition-colors focus:border-accent-purple"
      >
        <option value="">All Languages</option>
        <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
      </select>

      <!-- sort -->
      <div class="flex items-center gap-1">
        <select
          v-model="filters.sortField"
          class="rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-secondary outline-none transition-colors focus:border-accent-purple"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button
          @click="toggleSortDir"
          class="rounded-lg border border-border-default p-2 text-fg-muted transition-colors hover:border-accent-purple hover:text-fg-primary"
          :title="filters.sortDir === 'asc' ? 'Ascending' : 'Descending'"
        >
          <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-180': filters.sortDir === 'desc' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
