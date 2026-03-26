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
];
