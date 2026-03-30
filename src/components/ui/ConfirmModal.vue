<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  repos: string[];
}>();

defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('cancel')">
      <div class="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="modal-card glass relative w-full max-w-md rounded-2xl p-6 shadow-xl">
        <h2 class="text-lg font-semibold text-fg-primary">{{ title }}</h2>
        <p class="mt-2 text-sm text-fg-muted">{{ description }}</p>

        <ul v-if="repos.length <= 10" class="mt-3 max-h-40 space-y-1 overflow-y-auto">
          <li v-for="name in repos" :key="name" class="flex items-center gap-2 text-sm text-fg-secondary">
            <span class="h-1.5 w-1.5 rounded-full bg-accent-purple" />
            {{ name }}
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-fg-muted">{{ repos.length }} repositories will be affected.</p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="$emit('cancel')"
            class="rounded-lg border border-border-default px-4 py-2 text-sm text-fg-secondary transition-colors hover:bg-bg-tertiary"
          >
            Cancel
          </button>
          <button
            @click="$emit('confirm')"
            class="rounded-lg bg-accent-purple px-4 py-2 text-sm font-medium text-bg-primary transition-opacity hover:opacity-90"
          >
            Confirm
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
