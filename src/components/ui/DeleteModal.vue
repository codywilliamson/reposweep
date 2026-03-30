<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{ repos: string[] }>();
defineEmits<{ confirm: []; cancel: [] }>();

const input = ref("");

const confirmText = computed(() =>
  props.repos.length === 1 ? props.repos[0] : `delete ${props.repos.length} repos`,
);

const isValid = computed(() => input.value === confirmText.value);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('cancel')">
      <div class="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="modal-card glass relative w-full max-w-md rounded-2xl p-6 shadow-xl">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/20">
          <svg class="h-6 w-6 text-accent-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
          </svg>
        </div>

        <h2 class="text-lg font-semibold text-fg-primary">Delete {{ repos.length === 1 ? "Repository" : "Repositories" }}</h2>
        <p class="mt-2 text-sm text-fg-muted">
          This action <strong class="text-accent-red">cannot be undone</strong>.
          {{ repos.length === 1 ? `This will permanently delete "${repos[0]}".` : `This will permanently delete ${repos.length} repositories.` }}
        </p>

        <ul v-if="repos.length <= 5" class="mt-3 space-y-1">
          <li v-for="name in repos" :key="name" class="flex items-center gap-2 text-sm text-fg-secondary">
            <span class="h-1.5 w-1.5 rounded-full bg-accent-red" />
            {{ name }}
          </li>
        </ul>

        <div class="mt-4">
          <label class="mb-1.5 block text-sm text-fg-muted">
            Type <code class="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono text-xs text-accent-red">{{ confirmText }}</code> to confirm
          </label>
          <input
            v-model="input"
            type="text"
            class="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary outline-none transition-colors focus:border-accent-red"
            :placeholder="confirmText"
          />
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="$emit('cancel')"
            class="rounded-lg border border-border-default px-4 py-2 text-sm text-fg-secondary transition-colors hover:bg-bg-tertiary"
          >
            Cancel
          </button>
          <button
            @click="$emit('confirm')"
            :disabled="!isValid"
            class="rounded-lg bg-accent-red px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            Delete {{ repos.length === 1 ? "repository" : `${repos.length} repositories` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  animation: modal-fade 0.15s ease both;
}
.modal-card {
  animation: modal-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes modal-fade {
  from { opacity: 0; }
}
@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.96) translateY(0.5rem); }
}
@media (prefers-reduced-motion: reduce) {
  .modal-backdrop, .modal-card { animation: none; }
}
</style>
