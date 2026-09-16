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
    expect(svc).toContain('avaliarDesconto({ bruto: p.bruto, desconto: p.desconto, formas, formasCadastradas, limiteGeral: cfg.limiteDesconto })');
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
    expect(svc).toContain('}, userId, papel, { descontoJaConferido: true });');
  });

  it('a liberação do gerente consegue chegar ao recebimento avulso', () => {
    // Sem isto o ValidationPipe (forbidNonWhitelisted) recusaria o pedido inteiro.
    const dto = readFileSync(join(__dirname, 'dto', 'recebimento.dto.ts'), 'utf8');
    expect(dto).toContain('liberacaoEmail?: string;');
    expect(dto).toContain('liberacaoSenha?: string;');
  });
});
