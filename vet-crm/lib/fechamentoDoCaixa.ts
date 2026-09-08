// O CAIXA FOI CONFERIDO OU SÓ FECHOU SOZINHO? — núcleo puro.
//
// A Cintia, em 08/09/2026, lendo o SimplesVet: "Fechamento 23:59:00 é fechamento automático,
// não fechamento feito por alguém. Só as horas 'quebradas' (18:03, 18:26, 17:21) são fechamento
// manual. Um dev precisa dessa distinção — hoje ela é implícita no valor da hora."
//
// Adivinhar pela hora é frágil: basta o cron atrasar um minuto. O sinal honesto é outro — quem
// conferiu a gaveta CONTOU o dinheiro, e contar deixa rastro (`valorContado`). O encerramento
// da meia-noite fecha sem contar, de propósito, e diz isso na observação.
//
// Por que isso importa daqui a um ano: sem o selo, ninguém distingue um caixa que bateu de um
// caixa que só foi encerrado. Os dois aparecem como "Fechado", e a diferença some do histórico.

export type CaixaFechado = {
  status?: string | null;
  valorContado?: number | null;
  diferenca?: number | null;
  obsFechamento?: string | null;
};

export type SeloDeFechamento = {
  chave: 'conferido' | 'automatico' | 'sem-conferencia';
  texto: string;
  detalhe: string;
};

/**
 * O selo de conferência de um caixa. `null` para caixa ABERTO — lá não há o que conferir ainda.
 */
export function seloDoFechamento(c: CaixaFechado | null | undefined): SeloDeFechamento | null {
  if (!c) return null;
  const status = String(c.status || '').toUpperCase();
  if (!status || status === 'ABERTO') return null;

  if (c.valorContado != null) {
    const dif = Number(c.diferenca ?? 0);
    const detalhe = Math.abs(dif) < 0.005
      ? 'A gaveta foi contada e bateu com o esperado.'
      : dif > 0
        ? 'A gaveta foi contada e sobrou dinheiro.'
        : 'A gaveta foi contada e faltou dinheiro.';
    return { chave: 'conferido', texto: 'Conferido', detalhe };
  }

  if (/autom/i.test(String(c.obsFechamento || ''))) {
    return {
      chave: 'automatico',
      texto: 'Encerrado à meia-noite',
      detalhe: 'Ninguém contou a gaveta — o caixa foi encerrado sozinho, como manda a regra da casa.',
    };
  }

  return {
    chave: 'sem-conferencia',
    texto: 'Sem conferência',
    detalhe: 'O caixa foi fechado sem contar o dinheiro da gaveta.',
  };
}

/** As cores do selo. Verde só para quem contou — é o único que merece. */
export function coresDoSelo(chave: SeloDeFechamento['chave']): { bg: string; fg: string } {
  if (chave === 'conferido') return { bg: '#e1f5ee', fg: '#0F5132' };
  if (chave === 'automatico') return { bg: '#FBF1E2', fg: '#8A5B00' };
  return { bg: '#F3F0EA', fg: '#5C6B70' };
}
