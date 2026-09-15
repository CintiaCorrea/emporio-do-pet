import { readFileSync } from 'fs';
import { join } from 'path';
import { contaQueFaltaNoMovimento } from './caixa.regras';

/**
 * DINHEIRO QUE SAI DO CAIXA PRECISA DIZER PARA ONDE VAI.
 *
 * Cintia, 15/09/2026: "não podemos escolher a conta para onde queremos transferir, ao invés de
 * isso ser uma regra fixa do sistema?"
 *
 * O seletor de conta JÁ EXISTIA — e era opcional. Quem deixasse em branco tinha o movimento
 * gravado no caixa e NENHUM lançamento no financeiro: o serviço desistia em silêncio quando
 * faltava a conta.
 *
 * O ESTRAGO, medido em produção em 15/09/2026: 9 movimentações de setembro (2 sangrias, 1
 * suprimento, 6 transferências), R$ 1.040,54 no total, ZERO com lançamento financeiro. O
 * dinheiro saía do caixa na tela e não entrava em conta nenhuma — o que não afeta a DRE
 * (transferência é neutra no resultado) mas estraga o saldo das contas, que é justamente o que
 * se compara com o extrato do banco na conciliação.
 *
 * O defeito era o SILÊNCIO, não a regra. Agora falta conta = a operação não acontece.
 */
describe('dinheiro não some do caixa', () => {
  const CONTA_A = 'conta-especie';
  const CONTA_B = 'conta-nubank';

  describe('sangria — sai do caixa', () => {
    it('sem conta de destino, recusa e diz por quê', () => {
      const erro = contaQueFaltaNoMovimento('SANGRIA', {});
      expect(erro).toBeTruthy();
      expect(erro).toMatch(/destino/i);
      // A mensagem explica a CONSEQUÊNCIA, não só o campo em falta: "obrigatório" faz a pessoa
      // preencher qualquer coisa; "precisa entrar em algum lugar" faz pensar onde o dinheiro foi.
      expect(erro).toMatch(/entrar em algum lugar/i);
    });

    it('com conta de destino, passa', () => {
      expect(contaQueFaltaNoMovimento('SANGRIA', { contaDestinoId: CONTA_A })).toBeNull();
    });
  });

  describe('suprimento — entra no caixa', () => {
    it('sem conta de origem, recusa', () => {
      expect(contaQueFaltaNoMovimento('SUPRIMENTO', {})).toMatch(/origem/i);
    });

    it('com conta de origem, passa', () => {
      expect(contaQueFaltaNoMovimento('SUPRIMENTO', { contaOrigemId: CONTA_A })).toBeNull();
    });
  });

  describe('transferência — precisa das duas pontas', () => {
    it('faltando qualquer uma, recusa', () => {
      expect(contaQueFaltaNoMovimento('TRANSFERENCIA', {})).toBeTruthy();
      expect(contaQueFaltaNoMovimento('TRANSFERENCIA', { contaOrigemId: CONTA_A })).toBeTruthy();
      expect(contaQueFaltaNoMovimento('TRANSFERENCIA', { contaDestinoId: CONTA_B })).toBeTruthy();
    });

    it('origem igual ao destino não é transferência', () => {
      const erro = contaQueFaltaNoMovimento('TRANSFERENCIA', { contaOrigemId: CONTA_A, contaDestinoId: CONTA_A });
      expect(erro).toMatch(/não sairia do lugar/i);
    });

    it('com as duas contas diferentes, passa', () => {
      expect(contaQueFaltaNoMovimento('TRANSFERENCIA', { contaOrigemId: CONTA_A, contaDestinoId: CONTA_B })).toBeNull();
    });
  });

  describe('o que a regra NÃO atrapalha', () => {
    it('despesa não precisa de conta escolhida — sai do dinheiro do caixa', () => {
      expect(contaQueFaltaNoMovimento('DESPESA', {})).toBeNull();
    });

    it('tipo desconhecido não é bloqueado por esta regra', () => {
      expect(contaQueFaltaNoMovimento('QUALQUER', {})).toBeNull();
      expect(contaQueFaltaNoMovimento(null, {})).toBeNull();
    });

    it('espaço em branco não conta como conta escolhida', () => {
      expect(contaQueFaltaNoMovimento('SANGRIA', { contaDestinoId: '   ' })).toBeTruthy();
    });
  });

  describe('a recusa acontece nos dois lados', () => {
    const svc = readFileSync(join(__dirname, 'caixa.service.ts'), 'utf8');

    it('o servidor recusa ANTES de gravar o movimento', () => {
      // Gravar e depois desistir do lançamento é exatamente o que criou o buraco: o caixa fica
      // com a saída e o financeiro não fica com a entrada.
      const trecho = svc.slice(svc.indexOf('async registrarMovimento('), svc.indexOf('async registrarMovimento(') + 900);
      const posRegra = trecho.indexOf('contaQueFaltaNoMovimento');
      const posCreate = trecho.indexOf('caixaMovimento.create');
      expect(posRegra).toBeGreaterThan(-1);
      expect(posRegra).toBeLessThan(posCreate);
    });

    it('e a tela também — mas ela não é a trava', () => {
      const modal = readFileSync(join(__dirname, '..', '..', '..', '..', 'vet-crm', 'components', 'caixa', 'MovimentoCaixaModal.tsx'), 'utf8');
      expect(modal).toContain('Escolha a conta de destino');
      expect(modal).toContain('Escolha a conta de origem');
    });
  });
});
