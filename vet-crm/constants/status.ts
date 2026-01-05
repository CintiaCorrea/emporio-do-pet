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
  color1: "bg-blue-50",
  color2: "bg-yellow-50",
  color3: "bg-green-50",
  color4: "bg-red-50",
  color5: "bg-purple-50",
  color6: "bg-pink-50",
  color7: "bg-teal-50",
  color8: "bg-orange-50",
  color9: "bg-cyan-50",
  color10: "bg-indigo-50",
  color11: "bg-lime-50",
  color12: "bg-amber-50",
  color13: "bg-emerald-50",
  color14: "bg-rose-50",
  color15: "bg-violet-50",
};

// Paleta genérica de cores de texto (usada em KanbanColumn para texto do título)
export const STATUS_TEXT_COLORS: Record<string, string> = {
  color1: "text-blue-700",
  color2: "text-yellow-700",
  color3: "text-green-700",
  color4: "text-red-700",
  color5: "text-purple-700",
  color6: "text-pink-700",
  color7: "text-teal-700",
  color8: "text-orange-700",
  color9: "text-cyan-700",
  color10: "text-indigo-700",
  color11: "text-lime-700",
  color12: "text-amber-700",
  color13: "text-emerald-700",
  color14: "text-rose-700",
  color15: "text-violet-700",
};

// Lista de status terminais configuráveis
export const TERMINAL_STATUSES: string[] = ["CANCELED", "DELETED"];
