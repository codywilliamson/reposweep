<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { Repo, FilterState, Visibility, ArchivedFilter, SortField, SortDir } from "@/lib/types";
import RepoCard from "./RepoCard.vue";
import FilterBar from "./FilterBar.vue";
import BulkActionBar from "./BulkActionBar.vue";
import ConfirmModal from "../ui/ConfirmModal.vue";
import DeleteModal from "../ui/DeleteModal.vue";
import QueueStatus from "../ui/QueueStatus.vue";
import type { QueuedOperation } from "@/lib/types";

const props = defineProps<{
  repos: Repo[];
  login: string;
}>();

const allRepos = ref<Repo[]>([...props.repos]);
const selected = ref<Set<number>>(new Set());
const expandedId = ref<number | null>(null);
const queue = ref<QueuedOperation[]>([]);

const filters = ref<FilterState>({
  search: "",
  visibility: "all",
  archived: "all",
  language: "",
  sortField: "updated",
  sortDir: "desc",
});

// modal state
const confirmModal = ref<{ title: string; description: string; repos: string[]; action: () => Promise<void> } | null>(null);
const deleteModal = ref<{ repos: string[]; action: () => Promise<void> } | null>(null);

const languages = computed(() => {
  const set = new Set<string>();
  allRepos.value.forEach((r) => r.language && set.add(r.language));
  return Array.from(set).sort();
});

const filtered = computed(() => {
  let result = allRepos.value;

  if (filters.value.search) {
    const q = filters.value.search.toLowerCase();
    result = result.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q),
    );
  }

  if (filters.value.visibility !== "all") {
    result = result.filter((r) =>
      filters.value.visibility === "private" ? r.private : !r.private,
    );
  }

  if (filters.value.archived !== "all") {
    result = result.filter((r) =>
      filters.value.archived === "archived" ? r.archived : !r.archived,
    );
  }

  if (filters.value.language) {
    result = result.filter((r) => r.language === filters.value.language);
  }

  result = [...result].sort((a, b) => {
    let cmp = 0;
    switch (filters.value.sortField) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "created":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "updated":
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        break;
      case "stars":
        cmp = a.stargazers_count - b.stargazers_count;
        break;
    }
    return filters.value.sortDir === "desc" ? -cmp : cmp;
  });

  return result;
});

function toggleSelect(id: number) {
  const s = new Set(selected.value);
  s.has(id) ? s.delete(id) : s.add(id);
  selected.value = s;
}

function selectAll() {
  selected.value = new Set(filtered.value.map((r) => r.id));
}

function clearSelection() {
  selected.value = new Set();
}

