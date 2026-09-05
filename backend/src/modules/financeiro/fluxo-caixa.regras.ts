// NUCLEO PURO do FLUXO DE CAIXA — "em que dia eu fico sem dinheiro na conta?"
//
// Nao confundir com o DRE. Sao perguntas diferentes e a clinica precisa das duas:
//   DRE   -> o MES deu lucro? conta a venda no dia em que ela acontece.
//   FLUXO -> tenho dinheiro no dia 18? conta o dinheiro no dia em que ele CAI na conta.
// Uma clinica pode ter o melhor mes do ano no DRE e nao pagar o aluguel, porque vendeu
// no cartao parcelado. E esse descompasso que esta tela mostra.
//
// Decisoes da Cintia (04/09/2026):
//   - A clinica tem antecipacao contratada: TODA venda no cartao cai em D+1, inclusive
//     o parcelado. Por isso nao ha cronograma de parcelas aqui.
//   - A janela e de 30 dias CORRIDOS a partir de hoje (nao "ate o fim do mes"), pra que
//     as contas dos dias 10, 18 e 25 do mes seguinte nunca saiam de vista.

/** Data no formato AAAA-MM-DD. Trabalhamos so com o DIA — hora nao importa pro fluxo. */
export type DiaISO = string;

export type MovimentoPrevisto = {
  /** Dia em que o dinheiro entra ou sai da conta (ja com o D+1 aplicado, se for cartao). */
  data: DiaISO;
  /** Sempre positivo. O sinal vem do tipo. */
  valorCentavos: number;
  tipo: 'ENTRADA' | 'SAIDA';
  descricao?: string;
};

export type DiaFluxo = {
  data: DiaISO;
  entradaCentavos: number;
  saidaCentavos: number;
  /** Saldo no FIM do dia. */
  saldoCentavos: number;
  descricoes: string[];
};

export type Fluxo = {
  saldoInicialCentavos: number;
  dias: DiaFluxo[];
  /** O pior momento da janela — o que a tela mostra em destaque. */
  menorSaldo: { data: DiaISO; valorCentavos: number } | null;
  /** Primeiro dia em que o saldo fica negativo. null = passa a janela inteira no azul. */
  primeiroDiaNegativo: DiaISO | null;
  totalEntradasCentavos: number;
  totalSaidasCentavos: number;
};

/** Soma dias a uma data AAAA-MM-DD sem passar por fuso horario. */
export function somarDias(dia: DiaISO, n: number): DiaISO {
  const [a, m, d] = dia.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** So a parte da data, seja Date ou string. Nunca desloca por fuso. */
export function apenasDia(v: Date | string): DiaISO {
  if (typeof v === 'string') return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

/**
 * Quando a venda no cartao vira dinheiro na conta.
 * D+1 para TUDO — debito, credito a vista e parcelado — porque a clinica tem
 * antecipacao contratada. Se um dia esse contrato mudar, muda AQUI e em nenhum
 * outro lugar (e o teste ao lado avisa se alguem esquecer).
 */
export function compensacaoCartao(dataVenda: Date | string): DiaISO {
  return somarDias(apenasDia(dataVenda), 1);
}

/**
 * Projeta o saldo dia a dia.
 *
 * Movimentos fora da janela sao ignorados; movimentos no MESMO dia sao somados.
 * O saldo de cada dia e o do fim do dia, entao uma conta que vence hoje ja aparece
 * descontada hoje — que e como a pessoa pensa ("depois de pagar o aluguel eu fico com...").
 */
export function projetarFluxo(
  saldoInicialCentavos: number,
  movimentos: MovimentoPrevisto[],
  primeiroDia: DiaISO,
  quantidadeDeDias = 30,
): Fluxo {
  const porDia = new Map<DiaISO, { e: number; s: number; d: string[] }>();
  for (const mv of movimentos || []) {
    if (!mv?.data) continue;
    const v = Math.round(Number(mv.valorCentavos) || 0);
    if (v <= 0) continue;
    const dia = apenasDia(mv.data);
    const acc = porDia.get(dia) || { e: 0, s: 0, d: [] };
    if (mv.tipo === 'ENTRADA') acc.e += v;
    else acc.s += v;
    if (mv.descricao) acc.d.push(mv.descricao);
    porDia.set(dia, acc);
  }

  const dias: DiaFluxo[] = [];
  let saldo = Math.round(Number(saldoInicialCentavos) || 0);
  let menor: { data: DiaISO; valorCentavos: number } | null = null;
  let negativo: DiaISO | null = null;
  let totE = 0;
  let totS = 0;

  for (let i = 0; i < quantidadeDeDias; i++) {
    const data = somarDias(primeiroDia, i);
    const acc = porDia.get(data) || { e: 0, s: 0, d: [] };
    saldo = saldo + acc.e - acc.s;
    totE += acc.e;
    totS += acc.s;
    dias.push({ data, entradaCentavos: acc.e, saidaCentavos: acc.s, saldoCentavos: saldo, descricoes: acc.d });
    if (!menor || saldo < menor.valorCentavos) menor = { data, valorCentavos: saldo };
    if (negativo === null && saldo < 0) negativo = data;
  }

  return {
    saldoInicialCentavos: Math.round(Number(saldoInicialCentavos) || 0),
    dias,
    menorSaldo: menor,
    primeiroDiaNegativo: negativo,
    totalEntradasCentavos: totE,
    totalSaidasCentavos: totS,
  };
}
