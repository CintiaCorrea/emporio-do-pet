
// Cintia, 17/09/2026: "Reabre e depois deleta". O Movimento de caixa escondia a lixeira em caixa
// fechado; a tela de Recebimentos não, e o servidor aceitava. Agora a trava é do servidor.
describe('apagar recebimento de caixa fechado', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'caixa.service.ts'), 'utf8');
  it('o servidor recusa e manda reabrir o caixa', () => {
    expect(src).toContain("está fechado. Reabra o caixa (Movimento de caixa › Reabrir caixa) para apagar este recebimento.");
    const i = src.indexOf('async deleteRecebimento');
    const trecho = src.slice(i, i + 1200);
    expect(trecho).toContain("String(sessao.status || '').toUpperCase() !== 'ABERTO'");
    // a recusa vem ANTES do estorno
    expect(trecho.indexOf('Reabra o caixa')).toBeLessThan(trecho.indexOf('estornarRecebimento('));
  });
});
