// Lógica pura da Agenda (grade do dia) — extraída da tela pra ficar TESTÁVEL.
// A página importa daqui, então os testes travam exatamente o que roda em produção.

// ---- Cor por serviço (fundo pastel do card) ----
export const CORES_SERVICO = ["#0E7C86", "#C2410C", "#7C3AED", "#0C447C", "#B03060", "#0F7A5E", "#9A6B14", "#4D6A8A", "#8A5A2B", "#3E7CB1", "#8E44AD", "#146152"];
export function corServico(t?: string): string {
  const s = String(t || "").toLowerCase().trim() || "atendimento";
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CORES_SERVICO[h % CORES_SERVICO.length];
}

// ---- Cor FIXA da confirmação por WhatsApp (borda do card) ----
// Campo separado do estágio: verde = confirmou presença, vermelho = quer remarcar.
export function corConfirmacao(status?: string): string | null {
  if (status === "CONFIRMADO") return "#0F6E56";
  if (status === "REMARCAR") return "#A32D2D";
  return null;
}

// ---- Estágios do atendimento (um controle só no card) ----
export const ESTAGIOS = [
  { label: "Agendado", cor: "#6b6857", bg: "#EDEBE3", next: "Em espera", acao: "chegou ›" },
  { label: "🚪 Chegou", cor: "#185FA5", bg: "#E3EEFA", next: "Em atendimento", acao: "atender ›" },
  { label: "🩺 Em atendimento", cor: "#B45309", bg: "#FDECD6", next: "Atendido", acao: "concluir ›" },
  { label: "✅ Concluído", cor: "#0F6E56", bg: "#DEF3E8", next: null as string | null, acao: null as string | null },
];
// Status anterior de cada estágio (para retroceder). Índice casa com estagioIdx.
export const PREV_STATUS = [null, "Agendado", "Em espera", "Em atendimento"];
export function estagioIdx(status?: string): number {
  const s = status || "";
  if (["Atendido", "Animal pronto", "Realizado", "Concluído", "CONCLUIDO"].includes(s)) return 3;
  if (s === "Em atendimento") return 2;
  if (["Em espera", "Aguardando"].includes(s)) return 1;
  return 0; // Agendado, Confirmado, Atrasado, etc.
}

// ---- Artefatos (não são agendamentos "de verdade": documento, receita, peso, venda...) ----
export function ehArtefato(t?: string): boolean {
  return /^(documento|receitas?|peso|venda|observa)/i.test(String(t || "").trim());
}

// ---- Sobreposição: colisões no tempo ficam LADO A LADO (cada uma numa "faixa") ----
export function layoutSobreposicao(items: any[]): { a: any; track: number; cols: number }[] {
  const arr = items.map((a: any) => { const d = new Date(a.date); const s = d.getHours() * 60 + d.getMinutes(); return { a, s, e: s + (Number(a.duration) || 30) }; })
    .sort((x, y) => x.s - y.s || x.e - y.e);
  const tracks: number[] = []; // fim do último agendamento de cada faixa
  const placed = arr.map((it) => { let t = tracks.findIndex((end) => end <= it.s); if (t === -1) { t = tracks.length; tracks.push(it.e); } else { tracks[t] = it.e; } return { ...it, track: t }; });
  return placed.map((it) => { const over = placed.filter((o) => o.s < it.e && o.e > it.s); const cols = Math.max(1, ...over.map((o) => o.track + 1)); return { a: it.a, track: it.track, cols }; });
}

// ---- Encaixe no box: posiciona/dimensiona o card na linha da grade mais próxima ----
// (a hora exata continua no texto). Resolve os "horários quebrados" (ex.: 09:33) que vazavam do box.
export function posicaoCard(date: string | Date, duration: number | undefined, hIni: number, slotSize: number, pxMin: number): { top: number; height: number } {
  const d = date instanceof Date ? date : new Date(date);
  const dur = Number(duration) || 30;
  const startMin = Math.round((d.getHours() * 60 + d.getMinutes() - hIni * 60) / slotSize) * slotSize;
  const durBox = Math.max(slotSize, Math.round(dur / slotSize) * slotSize);
  return { top: startMin * pxMin, height: Math.max(durBox * pxMin - 3, 34) };
}

// ---- Filtro do dia: sem cancelado/remarcado/artefato + dedup por id + ordenado por hora ----
// Mesma regra do "Dia", usada também na Semana/Mês pra não trazer "lixo".
export function agendaDoDia(appts: any[], ds: string): any[] {
  const ymd = (d: Date) => { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const vistos = new Set<string>();
  return (appts || [])
    .filter((a: any) => a.date && ymd(new Date(a.date)) === ds && a.status !== "Cancelado" && a.status !== "Remarcado" && !ehArtefato(a.type))
    .filter((a: any) => { if (vistos.has(a.id)) return false; vistos.add(a.id); return true; })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
