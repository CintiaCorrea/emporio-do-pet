// APAGAR VENDA QUE TEM DINHEIRO RECEBIDO: o administrativo pode, mas nunca sem saber.
//
// A Cintia, 16/09/2026, ao descobrir que a #1177 tinha sumido: ela mesma apagou, às 12:49, numa
// sequência de oito exclusões — e só aquela tinha dinheiro. A exclusão levou junto o recebimento
// de R$ 468,35 e o caixa nº 11 da Gabriela, de 10/09, ficou menor sem ninguém perceber. Foi
// preciso restaurar do backup.
//
// Os outros perfis já eram barrados (appointments.service.checarPermissaoExclusaoVenda). O
// administrativo passava direto — e precisa continuar podendo, é quem concilia. O que muda é
// que ele passa SABENDO: o servidor recusa com TEM_RECEBIMENTO e diz quanto, em que caixa e de
// quem; só apaga quando a tela repete o pedido com `comRecebimento=true`. Mesmo desenho do aviso
// de gravação de áudio (TEM_GRAVACAO + force), que já existia.

export type RecebimentoQueSeraApagado = {
  valorTotal?: number | null;
  caixaSessao?: { numero?: number | null; abertura?: Date | string | null; user?: { name?: string | null } | null } | null;
};

const BRL = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const ddmm = (d?: Date | string | null) => {
  if (!d) return '';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' });
};

/** A frase que a tela mostra antes de apagar. `null` quando não há dinheiro envolvido. */
export function avisoDeRecebimentoNaExclusao(recs: RecebimentoQueSeraApagado[] | null | undefined): string | null {
  const lista = (recs || []).filter((r) => Number(r?.valorTotal) > 0);
  if (!lista.length) return null;
  const total = lista.reduce((s, r) => s + Number(r.valorTotal), 0);
  const onde = lista
    .map((r) => {
      const c = r.caixaSessao;
      const partes = [c?.numero != null ? `caixa nº ${c.numero}` : 'caixa', c?.user?.name ? `de ${c.user.name}` : '', ddmm(c?.abertura)].filter(Boolean);
      return `${BRL(Number(r.valorTotal))} no ${partes.join(' ')}`;
    })
    .join('; ');
  return `Esta venda tem ${BRL(total)} recebido (${onde}). Apagar a venda apaga o recebimento junto, e o caixa fica ${BRL(total)} menor. Apagar mesmo assim?`;
}
