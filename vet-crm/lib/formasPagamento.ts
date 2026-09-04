// CENTRO ÚNICO das formas de pagamento / recebimento — usar em TODA tela que recebe dinheiro
// (PDV, Caixa, Financeiro). Antes disso a lista de formas e os rótulos viviam repetidos em 6+
// lugares ("Débito" vs "Debito" vs "DEBIT_CARD") e o "é dinheiro?" tinha 3 cópias. Aqui mora a
// verdade: os tipos, as modalidades de cartão, as parcelas e os helpers. Mudou aqui → muda em
// cadeia. A TAXA de cartão continua sendo calculada no backend (tabela TaxaContratada) — este
// arquivo NÃO calcula taxa, só padroniza forma/modalidade/parcela e o mapeamento de rótulos.

export type PagForma = {
  forma: string;
  valor: number;
  nsu?: string;
  /** Código de AUTORIZAÇÃO do comprovante da maquininha. Junto com o NSU é o que permite
   *  casar a venda com a linha do extrato da operadora na conciliação. */
  aut?: string;
  /** Operadora (adquirente) escolhida na hora da baixa. Quando vazio, vale a operadora
   *  configurada na forma de recebimento. Existe porque a mesma forma pode passar em
   *  maquininhas diferentes. */
  adquirente?: string;
  modalidade?: string;
  bandeira?: string;
  parcelas?: number;
};
export type FormaCfg = { nome: string; tipo?: string; adquirente?: string; contaId?: string; conta?: string };
export type TaxaRow = { adquirente: string; bandeira: string; forma: string; parcelas: number; aliquotaBps: number };

// Modalidades de cartão (rótulos de UI). PARC = 2..12 parcelas.
export const MODALIDADES = ["Débito", "Crédito à vista", "Crédito parcelado"] as const;
export const PARC = Array.from({ length: 11 }, (_, i) => i + 2); // 2..12

/** UI modalidade → TaxaContratada.forma (mesmos rótulos, sem acento, da tabela de taxas). */
export const modalidadeToTaxaForma = (m?: string) =>
  m === "Débito" ? "Debito" : m === "Crédito à vista" ? "Credito a vista" : m === "Crédito parcelado" ? "Credito parcelado" : "";

/** A forma é uma maquininha (cartão)? Olha o tipo configurado na tela Formas de recebimento. */
export const ehMaquininha = (cfg?: FormaCfg) => /maquin|cart/i.test(cfg?.tipo || "");

/** Adquirente (rede da maquininha) que casa com TaxaContratada.adquirente. */
export const adquirenteDe = (cfg?: FormaCfg) => (cfg?.adquirente || cfg?.nome || "").trim();

/** A operadora que vale pra ESTA linha: a escolhida na baixa vence a configurada na forma. */
export const adquirenteDaLinha = (f: PagForma, cfg?: FormaCfg) =>
  (f.adquirente || adquirenteDe(cfg) || "").trim();

/**
 * Confere o que a maquininha exige antes de deixar salvar. Só olha as linhas de CARTÃO —
 * dinheiro, PIX e crédito do cliente passam direto.
 *
 * Operadora, NSU e autorização são o que permite casar a venda com a linha do extrato na
 * conciliação. Sem eles a conferência do cartão vira trabalho manual no fim do mês.
 *
 * Devolve a mensagem do problema, ou null quando está tudo certo.
 */
export function validarPagamentosCartao(
  formas: PagForma[],
  formasConfig: FormaCfg[],
): string | null {
  const cfgByNome = new Map(formasConfig.map((c) => [c.nome, c]));
  for (let i = 0; i < (formas || []).length; i++) {
    const f = formas[i];
    const cfg = cfgByNome.get(f.forma);
    if (!ehMaquininha(cfg)) continue;
    if (!(Number(f.valor) > 0)) continue; // linha de cartão sem valor: nada a conferir
    const onde = formas.length > 1 ? ` (${i + 1}ª forma de pagamento)` : "";
    // Operadora DELIBERADA: a escolhida na baixa ou a configurada na forma. O nome da forma
    // não conta — ele é só um substituto pro cálculo da taxa, e aceitá-lo aqui faria esta
    // exigência nunca falhar (foi o que o teste pegou em 04/09/2026).
    if (!String(f.adquirente || cfg?.adquirente || "").trim()) {
      return `Escolha a operadora do cartão${onde}.`;
    }
    if (!String(f.nsu || "").trim()) return `Informe o NSU do comprovante${onde}.`;
    if (!String(f.aut || "").trim()) return `Informe o código de autorização (AUT)${onde}.`;
  }
  return null;
}

/** É dinheiro (gera troco / entra na gaveta)? Reconhece "Dinheiro", "dinheiro", "Espécie". */
export const ehDinheiro = (forma?: string) => /dinheiro|especie|espécie/i.test(forma || "");

/** LOADER ÚNICO das formas de recebimento — usar em toda tela que recebe (PDV, Caixa). Busca a
 *  lista dinâmica configurada em Formas de recebimento + a tabela de taxas. Antes, este fetch/parse
 *  estava copiado em 3 telas. Devolve `formasConfig` (config completa por forma), `formasList` (só
 *  os nomes, p/ o <select>) e `taxas` (tabela TaxaContratada, usada só no cálculo/exibição). */
export async function carregarFormasRecebimento(): Promise<{ formasConfig: FormaCfg[]; formasList: string[]; taxas: TaxaRow[] }> {
  let formasConfig: FormaCfg[] = [];
  try {
    const r = await fetch("/api/listas?lista=formasrecebimento", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d?.itens || d?.data || []);
      formasConfig = arr.map((x: any) => { try { return JSON.parse(x.valor); } catch { return null; } }).filter((v: any) => v && v.ativo !== false);
    }
  } catch { /* rede — devolve vazio, a tela usa seu fallback */ }
  let taxas: TaxaRow[] = [];
  try {
    const r = await fetch("/api/financeiro/auditoria/taxas", { cache: "no-store" });
    if (r.ok) { const d = await r.json(); taxas = Array.isArray(d) ? d : (d?.data || d?.itens || []); }
  } catch { /* rede */ }
  return { formasConfig, formasList: formasConfig.map((v: any) => v.nome).filter(Boolean), taxas };
}
