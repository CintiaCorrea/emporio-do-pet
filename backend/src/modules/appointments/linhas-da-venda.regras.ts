// GRAVAR AS LINHAS DE UMA VENDA SEM ESTRAGAR O QUE JÁ ESTAVA LÁ.
//
// Até 16/09/2026, editar uma venda APAGAVA todas as linhas e recriava com o que a tela mandou.
// A tela do ponto de venda não manda a ligação com o cadastro (catalogoItemId), o fornecedor do
// exame, o convênio nem a comissão — e tudo isso sumia a cada edição. Medido em produção naquele
// dia: 291 linhas de venda de setembro sem ligação ao cadastro (a edição é uma das portas por
// onde a ligação se perde; texto solto na internação e na conversão de orçamento são outras).
// Sem a ligação, o exame não abre card, o estoque não baixa e o faturamento fica "sem vínculo".
//
// A regra agora: a linha que CONTINUA na venda é a mesma linha (mesmo id). Ela recebe o que a
// tela mudou e HERDA o que a tela não mandou. Só é criada a linha nova, e só é apagada a que saiu.
// Ter o mesmo id é também o que impede o card de exame de reabrir (ver exames.service,
// garantirCardsDaVenda): card só nasce para linha lançada agora.
import { lerFaixas, precoPorPorte } from '../../common/porte';

export type LinhaExistente = {
  id: string;
  descricao?: string | null;
  catalogoItemId?: string | null;
  productId?: string | null;
  servicoId?: string | null;
  quantidade?: number | null;
  valorUnitario?: number | null;
  desconto?: number | null;
  [campo: string]: any;
};

export type LinhaRecebida = {
  id?: string | null;
  descricao?: string | null;
  catalogoItemId?: string | null;
  quantidade?: number | null;
  valorUnitario?: number | null;
  desconto?: number | null;
  [campo: string]: any;
};

/** Campos que a tela costuma não mandar e que não podem se perder ao editar. */
export const CAMPOS_HERDADOS = [
  'catalogoItemId',
  'productId',
  'servicoId',
  'fornecedorId',
  'convenioId',
  'executorUserId',
  'custoUnitario',
  'comissaoBase',
  'comissaoTipo',
  'comissaoValor',
  'observacoes',
] as const;

const vazio = (v: unknown) => v === undefined || v === null || v === '';
const nome = (t: unknown) =>
  String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const num = (v: unknown, padrao: number) => (Number.isFinite(Number(v)) && !vazio(v) ? Number(v) : padrao);

/** A linha recebida é "a mesma coisa" que a existente? Mesmo item do cadastro, ou mesmo nome. */
function mesmoItem(ex: LinhaExistente, rec: LinhaRecebida): boolean {
  if (!vazio(rec.catalogoItemId) && !vazio(ex.catalogoItemId)) return rec.catalogoItemId === ex.catalogoItemId;
  return nome(ex.descricao) !== '' && nome(ex.descricao) === nome(rec.descricao);
}

function mesmosValores(ex: LinhaExistente, rec: LinhaRecebida): boolean {
  return num(ex.quantidade, 1) === num(rec.quantidade, 1) && Math.abs(num(ex.valorUnitario, 0) - num(rec.valorUnitario, 0)) < 0.005;
}

export type Casamento = {
  /** Linhas que continuam: mesmo id, dados novos já mesclados. */
  manter: { id: string; existente: LinhaExistente; recebida: LinhaRecebida }[];
  criar: LinhaRecebida[];
  apagar: string[];
};

/**
 * Casa o que a tela mandou com o que já está gravado.
 *
 * Ordem: (1) pelo id, quando a tela manda; (2) mesmo item com a mesma quantidade e preço;
 * (3) mesmo item. Cada linha gravada casa uma vez só — dois exames iguais na mesma venda
 * continuam sendo duas linhas.
 */
