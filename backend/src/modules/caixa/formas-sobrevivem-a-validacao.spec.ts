import { ValidationPipe } from '@nestjs/common';
import { RecebimentoDto } from './dto/recebimento.dto';

/**
 * A FORMA DE PAGAMENTO TEM DE CHEGAR AO SERVIÇO.
 *
 * Cintia, 16/09/2026: "tem alguns recebimentos que estão entrando como Outros. O que seria esse
 * outros, não são recebimentos no Nubank?"
 *
 * Medido em produção: 34 dos 59 recebimentos de setembro gravados com `formas: []`. Sem a forma,
 * o resumo do caixa não tem onde pôr o dinheiro e o joga em "Outros".
 *
 * Este teste passa o corpo pelo MESMO ValidationPipe do main.ts, com as mesmas opções.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

describe('recebimento passando pela validação global', () => {
  it('mantém as formas com nome e valor', async () => {
    const corpo = {
      appointmentId: 'a1', valorTotal: 70, troco: 0, observacao: 'Recebimento de venda',
      formas: [{ forma: 'Nubank PIX', valor: 70 }],
    };
    const dto: any = await pipe.transform(corpo, { type: 'body', metatype: RecebimentoDto });
    expect(dto.formas).toEqual([{ forma: 'Nubank PIX', valor: 70 }]);
  });

  it('mantém cartão com bandeira, parcelas e NSU', async () => {
    const corpo = {
      valorTotal: 200,
      formas: [{ forma: 'InfinityPay', valor: 200, modalidade: 'Crédito', bandeira: 'Visa', parcelas: 2, nsu: '123' }],
    };
    const dto: any = await pipe.transform(corpo, { type: 'body', metatype: RecebimentoDto });
    expect(dto.formas[0]).toMatchObject({ forma: 'InfinityPay', valor: 200, bandeira: 'Visa', parcelas: 2, nsu: '123' });
  });
});
