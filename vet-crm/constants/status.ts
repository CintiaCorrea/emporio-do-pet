// Paleta genérica de cores para bordas (usada em KanbanCard para border-l-4)
export const STATUS_COLORS: Record<string, string> = {
  color1: "border-l-blue-500",
  color2: "border-l-yellow-500",
  color3: "border-l-green-500",
  color4: "border-l-red-500",
  color5: "border-l-purple-500",
  color6: "border-l-pink-500",
  color7: "border-l-teal-500",
  color8: "border-l-orange-500",
  color9: "border-l-cyan-500",
  color10: "border-l-indigo-500",
  color11: "border-l-lime-500",
  color12: "border-l-amber-500",
  color13: "border-l-emerald-500",
  color14: "border-l-rose-500",
  color15: "border-l-violet-500",
};

// Paleta genérica de cores de fundo (usada em KanbanColumn para bg da coluna)
export const STATUS_BG_COLORS: Record<string, string> = {
  // Light: subtle pastel. Dark: subtle tinted surface.
  color1: "bg-blue-50 dark:bg-blue-950/40",
  color2: "bg-yellow-50 dark:bg-yellow-950/35",
  color3: "bg-green-50 dark:bg-green-950/40",
  color4: "bg-red-50 dark:bg-red-950/35",
  color5: "bg-purple-50 dark:bg-purple-950/40",
  color6: "bg-pink-50 dark:bg-pink-950/35",
  color7: "bg-teal-50 dark:bg-teal-950/40",
  color8: "bg-orange-50 dark:bg-orange-950/35",
  color9: "bg-cyan-50 dark:bg-cyan-950/40",
  color10: "bg-indigo-50 dark:bg-indigo-950/40",
  color11: "bg-lime-50 dark:bg-lime-950/40",
  color12: "bg-amber-50 dark:bg-amber-950/35",
  color13: "bg-emerald-50 dark:bg-emerald-950/40",
  color14: "bg-rose-50 dark:bg-rose-950/35",
  color15: "bg-violet-50 dark:bg-violet-950/40",
};

// Paleta genérica de cores de texto (usada em KanbanColumn para texto do título)
export const STATUS_TEXT_COLORS: Record<string, string> = {
  // Light: 700 for contrast on pastel. Dark: lighter tint for contrast on dark surface.
  color1: "text-blue-700 dark:text-blue-200",
  color2: "text-yellow-700 dark:text-yellow-200",
  color3: "text-green-700 dark:text-green-200",
  color4: "text-red-700 dark:text-red-200",
  color5: "text-purple-700 dark:text-purple-200",
  color6: "text-pink-700 dark:text-pink-200",
  color7: "text-teal-700 dark:text-teal-200",
  color8: "text-orange-700 dark:text-orange-200",
  color9: "text-cyan-700 dark:text-cyan-200",
  color10: "text-indigo-700 dark:text-indigo-200",
  color11: "text-lime-700 dark:text-lime-200",
  color12: "text-amber-700 dark:text-amber-200",
  color13: "text-emerald-700 dark:text-emerald-200",
  color14: "text-rose-700 dark:text-rose-200",
  color15: "text-violet-700 dark:text-violet-200",
};

// Lista de status terminais configuráveis
export const TERMINAL_STATUSES: string[] = ["CANCELED", "DELETED"];
