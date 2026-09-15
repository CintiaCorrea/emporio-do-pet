import { podeAcao, perfilDoUsuario, papelParaPerfil, ACOES_DINHEIRO, Matriz } from './permissoes.regras';

/**
 * A MATRIZ DE PERFIS PASSA A VALER NO SERVIDOR.
 *
 * Cintia, 15/09/2026, com os prints do Perfil de acesso do SimplesVet: "todas estão liberadas
 * para o adm, essa mesma lista aparece para os outros perfis e eu determino quais ficarão
 * disponíveis para cada perfil".
 *
 * O QUE HAVIA: a matriz existia, guardada em `lista_itens`, e era lida SÓ pelo navegador. Ela
 * escondia botão. Para agenda ou relatório isso basta; para dinheiro, botão escondido não é
 * trava — quem soubesse o endereço da API fazia a operação assim mesmo.
 *
 * Duas decisões que estes testes prendem, e as duas podem parecer erradas sem o motivo:
 *   · o administrativo passa SEMPRE, mesmo que a matriz diga não;
 *   · ação de dinheiro sem configuração nasce FECHADA, ao contrário do resto do sistema.
 */
const VAZIA: Matriz = {};

describe('quem pode o quê', () => {
  describe('o administrativo passa sempre', () => {
    it('mesmo com a matriz dizendo OCULTO', () => {
      // TRAVA ANTI-TRANCA: a matriz é editada pela própria Cintia. Se uma configuração errada
      // pudesse tirar o acesso dela, ela se trancaria para fora do próprio sistema e a única
      // saída seria mexer no banco.
      const m: Matriz = { 'acao:venda.reabrir': 'OCULTO', 'acao:venda.excluir': 'VISUALIZA' };
      expect(podeAcao(m, 'acao:venda.reabrir', 'ADMIN')).toBe(true);
      expect(podeAcao(m, 'acao:venda.excluir', 'admin')).toBe(true);
    });
  });

  describe('os outros perfis seguem a matriz', () => {
    it('EDITA libera', () => {
      expect(podeAcao({ 'acao:venda.reabrir': 'EDITA' }, 'acao:venda.reabrir', 'RECEPTIONIST')).toBe(true);
    });

    it('VISUALIZA não é poder fazer', () => {
      // Ver a venda e poder estornar o recebimento dela são coisas diferentes.
      expect(podeAcao({ 'acao:venda.reabrir': 'VISUALIZA' }, 'acao:venda.reabrir', 'RECEPTIONIST')).toBe(false);
    });

    it('OCULTO não libera', () => {
      expect(podeAcao({ 'acao:venda.reabrir': 'OCULTO' }, 'acao:venda.reabrir', 'VETERINARIAN')).toBe(false);
    });
  });

  describe('o que ninguém configurou', () => {
    it('AÇÃO DE DINHEIRO nasce fechada', () => {
      // Ao contrário do resto do sistema, que é permissivo. Esconder uma tela por engano só
      // atrapalha; liberar por engano estorna recebimento, apaga venda e mexe em caixa.
      for (const chave of ACOES_DINHEIRO) {
        expect(podeAcao(VAZIA, chave, 'RECEPTIONIST')).toBe(false);
        expect(podeAcao(null, chave, 'VETERINARIAN')).toBe(false);
      }
    });

    it('o resto segue o permissivo de sempre', () => {
      // Tela nova que ainda não entrou na matriz não pode sumir para a equipe inteira.
      expect(podeAcao(VAZIA, '/dashboard/erp/agendamentos/agenda', 'RECEPTIONIST')).toBe(true);
      expect(podeAcao(VAZIA, 'acao:qualquer.coisa', 'VETERINARIAN')).toBe(true);
    });

    it('e o adm continua passando mesmo no que é fechado por padrão', () => {
      for (const chave of ACOES_DINHEIRO) expect(podeAcao(VAZIA, chave, 'ADMIN')).toBe(true);
    });
  });
});

describe('de quem é este perfil', () => {
  it('o perfil ATRIBUÍDO na tela ganha do cargo', () => {
    // É assim que a Cintia dá a uma recepcionista de confiança um perfil mais largo sem mexer
    // no cargo dela no sistema.
    const mapa = { 'user-1': 'Financeiro' };
    expect(perfilDoUsuario('user-1', 'RECEPTIONIST', mapa)).toBe('Financeiro');
  });

  it('sem atribuição, vale o cargo', () => {
    expect(perfilDoUsuario('user-2', 'RECEPTIONIST', {})).toBe('Recepção');
    expect(perfilDoUsuario('user-2', 'VETERINARIAN', null)).toBe('Veterinário');
    expect(perfilDoUsuario(null, 'ADMIN', undefined)).toBe('Admin');
  });

  it('cargo desconhecido cai em Admin — não esconde nada de quem o sistema não classificou', () => {
    // Fallback permissivo de propósito: as ações de dinheiro continuam fechadas por padrão, e
    // é isso que impede este fallback de virar porta aberta.
    expect(papelParaPerfil('OUTRO')).toBe('Admin');
    expect(papelParaPerfil(null)).toBe('Admin');
  });
});
