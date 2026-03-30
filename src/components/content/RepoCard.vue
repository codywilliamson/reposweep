<script setup lang="ts">
import { ref, watch } from "vue";
import type { Repo } from "@/lib/types";

const props = defineProps<{
  repo: Repo;
  selected: boolean;
  expanded: boolean;
}>();

const emit = defineEmits<{
  toggleSelect: [];
  toggleExpand: [];
  toggleVisibility: [];
  delete: [];
  rename: [name: string];
  updateDescription: [desc: string];
  toggleArchive: [];
}>();

const editName = ref(props.repo.name);
const editDesc = ref(props.repo.description ?? "");

watch(() => props.repo.name, (v) => (editName.value = v));
watch(() => props.repo.description, (v) => (editDesc.value = v ?? ""));

function submitName() {
  if (editName.value.trim() && editName.value !== props.repo.name) {
    emit("rename", editName.value.trim());
  }
}

function submitDesc() {
  if (editDesc.value !== (props.repo.description ?? "")) {
    emit("updateDescription", editDesc.value);
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
</script>

<template>
  <div
    class="glass group rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-accent-purple/30"
    :class="[
      selected ? 'ring-2 ring-accent-purple' : '',
      expanded ? 'sm:col-span-2 lg:col-span-3' : '',
    ]"
  >
    <!-- collapsed view -->
    <div class="flex items-start gap-3 p-4 cursor-pointer" @click="emit('toggleExpand')">
      <!-- checkbox -->
      <label class="mt-0.5 flex-shrink-0" @click.stop>
        <input
          type="checkbox"
          :checked="selected"
          @change="emit('toggleSelect')"
          class="h-4 w-4 rounded border-border-default bg-bg-primary text-accent-purple accent-accent-purple"
        />
      </label>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="truncate text-sm font-semibold text-fg-primary">{{ repo.name }}</h3>
          <span
            class="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="repo.archived
              ? 'bg-accent-orange/20 text-accent-orange'
              : repo.private
                ? 'bg-accent-yellow/20 text-accent-yellow'
                : 'bg-accent-green/20 text-accent-green'
            "
          >
            {{ repo.archived ? "Archived" : repo.private ? "Private" : "Public" }}
          </span>
          <span v-if="repo.fork" class="flex-shrink-0 rounded-full bg-accent-cyan/20 px-2 py-0.5 text-xs text-accent-cyan">Fork</span>
        </div>

        <p v-if="repo.description" class="mt-1 truncate text-xs text-fg-muted">
          {{ repo.description }}
        </p>

        <div class="mt-2 flex items-center gap-3 text-xs text-fg-muted">
          <span v-if="repo.language" class="flex items-center gap-1">
            <span class="h-2.5 w-2.5 rounded-full bg-accent-purple" />
            {{ repo.language }}
          </span>
          <span v-if="repo.stargazers_count > 0" class="flex items-center gap-1">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            {{ repo.stargazers_count }}
          </span>
          <span>{{ formatDate(repo.updated_at) }}</span>
        </div>
      </div>

      <!-- expand indicator -->
      <svg
        class="h-4 w-4 flex-shrink-0 text-fg-muted transition-transform"
        :class="{ 'rotate-180': expanded }"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      ><path d="m6 9 6 6 6-6" /></svg>
    </div>

    <!-- expanded view -->
    <Transition name="expand">
      <div v-if="expanded" class="border-t border-border-muted px-4 pb-4 pt-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <!-- editable name -->
          <div>
            <label class="mb-1 block text-xs font-medium text-fg-muted">Name</label>
            <input
              v-model="editName"
              @blur="submitName"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
              class="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary outline-none transition-colors focus:border-accent-purple"
            />
          </div>

          <!-- editable description -->
          <div>
            <label class="mb-1 block text-xs font-medium text-fg-muted">Description</label>
            <input
              v-model="editDesc"
              @blur="submitDesc"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
              placeholder="No description"
              class="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary placeholder-fg-muted outline-none transition-colors focus:border-accent-purple"
            />
          </div>
        </div>

        <!-- actions -->
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            @click="emit('toggleVisibility')"
            class="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-accent-purple hover:text-accent-purple"
          >
            {{ repo.private ? "Make Public" : "Make Private" }}
          </button>
          <button
            @click="emit('toggleArchive')"
            class="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-accent-orange hover:text-accent-orange"
          >
            {{ repo.archived ? "Unarchive" : "Archive" }}
          </button>
          <a
            :href="repo.html_url"
            target="_blank"
            rel="noopener"
            class="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
          >
            Open on GitHub ↗
          </a>
          <button
            @click="emit('delete')"
            class="ml-auto rounded-lg border border-accent-red/30 px-3 py-1.5 text-xs font-medium text-accent-red transition-colors hover:bg-accent-red/10"
          >
            Delete
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 300px;
}
</style>
