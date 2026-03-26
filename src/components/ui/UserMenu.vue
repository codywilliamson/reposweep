<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  login: string;
  avatarUrl: string;
  name: string;
}>();

const open = ref(false);
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="flex items-center gap-2 rounded-full border border-border-default p-0.5 transition-colors hover:border-accent-purple"
    >
      <img :src="avatarUrl" :alt="login" class="h-8 w-8 rounded-full" />
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border-default bg-bg-secondary p-1 shadow-lg"
      >
        <div class="border-b border-border-muted px-3 py-2">
          <p class="text-sm font-medium text-fg-primary">{{ name }}</p>
          <p class="text-xs text-fg-muted">@{{ login }}</p>
        </div>
        <a
          href="/dashboard"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-fg-secondary transition-colors hover:bg-bg-tertiary hover:text-fg-primary"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          Dashboard
        </a>
        <a
          :href="`https://github.com/${login}`"
          target="_blank"
          rel="noopener"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-fg-secondary transition-colors hover:bg-bg-tertiary hover:text-fg-primary"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          GitHub Profile
        </a>
        <div class="border-t border-border-muted mt-1 pt-1">
          <a
            href="/api/auth/logout"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-accent-red transition-colors hover:bg-accent-red/10"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign out
          </a>
        </div>
      </div>
    </Transition>

    <div v-if="open" class="fixed inset-0 z-[-1]" @click="open = false" />
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
