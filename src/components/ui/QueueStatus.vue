<script setup lang="ts">
import type { QueuedOperation } from "@/lib/types";

defineProps<{ operations: QueuedOperation[] }>();
defineEmits<{ clearCompleted: [] }>();

function statusColor(status: QueuedOperation["status"]) {
  switch (status) {
    case "pending": return "bg-fg-muted/20 text-fg-muted";
    case "processing": return "bg-accent-cyan/20 text-accent-cyan";
    case "done": return "bg-accent-green/20 text-accent-green";
    case "failed": return "bg-accent-red/20 text-accent-red";
  }
}
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="operations.length > 0"
      class="fixed bottom-6 right-6 z-30 w-80 rounded-xl border border-border-default bg-bg-secondary p-4 shadow-xl"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-fg-primary">Operations</h3>
        <button
          @click="$emit('clearCompleted')"
          class="text-xs text-fg-muted transition-colors hover:text-fg-primary"
        >
          Clear done
        </button>
      </div>
      <div class="max-h-48 space-y-2 overflow-y-auto">
        <div
          v-for="op in operations"
          :key="op.id"
          class="flex items-center gap-2 rounded-lg bg-bg-primary px-3 py-2"
        >
          <span class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" :class="statusColor(op.status)">
            {{ op.status }}
          </span>
          <span class="min-w-0 truncate text-xs text-fg-secondary">{{ op.label }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(1rem);
  opacity: 0;
}
</style>