// api helper
async function apiCall(action: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/repos/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed: ${action}`);
  }
  return res.json();
}

function addToQueue(label: string): string {
  const id = crypto.randomUUID();
  queue.value = [...queue.value, { id, label, status: "pending" }];
  return id;
}

function updateQueue(id: string, status: QueuedOperation["status"], error?: string) {
  queue.value = queue.value.map((op) => (op.id === id ? { ...op, status, error } : op));
}

async function runOperation(label: string, fn: () => Promise<void>) {
  const id = addToQueue(label);
  updateQueue(id, "processing");
  try {
    await fn();
    updateQueue(id, "done");
  } catch (e: any) {
    updateQueue(id, "failed", e.message);
  }
}

// single-repo actions
async function handleToggleVisibility(repo: Repo) {
  const newPrivate = !repo.private;
  const label = `${newPrivate ? "Making private" : "Making public"}: ${repo.name}`;
  await runOperation(label, async () => {
    await apiCall("toggle-visibility", { owner: repo.owner.login, repo: repo.name, private: newPrivate });
    allRepos.value = allRepos.value.map((r) => (r.id === repo.id ? { ...r, private: newPrivate } : r));
  });
}

async function handleDelete(repo: Repo) {
  deleteModal.value = {
    repos: [repo.name],
    action: async () => {
      deleteModal.value = null;
      await runOperation(`Deleting: ${repo.name}`, async () => {
        await apiCall("delete", { owner: repo.owner.login, repo: repo.name });
        allRepos.value = allRepos.value.filter((r) => r.id !== repo.id);
        selected.value.delete(repo.id);
      });
    },
  };
}

async function handleRename(repo: Repo, newName: string) {
  if (newName === repo.name || !newName.trim()) return;
  await runOperation(`Renaming: ${repo.name} → ${newName}`, async () => {
    await apiCall("rename", { owner: repo.owner.login, repo: repo.name, newName });
    allRepos.value = allRepos.value.map((r) => (r.id === repo.id ? { ...r, name: newName } : r));
  });
}

async function handleUpdateDescription(repo: Repo, description: string) {
  if (description === (repo.description ?? "")) return;
  await runOperation(`Updating description: ${repo.name}`, async () => {
    await apiCall("update-description", { owner: repo.owner.login, repo: repo.name, description });
    allRepos.value = allRepos.value.map((r) => (r.id === repo.id ? { ...r, description } : r));
  });
}

async function handleToggleArchive(repo: Repo) {
  const newArchived = !repo.archived;
  const label = `${newArchived ? "Archiving" : "Unarchiving"}: ${repo.name}`;
  await runOperation(label, async () => {
    await apiCall("toggle-archive", { owner: repo.owner.login, repo: repo.name, archived: newArchived });
    allRepos.value = allRepos.value.map((r) => (r.id === repo.id ? { ...r, archived: newArchived } : r));
  });
}

// bulk actions
function getSelectedRepos() {
  return allRepos.value.filter((r) => selected.value.has(r.id));
}

async function bulkAction(title: string, description: string, action: (repos: Repo[]) => Promise<void>) {
  const repos = getSelectedRepos();
  confirmModal.value = {
    title,
    description,
    repos: repos.map((r) => r.name),
    action: async () => {
      confirmModal.value = null;
      clearSelection();
      await action(repos);
    },
  };
}

function bulkMakePublic() {
  const repos = getSelectedRepos().filter((r) => r.private);
  if (!repos.length) return;
  bulkAction("Make Public", `Make ${repos.length} repos public?`, async (targets) => {
    for (const r of targets.filter((t) => t.private)) {
      await runOperation(`Making public: ${r.name}`, () =>
        apiCall("toggle-visibility", { owner: r.owner.login, repo: r.name, private: false }),
      );
      allRepos.value = allRepos.value.map((repo) =>
        repo.id === r.id ? { ...repo, private: false } : repo,
      );
    }
  });
}

function bulkMakePrivate() {
  const repos = getSelectedRepos().filter((r) => !r.private);
  if (!repos.length) return;
  bulkAction("Make Private", `Make ${repos.length} repos private?`, async (targets) => {
    for (const r of targets.filter((t) => !t.private)) {
      await runOperation(`Making private: ${r.name}`, () =>
        apiCall("toggle-visibility", { owner: r.owner.login, repo: r.name, private: true }),
      );
      allRepos.value = allRepos.value.map((repo) =>
        repo.id === r.id ? { ...repo, private: true } : repo,
      );
    }
  });
}

function bulkArchive() {
  const repos = getSelectedRepos().filter((r) => !r.archived);
  if (!repos.length) return;
  bulkAction("Archive", `Archive ${repos.length} repos?`, async (targets) => {
    for (const r of targets.filter((t) => !t.archived)) {
      await runOperation(`Archiving: ${r.name}`, () =>
        apiCall("toggle-archive", { owner: r.owner.login, repo: r.name, archived: true }),
      );
      allRepos.value = allRepos.value.map((repo) =>
        repo.id === r.id ? { ...repo, archived: true } : repo,
      );
    }
  });
}

function bulkDelete() {
  const repos = getSelectedRepos();
  if (!repos.length) return;
  deleteModal.value = {
    repos: repos.map((r) => r.name),
    action: async () => {
      deleteModal.value = null;
      clearSelection();
      for (const r of repos) {
        await runOperation(`Deleting: ${r.name}`, () =>
          apiCall("delete", { owner: r.owner.login, repo: r.name }),
        );
        allRepos.value = allRepos.value.filter((repo) => repo.id !== r.id);
      }
    },
  };
}

// keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (confirmModal.value || deleteModal.value) return;
    if (expandedId.value !== null) {
      expandedId.value = null;
    } else {
      clearSelection();
    }
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "a") {
    e.preventDefault();
    selectAll();
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));

function clearCompleted() {
  queue.value = queue.value.filter((op) => op.status !== "done");
}
</script>

<template>
  <div>
    <FilterBar
      v-model:filters="filters"
      :languages="languages"
      :total="filtered.length"
      :selected-count="selected.size"
      @select-all="selectAll"
      @clear-selection="clearSelection"
    />

    <!-- empty state -->
    <div v-if="filtered.length === 0" class="glass mt-6 rounded-xl p-12 text-center">
      <svg class="mx-auto mb-4 h-12 w-12 text-fg-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      </svg>
      <p class="text-fg-muted">No repositories match your filters</p>
    </div>

    <!-- repo grid -->
    <div v-else class="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RepoCard
        v-for="repo in filtered"
        :key="repo.id"
        :repo="repo"
        :selected="selected.has(repo.id)"
        :expanded="expandedId === repo.id"
        @toggle-select="toggleSelect(repo.id)"
        @toggle-expand="expandedId = expandedId === repo.id ? null : repo.id"
        @toggle-visibility="handleToggleVisibility(repo)"
        @delete="handleDelete(repo)"
        @rename="(name: string) => handleRename(repo, name)"
        @update-description="(desc: string) => handleUpdateDescription(repo, desc)"
        @toggle-archive="handleToggleArchive(repo)"
      />
    </div>

    <!-- bulk action bar -->
    <Transition name="slide-up">
      <BulkActionBar
        v-if="selected.size > 0"
        :count="selected.size"
        @make-public="bulkMakePublic"
        @make-private="bulkMakePrivate"
        @archive="bulkArchive"
        @delete="bulkDelete"
        @clear="clearSelection"
      />
    </Transition>

    <!-- queue status -->
    <QueueStatus :operations="queue" @clear-completed="clearCompleted" />

    <!-- modals -->
    <ConfirmModal
      v-if="confirmModal"
      :title="confirmModal.title"
      :description="confirmModal.description"
      :repos="confirmModal.repos"
      @confirm="confirmModal.action()"
      @cancel="confirmModal = null"
    />
    <DeleteModal
      v-if="deleteModal"
      :repos="deleteModal.repos"
      @confirm="deleteModal.action()"
      @cancel="deleteModal = null"
    />
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
