import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * EXCLUIR ORÇAMENTO QUE JÁ VIROU VENDA — SÓ ATÉ 19/09, E SEM TOCAR NA VENDA.
 *
 * Cintia, 16/09/2026: "preciso poder deletar orçamentos que viraram vendas e ainda constam os
 * orçamentos. Pode liberar também até dia 19?"
 */
const svc = readFileSync(join(__dirname, 'orcamentos.service.ts'), 'utf8');
const corpo = svc.slice(svc.indexOf('async remove(id: string)'), svc.indexOf('async converter('));
const schema = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');

describe('excluir orçamento', () => {
  it('o convertido só passa dentro da janela de ajuste', () => {
    expect(corpo).toContain('appointmentId && !dentroDaJanelaDeAjuste()');
  });

  it('o que apaga é SÓ o orçamento — nenhuma escrita na venda', () => {
    expect(corpo).toContain('this.prisma.orcamento.delete({ where: { id } })');
    expect(corpo).not.toMatch(/appointment\.(delete|update)/);
  });

  it('e a ligação no banco não arrasta a venda junto', () => {
    // A chave mora no orçamento; apagar o orçamento não apaga a venda.
    expect(schema).toMatch(/appointmentId String\?\s+@unique\s+appointment\s+Appointment\?\s+@relation\("OrcamentoVenda", fields: \[appointmentId\], references: \[id\], onDelete: SetNull\)/);
  });
});
