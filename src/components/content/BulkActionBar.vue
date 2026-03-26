<script setup lang="ts">
defineProps<{ count: number }>();
defineEmits<{
  makePublic: [];
  makePrivate: [];
  archive: [];
  delete: [];
  clear: [];
}>();
</script>

<template>
  <div class="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
    <div class="glass flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl">
      <span class="text-sm font-medium text-fg-primary">
        {{ count }} selected
      </span>

      <div class="h-5 w-px bg-border-default" />

      <button @click="$emit('makePublic')" class="rounded-lg px-3 py-1.5 text-xs font-medium text-accent-green transition-colors hover:bg-accent-green/10">
        Public
      </button>
      <button @click="$emit('makePrivate')" class="rounded-lg px-3 py-1.5 text-xs font-medium text-accent-yellow transition-colors hover:bg-accent-yellow/10">
        Private
      </button>
      <button @click="$emit('archive')" class="rounded-lg px-3 py-1.5 text-xs font-medium text-accent-orange transition-colors hover:bg-accent-orange/10">
        Archive
      </button>
      <button @click="$emit('delete')" class="rounded-lg px-3 py-1.5 text-xs font-medium text-accent-red transition-colors hover:bg-accent-red/10">
        Delete
      </button>

      <div class="h-5 w-px bg-border-default" />

      <button @click="$emit('clear')" class="rounded-lg px-3 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg-primary">
        Clear
      </button>
    </div>
  </div>
</template>
