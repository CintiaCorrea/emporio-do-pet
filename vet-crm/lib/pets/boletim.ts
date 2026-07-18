// Helper compartilhado do Boletim de Fisioterapia (usado na ficha do pet e no form em tela cheia).

// Cada equipamento tem seus PRÓPRIOS parâmetros. Pro e Reg são campos largos (até 25 caracteres);
// os demais (Fr, Int, T, Loc, Vel) são curtos. "free" = uma linha livre. "cinesio" = multi-seleção + T.
export type ParamDef = { k: string; label: string; wide?: boolean };
export type EquipDef = { key: string; params: ParamDef[]; cinesio?: boolean; free?: boolean };

const Fr: ParamDef = { k: "Fr", label: "Fr" };
const Int: ParamDef = { k: "Int", label: "Int" };
const T: ParamDef = { k: "T", label: "T" };
const Loc: ParamDef = { k: "Loc", label: "Loc" };
const Vel: ParamDef = { k: "Vel", label: "Vel" };
const Pro: ParamDef = { k: "Pro", label: "Pro", wide: true };
const Reg: ParamDef = { k: "Reg", label: "Reg", wide: true };

export const EQUIP_DEFS: EquipDef[] = [
  { key: "Magneto", params: [Fr, Int, T] },
  { key: "Fototerapia", params: [Fr, Int, T] },
  { key: "Fes", params: [Pro, Int, T] },
  { key: "Tens", params: [Pro, Int, T] },
  { key: "Haihua", params: [Pro, Int, Loc, T] },
  { key: "Hidroesteira", params: [Vel, T] },
  { key: "Eletroacupuntura", params: [Reg, T] },
  { key: "Laser terapia", params: [Int, Reg, T] },
  { key: "Moxa", params: [Reg, T] },
  { key: "Ozonioterapia", params: [], free: true },
  { key: "Ultrassom", params: [], free: true },
  { key: "Farmacoacupuntura", params: [], free: true },
  // Acupuntura e Cinesioterapia ficam lado a lado no fim (bloco maior, com espaço de escrita).
  { key: "Acupuntura", params: [], free: true },
  { key: "Cinesioterapia", params: [T], cinesio: true },
];

export const CINESIO_EXERCICIOS = [
  "Cone + obstáculos", "Prancha de equilíbrio", "Disco proprioceptivo", "Circuito em oito",
  "Isometria", "Equilíbrio", "Descarga de peso", "Estimulação de subida", "Agachamento",
] as const;

// Valor de um equipamento no boletim. `on` = foi usado. Params ficam por chave (Fr/Int/T…).
// `livre` = linha livre; `exercicios` = seleção da cinesioterapia.
export interface EquipVal { on?: boolean; livre?: string; exercicios?: string[]; [param: string]: any }

// Compat: lista antiga de nomes (ainda importada por telas legadas).
export const EQUIPAMENTOS_FISIO = EQUIP_DEFS.map((e) => e.key);

export interface BoletimData {
  // Paciente
  animal?: string; raca?: string; sexo?: string; idade?: string; tutor?: string;
  encaminhado?: string; diagnostico?: string; cirurgias?: string; examesData?: string;
  // Sessão
  sessaoData?: string; entrada?: string; saida?: string; sessaoNumero?: string; mvResponsavel?: string;
  // Equipamentos (chave = nome do equipamento; valor = EquipVal, ou string nos boletins antigos)
  equipamentos?: Record<string, EquipVal | string>;
  // Observações
  obsTutor?: string; obsMv?: string; paraCasa?: string; metas?: string;
  // Controle
  enviadoAt?: string | null; createdAt?: string;
}

// Datas "YYYY-MM-DD" (do <input date>) precisam ser lidas no fuso LOCAL — senão o
// new Date() interpreta como UTC e mostra o dia anterior (ex.: 18/07 vira 17/07).
const fmtBR = (v?: string) => { if (!v) return "—"; const s = String(v); const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00" : s); return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR"); };

// Uma linha de texto pra um equipamento usado (ou null se não usar/sem nada).
function linhaEquip(def: EquipDef, val: EquipVal | string): string | null {
  if (typeof val === "string") { return val.trim() ? `• ${def.key}: ${val.trim()}` : null; } // boletim antigo
  if (!val || !val.on) return null;
  if (def.cinesio) {
    const ex = (val.exercicios || []).join(", ");
    const t = val.T ? ` (${val.T} min)` : "";
    return `• ${def.key}: ${ex || "—"}${t}`;
  }
  if (def.free) return `• ${def.key}: ${(val.livre || "").trim() || "—"}`;
  const parts = def.params.map((p) => (val[p.k] ? `${p.label} ${String(val[p.k]).trim()}` : null)).filter(Boolean).join(" · ");
  return `• ${def.key}${parts ? `: ${parts}` : ""}`;
}

// Monta o texto formatado do boletim (só os equipamentos usados).
export function montarTextoBoletim(b: BoletimData): string {
  const L: string[] = [];
  L.push("🌿 BOLETIM DE FISIOTERAPIA — Empório do Pet");
  L.push("");
  L.push(`🐾 Animal: ${b.animal || "—"}${b.raca ? ` (${b.raca})` : ""}`);
  if (b.tutor) L.push(`🧑 Tutor(a): ${b.tutor}`);
  const sessaoLinha = [b.sessaoNumero ? `Sessão ${b.sessaoNumero}` : null, b.sessaoData ? fmtBR(b.sessaoData) : null].filter(Boolean).join(" · ");
  if (sessaoLinha) L.push(`📅 ${sessaoLinha}`);
  const horas = [b.entrada ? `entrada ${b.entrada}` : null, b.saida ? `saída ${b.saida}` : null].filter(Boolean).join(" · ");
  if (horas) L.push(`🕓 ${horas}`);
  if (b.mvResponsavel) L.push(`🧑‍⚕️ M.V.: ${b.mvResponsavel}`);
  if (b.diagnostico) L.push(`🩺 Diagnóstico: ${b.diagnostico}`);

  const linhas = EQUIP_DEFS.map((def) => linhaEquip(def, (b.equipamentos || {})[def.key])).filter(Boolean) as string[];
  if (linhas.length) { L.push(""); L.push("⚙️ Recursos utilizados:"); L.push(...linhas); }

  if (b.obsMv) { L.push(""); L.push(`📝 Observações do M.V.: ${b.obsMv}`); }
  if (b.paraCasa) { L.push(""); L.push(`🏠 Para casa: ${b.paraCasa}`); }
  if (b.metas) { L.push(""); L.push(`🎯 Metas p/ próxima sessão: ${b.metas}`); }
  return L.join("\n");
}
