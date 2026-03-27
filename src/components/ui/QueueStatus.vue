<script setup lang="ts">
import { ref, computed } from "vue";
import type { QueuedOperation } from "@/lib/types";

const props = defineProps<{ operations: QueuedOperation[] }>();
defineEmits<{ clearCompleted: [] }>();

const minimized = ref(false);

const activeCount = computed(() =>
  props.operations.filter((op) => op.status === "pending" || op.status === "processing").length,
);

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
      class="fixed bottom-6 right-6 z-30 w-80 rounded-xl border border-border-default bg-bg-secondary shadow-xl"
    >
      <div class="flex items-center justify-between px-4 py-3" :class="{ 'border-b border-border-default': !minimized }">
        <button
          @click="minimized = !minimized"
          class="flex items-center gap-2 text-sm font-semibold text-fg-primary hover:text-accent-purple transition-colors"
        >
          <svg
            class="h-3.5 w-3.5 transition-transform"
            :class="{ '-rotate-90': minimized }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          Operations
          <span v-if="activeCount > 0" class="rounded-full bg-accent-cyan/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-cyan">
            {{ activeCount }}
          </span>
        </button>
        <button
          @click="$emit('clearCompleted')"
          class="text-xs text-fg-muted transition-colors hover:text-fg-primary"
        >
          Clear done
        </button>
      </div>
      <div v-if="!minimized" class="max-h-48 space-y-2 overflow-y-auto p-4 pt-3">
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
