import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * TODA PORTA QUE RECEBE CONFERE O DESCONTO — NO MESMO LUGAR.
 *
 * Cintia, 16/09/2026: "o caixa tem autorização de dar 5% de desconto nas vendas à vista e no PIX".
 *
 * Até esse dia só a venda nova do ponto de venda conferia desconto, e com um limite só para
 * qualquer forma. O recebimento do Caixa — para onde o ponto de venda manda receber — aceitava
 * qualquer desconto. Este teste impede que uma porta volte a ficar sem trava.
 */
const svc = readFileSync(join(__dirname, 'caixa.service.ts'), 'utf8');
const corpoDe = (inicio: string, fim: string) => {
  const i = svc.indexOf(inicio);
  const j = svc.indexOf(fim, i + inicio.length);
  expect(i).toBeGreaterThan(0);
  expect(j).toBeGreaterThan(i);
  return svc.slice(i, j);
};

describe('o desconto é conferido em toda porta de receber', () => {
  it('existe UMA conferência, e ela usa a regra por forma', () => {
    expect(svc).toContain('private async conferirDesconto(');
    expect(svc).toContain('avaliarDesconto({ bruto: p.bruto, desconto: p.desconto, formas, formasCadastradas })');
  });

  it('a venda nova do ponto de venda', () => {
    const corpo = corpoDe('async vendaDireta(', 'const valorVenda = Math.max(0');
    expect(corpo).toContain('await this.conferirDesconto({');
    // O limite geral solto, que ignorava a forma, não pode voltar.
    expect(corpo).not.toContain('const limitePct = Number(cfgVenda.limiteDesconto)');
  });

  it('o recebimento avulso (Caixa e ponto de venda)', () => {
    const corpo = corpoDe('async registrarRecebimento(', 'const rec = await this.prisma.recebimento.create(');
    expect(corpo).toContain('await this.conferirDesconto({');
  });

  it('o Baixar várias confere ANTES de gravar, e as partes não conferem de novo', () => {
    const corpo = corpoDe('async registrarRecebimentoLote(', 'const { partes, sobra } = distribuirPagamento(');
    expect(corpo).toContain('await this.conferirDesconto({');
    expect(svc).toContain('}, userId, papel, { descontoJaConferido: true, descontoItens: descontoPorVenda.get(p.appointmentId) });');
    // O que falta receber é contado DEPOIS do desconto (#1219, 17/09/2026).
    expect(svc).toContain('restanteEmAberto: Number(Math.max(0, devidoAgora - valorPago).toFixed(2)),');
  });

  it('não existe mais liberação por senha de gerente', () => {
    // Cintia, 16/09/2026: "adm não tem limite e todos os outros são livres até 5% no PIX e em
    // dinheiro. São essas as regras, qualquer outra coisa não."
    expect(svc).not.toContain('liberacaoSenha');
    expect(svc).not.toContain('bcrypt');
    const conferir = corpoDe('private async conferirDesconto(', 'private async ratearDescontoNaVenda(');
    expect(conferir).toContain("papelReal === 'ADMIN'");
    expect(conferir).not.toContain('permissoes');
  });

  it('o desconto geral da venda nova vai dividido para os itens', () => {
    const corpo = corpoDe('async vendaDireta(', 'async deleteMovimento(');
    expect(corpo).toContain('ratearDesconto(items, descontoGlobal)');
    expect(corpo).toContain('items: itensVenda');
    // e a observação (a do modelo inclusive) é gravada na venda
    expect(corpo).toContain('notes: dto.observacao ? String(dto.observacao) : null');
  });

  it('o desconto dado na hora de receber também vai para os itens', () => {
    const corpo = corpoDe('async registrarRecebimento(', 'const rec = await this.prisma.recebimento.create(');
    expect(corpo).toContain('this.ratearDescontoNaVenda(appointmentId');
  });

});