export function casarLinhas(existentes: LinhaExistente[], recebidas: LinhaRecebida[]): Casamento {
  const livres = [...(existentes || [])];
  const pegar = (i: number) => livres.splice(i, 1)[0];
  const pares: (LinhaExistente | null)[] = (recebidas || []).map(() => null);

  (recebidas || []).forEach((rec, k) => {
    if (vazio(rec?.id)) return;
    const i = livres.findIndex((ex) => ex.id === rec.id);
    if (i >= 0) pares[k] = pegar(i);
  });
  for (const exigirValores of [true, false]) {
    (recebidas || []).forEach((rec, k) => {
      if (pares[k]) return;
      const i = livres.findIndex((ex) => mesmoItem(ex, rec) && (!exigirValores || mesmosValores(ex, rec)));
      if (i >= 0) pares[k] = pegar(i);
    });
  }

  const r: Casamento = { manter: [], criar: [], apagar: livres.map((ex) => ex.id) };
  (recebidas || []).forEach((rec, k) => {
    const ex = pares[k];
    if (ex) r.manter.push({ id: ex.id, existente: ex, recebida: mesclarLinha(ex, rec) });
    else r.criar.push(rec);
  });
  return r;
}

/** O que a tela mandou por cima do que já estava — sem apagar o que ela não mandou. */
export function mesclarLinha(ex: LinhaExistente, rec: LinhaRecebida): LinhaRecebida {
  const out: LinhaRecebida = { ...rec };
  for (const campo of CAMPOS_HERDADOS) {
    if (vazio(out[campo]) && !vazio(ex[campo])) out[campo] = ex[campo];
  }
  // A comissão calculada só vale enquanto a conta que a gerou não mudou.
  const mesmaConta = mesmosValores(ex, rec) && Math.abs(num(ex.desconto, 0) - num(rec.desconto, 0)) < 0.005;
  if (vazio(out.comissaoCalculada) && mesmaConta && !vazio(ex.comissaoCalculada)) out.comissaoCalculada = ex.comissaoCalculada;
  return out;
}

/**
 * PORTEIRO (modo aviso). Linha de venda sem ligação ao cadastro — a regra da casa é que todo item
 * de venda vem do cadastro de produtos e serviços (Cintia, 16/09/2026: "nada é para entrar como
 * texto solto em vendas"). Por enquanto só se anota; recusar vem quando as telas estiverem
 * consertadas e o cadastro revisado, para ninguém travar no meio do plantão.
 */
export function linhasSemCadastro<T extends { catalogoItemId?: string | null; descricao?: string | null }>(linhas: T[]): T[] {
  return (linhas || []).filter((l) => vazio(l?.catalogoItemId));
}

// ─── PREÇO PELO CADASTRO E PELO PESO (A2 bloco 2, modo aviso) ────────────────────────────────
//
// Cintia, 16/09/2026: "sem preço à mão, peso tem que estar registrado" e "trazer automaticamente,
// conforme o peso lançado no sistema, a faixa EXATA do produto/serviço". Até aqui só a TELA fazia
// a conta (lib/catalogoVendavel → porte), e o servidor aceitava qualquer preço. Medido em
// setembro: nas linhas com faixa, só a diária da internação saiu do preço do cadastro (R$ 150
// fixos contra R$ 175 da faixa acima de 10 kg — mantidos por decisão dela para Kate e Chico).
//
// Por enquanto o servidor CONFERE e ANOTA; a recusa vem depois da revisão do cadastro.


export type ItemDoCadastro = {
  id: string;
  nome?: string | null;
  preco?: number | null;
  precosPorte?: string | null;
  ehCaucao?: boolean | null;
};

export type AvisoDePreco =
  | { motivo: 'preco_diferente'; cobrado: number; cadastro: number; faixa: string | null }
  | { motivo: 'sem_peso' }
  | { motivo: 'sem_preco'; faixa: string | null };

/**
 * O preço desta linha bate com o cadastro, para o peso deste animal? `null` quando bate (ou quando
 * não há o que conferir). Caução não tem preço fixo — é o valor que o cliente deixa.
 */
export function conferirPreco(cobrado: number | null | undefined, item: ItemDoCadastro | null | undefined, pesoKg: number | null | undefined): AvisoDePreco | null {
  if (!item || item.ehCaucao) return null;
  const faixas = lerFaixas(item.precosPorte);
  const r = precoPorPorte({ preco: item.preco ?? null, faixas }, pesoKg);
  if (faixas.length && !(Number(pesoKg) > 0)) return { motivo: 'sem_peso' };
  if (r.preco == null || (!faixas.length && !(Number(r.preco) > 0))) return { motivo: 'sem_preco', faixa: r.faixa?.rotulo ?? null };
  const valor = Number(cobrado ?? 0);
  if (Math.abs(valor - Number(r.preco)) < 0.01) return null;
  return { motivo: 'preco_diferente', cobrado: valor, cadastro: Number(r.preco), faixa: r.faixa?.rotulo ?? null };
}
