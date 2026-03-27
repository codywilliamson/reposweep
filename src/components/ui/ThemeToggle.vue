<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const themes = [
  { id: "dark", label: "Dracula", preview: { page: "#282a36", surface: "#44475a", accent: "#bd93f9", text: "#f8f8f2" } },
  { id: "light", label: "Alucard", preview: { page: "#f5f3ef", surface: "#e0ddd6", accent: "#7c3aed", text: "#2d2b3d" } },
  { id: "nord", label: "Nord", preview: { page: "#2e3440", surface: "#3b4252", accent: "#88c0d0", text: "#eceff4" } },
  { id: "tokyo-night", label: "Tokyo Night", preview: { page: "#1a1b26", surface: "#24283b", accent: "#7dcfff", text: "#c0caf5" } },
  { id: "catppuccin", label: "Catppuccin", preview: { page: "#1e1e2e", surface: "#313244", accent: "#cba6f7", text: "#cdd6f4" } },
  { id: "gruvbox", label: "Gruvbox", preview: { page: "#282828", surface: "#3c3836", accent: "#b8bb26", text: "#ebdbb2" } },
  { id: "one-dark", label: "One Dark", preview: { page: "#282c34", surface: "#353b45", accent: "#56b6c2", text: "#abb2bf" } },
  { id: "solarized", label: "Solarized", preview: { page: "#002b36", surface: "#073642", accent: "#2aa198", text: "#93a1a1" } },
] as const;

const current = ref("dark");
const open = ref(false);

const currentTheme = computed(() => themes.find((t) => t.id === current.value) ?? themes[0]);

onMounted(() => {
  current.value = document.documentElement.getAttribute("data-theme") || "dark";
});

function setTheme(id: string) {
  current.value = id;
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem("theme", id);
  open.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-3 py-1.5 text-sm text-fg-secondary transition-colors hover:border-accent-purple hover:text-fg-primary"
    >
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <rect x="0.5" y="0.5" width="23" height="15" rx="2.5" :fill="currentTheme.preview.page" stroke="rgba(148, 163, 184, 0.35)" />
        <rect x="3" y="3" width="8" height="1.5" rx="0.75" :fill="currentTheme.preview.text" fill-opacity="0.85" />
        <rect x="3" y="6" width="18" height="3" rx="1" :fill="currentTheme.preview.surface" />
        <rect x="3" y="11" width="6" height="2" rx="1" :fill="currentTheme.preview.accent" />
      </svg>
      {{ currentTheme.label }}
      <svg class="h-3 w-3 transition-transform" :class="{ 'rotate-180': open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 max-h-80 w-52 overflow-y-auto rounded-lg border border-border-default bg-bg-secondary p-1 shadow-lg"
      >
        <button
          v-for="theme in themes"
          :key="theme.id"
          @click="setTheme(theme.id)"
          class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
          :class="current === theme.id ? 'bg-accent-purple/20 text-accent-purple' : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary'"
        >
          <span class="flex items-center gap-2">
            <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
              <rect x="0.5" y="0.5" width="23" height="15" rx="2.5" :fill="theme.preview.page" stroke="rgba(148, 163, 184, 0.35)" />
              <rect x="3" y="3" width="8" height="1.5" rx="0.75" :fill="theme.preview.text" fill-opacity="0.85" />
              <rect x="3" y="6" width="18" height="3" rx="1" :fill="theme.preview.surface" />
              <rect x="3" y="11" width="6" height="2" rx="1" :fill="theme.preview.accent" />
            </svg>
            {{ theme.label }}
          </span>
          <svg v-if="current === theme.id" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5" /></svg>
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
