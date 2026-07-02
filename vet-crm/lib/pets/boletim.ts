// Helper compartilhado do Boletim de Fisioterapia (usado na ficha do pet e no form em tela cheia).

// Equipamentos na ordem do mockup. Cada um guarda um texto livre de parâmetros.
export const EQUIPAMENTOS_FISIO = [
  "Magneto", "Photo", "Ultrassom", "Fes", "Tens", "Haihua", "Hidro",
  "Acupuntura", "Eletroacupuntura", "Laser", "Ozonioterapia", "Moxa", "Cinesio", "Farmacoacupuntura",
] as const;

export interface BoletimData {
  // Paciente
  animal?: string; raca?: string; sexo?: string; idade?: string; tutor?: string;
  encaminhado?: string; diagnostico?: string; cirurgias?: string; examesData?: string;
  // Sessão
  sessaoData?: string; entrada?: string; saida?: string; sessaoNumero?: string; mvResponsavel?: string;
  // Equipamentos (chave = nome do equipamento, valor = parâmetros)
  equipamentos?: Record<string, string>;
  // Observações
  obsTutor?: string; obsMv?: string; paraCasa?: string; metas?: string;
  // Controle
  enviadoAt?: string | null; createdAt?: string;
}

const fmtBR = (v?: string) => { if (!v) return "—"; const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR"); };

// Monta o texto formatado do boletim (só os equipamentos preenchidos).
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

  const eqs = Object.entries(b.equipamentos || {}).filter(([, v]) => (v || "").trim());
  if (eqs.length) {
    L.push("");
    L.push("⚙️ Recursos utilizados:");
    for (const [nome, params] of eqs) L.push(`• ${nome}: ${params}`);
  }

  if (b.obsMv) { L.push(""); L.push(`📝 Observações do M.V.: ${b.obsMv}`); }
  if (b.paraCasa) { L.push(""); L.push(`🏠 Para casa: ${b.paraCasa}`); }
  if (b.metas) { L.push(""); L.push(`🎯 Metas p/ próxima sessão: ${b.metas}`); }
  return L.join("\n");
}
