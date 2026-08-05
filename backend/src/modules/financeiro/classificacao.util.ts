import { EscopoRegra, TipoLancamento } from '@prisma/client';

/**
 * Motor de classificação automática por termo.
 * "Toda vez que a descrição contiver <termo>, já classifique assim."
 * Vale para receita e despesa. Preenche, mas nunca trava (o usuário pode corrigir).
 */

export type RegraLike = {
  id: string;
  termo: string;
  escopo: EscopoRegra;
  prioridade: number;
  ativo: boolean;
  categoriaId: string | null;
  unidadeId: string | null;
  marcaId: string | null;
  linhaServicoId: string | null;
  contaId: string | null;
};

export type Classificacao = {
  categoriaId?: string;
  unidadeId?: string;
  marcaId?: string;
  linhaServicoId?: string;
  contaId?: string;
};

/** minúsculas, sem acento, sem espaços nas bordas — para comparar termo × descrição. */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function escopoCompativel(escopo: EscopoRegra, tipo: TipoLancamento): boolean {
  if (escopo === 'AMBOS') return tipo === 'RECEITA' || tipo === 'DESPESA';
  return (escopo as string) === (tipo as string);
}

/**
 * Primeira regra ativa cujo termo aparece na descrição (ordem = prioridade asc),
 * respeitando o escopo. null se nenhuma casar.
 */
export function encontrarRegra(
  descricao: string | null | undefined,
  tipo: TipoLancamento,
  regras: RegraLike[],
): RegraLike | null {
  const alvo = normalizar(descricao);
  if (!alvo) return null;
  const candidatas = regras
    .filter(
      (r) =>
        r.ativo &&
        escopoCompativel(r.escopo, tipo) &&
        alvo.includes(normalizar(r.termo)),
    )
    .sort((a, b) => a.prioridade - b.prioridade);
  return candidatas[0] ?? null;
}

/** Alvos setados de uma regra (ignora os nulos — a regra só preenche o que definiu). */
export function alvosDaRegra(r: RegraLike): Classificacao {
  const c: Classificacao = {};
  if (r.categoriaId) c.categoriaId = r.categoriaId;
  if (r.unidadeId) c.unidadeId = r.unidadeId;
  if (r.marcaId) c.marcaId = r.marcaId;
  if (r.linhaServicoId) c.linhaServicoId = r.linhaServicoId;
  if (r.contaId) c.contaId = r.contaId;
  return c;
}
