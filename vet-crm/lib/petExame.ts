// ─────────────────────────────────────────────────────────────────────────────
// MOLDE ÚNICO do exame do pet (item da lista `petexa_<petId>`).
//
// Garante que TODO exame — criado na ficha do pet, no atendimento clínico ou no
// inbox — nasça com o MESMO formato completo: laboratório (fornecedor) + custo +
// preço ao cliente + fase + interno/externo + histórico (quem/quando).
//
// Antes, cada tela montava esse objeto do seu jeito: só a ficha guardava
// fornecedor/custo/valor; o atendimento gravava só o nome → os exames pedidos no
// atendimento sumiam do aviso-ao-lab e do financeiro-terceiros (que exigem
// fornecedorId). Esta é a fonte única pra não desalinhar de novo — mesmo padrão
// da trava de horário da agenda.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExameCatalogo {
  nome?: string;
  codigo?: string | null;
  fornecedorId?: string | null;
  fornecedor?: { id?: string; nome?: string; tipo?: string } | null;
  valorFornecedor?: number | null;
  valorClienteSugerido?: number | null;
  valorCliente?: number | null;
}

export interface SnapshotExame {
  fornecedorId: string | null;
  fornecedorNome: string | null;
  custo: number | null;
  valor: number | null;
}

// Extrai fornecedor + custo + preço-ao-cliente de um item do catálogo de exames.
export function snapshotExameCatalogo(cat?: ExameCatalogo | null): SnapshotExame {
  if (!cat) return { fornecedorId: null, fornecedorNome: null, custo: null, valor: null };
  return {
    fornecedorId: cat.fornecedorId ?? cat.fornecedor?.id ?? null,
    fornecedorNome: cat.fornecedor?.nome ?? null,
    custo: cat.valorFornecedor ?? null,
    valor: cat.valorClienteSugerido ?? cat.valorCliente ?? null,
  };
}

// Acha o item do catálogo pelo nome (case-insensitive, sem espaços nas pontas).
export function acharExameNoCatalogo<T extends ExameCatalogo>(
  catalogo: T[] | undefined | null,
  nome: string,
): T | undefined {
  const alvo = (nome || "").trim().toLowerCase();
  if (!alvo) return undefined;
  return (catalogo || []).find((c) => (c?.nome || "").trim().toLowerCase() === alvo);
}

// Fase inicial padrão. Externo pode ter fase própria ("... externo") se existir na
// configuração; senão cai na 1ª fase. Interno = 1ª fase.
export function faseInicialExame(fases: string[] | undefined, externo = false): string {
  const f = fases || [];
  if (externo) {
    const ext = f.find((x) => /externo/i.test(x));
    if (ext) return ext;
    return f[0] || "Solicitado (externo)";
  }
  return f[0] || "Solicitado";
}

// Monta o objeto CANÔNICO do petexa_. Use SEMPRE isto pra criar um exame.
export function montarPetExame(opts: {
  nome: string;
  catalogo?: ExameCatalogo | null;
  fases?: string[];
  externo?: boolean;
  acompanha?: boolean;
  por?: string;      // quem criou (1ª entrada do histórico)
  status?: string;   // força uma fase específica (senão calcula pela config)
}): Record<string, any> {
  const externo = !!opts.externo;
  const snap = snapshotExameCatalogo(opts.catalogo);
  const status = opts.status || faseInicialExame(opts.fases, externo);
  const agora = new Date().toISOString();
  return {
    nome: (opts.nome || "").trim(),
    status,
    date: agora,
    externo,
    acompanha: opts.acompanha ?? !externo,
    ...snap,
    historico: opts.por ? { [status]: { at: agora, por: opts.por } } : {},
  };
}

// Registra a mudança de fase no histórico sem sobrescrever o que já existe.
// (a ficha já fazia isso; o inbox NÃO — esta é a fonte única.)
export function registrarHistoricoFase(
  historico: Record<string, any> | undefined,
  fase: string,
  por?: string,
): Record<string, any> {
  const h = { ...(historico || {}) };
  if (!h[fase]) h[fase] = { at: new Date().toISOString(), por: por || "" };
  return h;
}
