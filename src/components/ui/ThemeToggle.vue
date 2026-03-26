<script setup lang="ts">
import { ref, onMounted } from "vue";

const themes = [
  { id: "dark", label: "Dracula" },
  { id: "light", label: "Alucard" },
  { id: "nord", label: "Nord" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "one-dark", label: "One Dark" },
  { id: "solarized", label: "Solarized" },
] as const;

const current = ref("dark");
const open = ref(false);

onMounted(() => {
  current.value = document.documentElement.getAttribute("data-theme") || "dark";
});

function setTheme(id: string) {
  current.value = id;
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem("theme", id);
  open.value = false;
}

const currentLabel = () => themes.find((t) => t.id === current.value)?.label ?? "Theme";
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-3 py-1.5 text-sm text-fg-secondary transition-colors hover:border-accent-purple hover:text-fg-primary"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {{ currentLabel() }}
      <svg class="h-3 w-3 transition-transform" :class="{ 'rotate-180': open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 max-h-80 w-44 overflow-y-auto rounded-lg border border-border-default bg-bg-secondary p-1 shadow-lg"
      >
        <button
          v-for="theme in themes"
          :key="theme.id"
          @click="setTheme(theme.id)"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
          :class="current === theme.id ? 'bg-accent-purple/20 text-accent-purple' : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary'"
        >
          <span class="h-3 w-3 rounded-full border border-border-default" :class="`theme-dot-${theme.id}`" />
          {{ theme.label }}
          <svg v-if="current === theme.id" class="ml-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5" /></svg>
        </button>
      </div>
    </Transition>

    <!-- click-outside to close -->
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
