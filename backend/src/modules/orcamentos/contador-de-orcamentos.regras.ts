// QUANTOS ORÇAMENTOS VIRARAM VENDA — um contador, não o orçamento inteiro.
//
// Cintia, 16/09/2026: no SimplesVet, ao transformar em venda o orçamento some, "mesmo porque o
// banco vai ficando inchado e sem necessidade". O único dado que se perdia era a conta de quantos
// orçamentos viram venda — e para isso basta "guardar um contador simples, sem manter o orçamento
// inteiro. Isso é o suficiente." Por mês, na tela de Orçamentos.
//
// Mora em lista_itens: lista `orcamentos_viraram_venda`, valor = mês ("2026-09"), ordem = quantos.

export const LISTA_CONTADOR = 'orcamentos_viraram_venda';

/** O mês da casa (Fortaleza) de uma data, no formato "2026-09". */
export function mesDaCasa(data: Date = new Date()): string {
  return new Date(data).toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }).slice(0, 7);
}

type Db = {
  listaItem: {
    findFirst: (a: any) => Promise<{ id: string; ordem: number } | null>;
    create: (a: any) => Promise<any>;
    update: (a: any) => Promise<any>;
  };
};

/** Soma `quantos` ao mês. */
export async function somarNoContador(db: Db, data: Date = new Date(), quantos = 1): Promise<void> {
  const mes = mesDaCasa(data);
  const atual = await db.listaItem.findFirst({ where: { lista: LISTA_CONTADOR, valor: mes } });
  if (atual) await db.listaItem.update({ where: { id: atual.id }, data: { ordem: (Number(atual.ordem) || 0) + quantos } });
  else {
    try {
      await db.listaItem.create({ data: { lista: LISTA_CONTADOR, valor: mes, ordem: quantos } });
    } catch {
      // Duas transformações no mesmo segundo do primeiro dia do mês: a outra criou a linha.
      const criada = await db.listaItem.findFirst({ where: { lista: LISTA_CONTADOR, valor: mes } });
      if (criada) await db.listaItem.update({ where: { id: criada.id }, data: { ordem: (Number(criada.ordem) || 0) + quantos } });
    }
  }
}
