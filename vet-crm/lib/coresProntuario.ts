// 🎨 Cor FIXA por tipo de registro clínico — FONTE ÚNICA.
// A MESMA cor no botão que CRIA (HistoricoAddGrid) e no card da TIMELINE (FeedTimeline).
// Lição do SimplesVet: "o olho aprende a cor e para de ler o rótulo". Antes as cores viviam em 3
// lugares e divergiam por fonte (appointment vs histórico importado) — aqui é uma só.

export const COR_TIPO: Record<string, string> = {
  ATENDIMENTO: "#2f80c4",
  PESO: "#b8860b",
  PATOLOGIA: "#7c3aed",
  DOCUMENTO: "#2e9e5b",
  EXAME: "#e0556b",
  FOTOS: "#2b6cb0",
  VACINA: "#e08a1e",
  RECEITA: "#9333ea",
  OBSERVACAO: "#64748b",
  INTERNACAO: "#9b2c3a",
  VIDEO: "#0f7a52",
};

// Apelidos: tipos de appointment / clinical-document / histórico → categoria canônica acima.
const ALIAS: Record<string, string> = {
  CONSULTA: "ATENDIMENTO", RETORNO: "ATENDIMENTO", AVALIACAO: "ATENDIMENTO", "AVALIAÇÃO": "ATENDIMENTO",
  EMERGENCIA: "ATENDIMENTO", "EMERGÊNCIA": "ATENDIMENTO", PROCEDIMENTO: "ATENDIMENTO",
  SESSAO_FISIO: "ATENDIMENTO", "SESSÃO DE FISIO": "ATENDIMENTO", CIRURGIA: "ATENDIMENTO", OUTRO: "ATENDIMENTO",
  RECEITAS: "RECEITA", PRESCRIPTION: "RECEITA",
  GENERAL: "DOCUMENTO", MEDICAL_CERTIFICATE: "DOCUMENTO",
  VACINACAO: "VACINA", "VACINAÇÃO": "VACINA", VACCINATION_CARD: "VACINA",
  EXAM_REQUEST: "EXAME",
  "OBSERVAÇÃO": "OBSERVACAO",
  "INTERNAÇÃO": "INTERNACAO",
};

// Resolve QUALQUER rótulo de tipo (maiúsc./minúsc., appointment/doc/histórico) para a cor canônica.
export function corDoTipo(k?: string): string {
  const key = String(k || "").trim().toUpperCase();
  const cat = ALIAS[key] || key;
  return COR_TIPO[cat] || "#64748b";
}
