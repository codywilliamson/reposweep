export interface Theme {
  id: string;
  label: string;
  type: "dark" | "light";
}

export const themes: Theme[] = [
  { id: "dark", label: "Dracula", type: "dark" },
  { id: "light", label: "Alucard", type: "light" },
  { id: "nord", label: "Nord", type: "dark" },
  { id: "tokyo-night", label: "Tokyo Night", type: "dark" },
  { id: "catppuccin", label: "Catppuccin", type: "dark" },
  { id: "gruvbox", label: "Gruvbox", type: "dark" },
  { id: "one-dark", label: "One Dark", type: "dark" },
  { id: "solarized", label: "Solarized", type: "dark" },
];
