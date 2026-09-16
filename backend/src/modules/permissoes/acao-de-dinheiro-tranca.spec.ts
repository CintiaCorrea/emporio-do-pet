import { readFileSync } from 'fs';
import { join } from 'path';
import { ACOES_DINHEIRO, acaoNegada, podeAcao } from './permissoes.regras';

/**
 * TODA AÇÃO DE DINHEIRO DA MATRIZ TRAVA DE VERDADE, NO SERVIDOR.
 *
 * Cintia, 15/09/2026: "precisamos de mais liberdade para edições mesmo que isso tenha que ser
 * autorizado por perfil" — e, na mesma conversa, as três regras dela: depois de recebida só o
 * adm reabre; deletar venda é só do adm; antes de receber todos editam, depois só o adm.
 *
 * A matriz tinha SETE ações de dinheiro. Três travavam no servidor; as outras quatro só
 * escondiam botão. Botão escondido não é permissão — é sugestão: quem souber o endereço da API
 * faz a operação assim mesmo, e o sistema aceita sem reclamar.
 *
 * ESTE TESTE É O QUE IMPEDE A LISTA DE CRESCER SOZINHA de novo. Acrescentar uma chave em
 * ACOES_DINHEIRO sem escrever a trava passa a reprovar aqui, com o nome do arquivo onde falta.
 */
const SRC = join(__dirname, '..');
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8');

describe('cada ação de dinheiro tem uma trava no servidor', () => {
  // Onde cada chave é cobrada. A trava é sempre uma chamada a `permissoes.pode`/`negada` com
  // a chave literal — é isso que o teste procura, e não o nome do método que a contém: método
  // renomeia, a chave não.
  const ONDE: Record<string, string[]> = {
    'acao:venda.editar_recebida': ['appointments', 'appointments.service.ts'],
    'acao:venda.reabrir': ['caixa', 'caixa.service.ts'],
    'acao:venda.excluir': ['appointments', 'appointments.service.ts'],
    'acao:venda.alterar_data': ['appointments', 'appointments.service.ts'],
    'acao:venda.conceder_desconto': ['caixa', 'caixa.service.ts'],
    'acao:caixa.reabrir': ['caixa', 'caixa.service.ts'],
    'acao:caixa.lancar_em_caixa_alheio': ['caixa', 'caixa.service.ts'],
  };

  it('não sobrou nenhuma chave sem endereço', () => {
    // Se alguém acrescentar uma ação e esquecer de travá-la, o erro aparece AQUI, na hora de
    // rodar os testes, e não em produção no dia em que alguém tentar usar.
    expect(Object.keys(ONDE).sort()).toEqual([...ACOES_DINHEIRO].sort());
  });

  for (const [chave, caminho] of Object.entries(ONDE)) {
    it(`${chave} é conferida em ${caminho[caminho.length - 1]}`, () => {
      const fonte = ler(...caminho);
      expect(fonte).toContain(`'${chave}'`);
      expect(fonte).toMatch(/this\.permissoes\.(pode|negada)\(/);
    });
  }
});

describe('o administrativo nunca se tranca para fora', () => {
  // A matriz é editada pela própria Cintia. Uma configuração errada que tirasse o acesso dela
  // só teria conserto no banco.
  for (const chave of ACOES_DINHEIRO) {
    it(`ADMIN passa em ${chave} mesmo com a matriz mandando o contrário`, () => {
      expect(podeAcao({ [chave]: 'OCULTO' }, chave, 'ADMIN')).toBe(true);
      expect(acaoNegada({ [chave]: 'OCULTO' }, chave, 'ADMIN')).toBe(false);
    });
  }
});

describe('os três níveis do desconto', () => {
  const D = 'acao:venda.conceder_desconto';

  it('sem configurar: não está liberado, mas também não está negado', () => {
    // Este é o estado em que a casa inteira está hoje, e é o que faz a recepção continuar
    // dando 5% num banho amanhã de manhã: o desconto segue o limite em %, como sempre seguiu.
    expect(podeAcao({}, D, 'RECEPTIONIST')).toBe(false);
    expect(acaoNegada({}, D, 'RECEPTIONIST')).toBe(false);
  });

  it('liberado: passa por cima do limite, igual gerente', () => {
    expect(podeAcao({ [D]: 'EDITA' }, D, 'RECEPTIONIST')).toBe(true);
    expect(acaoNegada({ [D]: 'EDITA' }, D, 'RECEPTIONIST')).toBe(false);
  });

  it('fechado de propósito: não dá desconto nenhum, nem dentro do limite', () => {
    expect(acaoNegada({ [D]: 'OCULTO' }, D, 'RECEPTIONIST')).toBe(true);
    expect(acaoNegada({ [D]: 'VISUALIZA' }, D, 'RECEPTIONIST')).toBe(true);
  });
});

describe('remarcar agendamento continua livre', () => {
  /**
   * O RISCO DESTA MUDANÇA, e o motivo de o teste existir: `acao:venda.alterar_data` mora no
   * mesmo `update` que a recepção usa dezenas de vezes por dia para arrastar uma consulta de
   * terça para quinta. Travar as duas coisas junto pararia a agenda inteira.
   */
  const svc = ler('appointments', 'appointments.service.ts');
  // A ancora e' a DECLARACAO do metodo, e nao inclui quebra de linha: uma quebra na ancora ja
  // fez este recorte sair vazio uma vez, e teste que passa recortando nada e' pior que teste
  // nenhum. Por isso o primeiro caso deste bloco confere o proprio recorte.
  const inicio = svc.indexOf('private async exigirPermissaoParaAlterarDataDaVenda');
  const trecho = svc.slice(inicio, svc.indexOf('// Confirmação de agendamento'));

  it('o recorte achou o método (senão o resto deste bloco não prova nada)', () => {
    expect(inicio).toBeGreaterThan(0);
    expect(trecho.length).toBeGreaterThan(200);
  });

  it('orçamento não é venda para efeito de trava', () => {
    // O orçamento nasce pelo mesmo caminho, com itens e com valor — e por isso "tem valor" o
    // classificava como venda. Mas ele não entra em caixa nem em mês nenhum: é papel de balcão.
    // A recepção precisa poder apagar e remarcar o dela sem chamar o administrativo.
    expect(svc).toContain("if (/or[çc]amento/i.test(String(appt?.type || ''))) return false;");
    // E a consulta ao banco tem de TRAZER o type, senão a função decide no escuro.
    expect(svc).toContain('paymentStatus: true, createdAt: true, type: true');
  });

  it('as duas travas usam a mesma resposta para "isto é uma venda?"', () => {
    // Duas definições de venda em dois pontos é como o sistema passa a se contradizer sozinho.
    expect((svc.match(/ehVendaDeVerdade\(/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('a trava da data só acorda se o registro for VENDA', () => {
    expect(trecho).toContain('if (!ehVendaDeVerdade(atual)) return;');
  });

  it('e só se a data mudou de verdade', () => {
    // A tela reenvia a mesma data com outra precisão de segundos. Recusar por isso travaria
    // quem só mexeu na observação.
    expect(trecho).toContain('> 60000');
  });
});

describe('apagar venda pergunta QUEM, e não só quando', () => {
  const svc = ler('appointments', 'appointments.service.ts');

  it('a checagem vem antes das travas de caixa', () => {
    const i = svc.indexOf("'acao:venda.excluir'");
    const j = svc.indexOf('CAIXA_FECHADO');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(j);
  });

  it('atendimento clínico puro não passa a exigir permissão', () => {
    // Apagar uma consulta sem valor é trabalho de agenda. A regra só vale para venda.
    const i = svc.indexOf('const ehVenda = ehVendaDeVerdade(appt);');
    const j = svc.indexOf("'acao:venda.excluir'");
    expect(i).toBeGreaterThan(0);
    expect(svc.slice(i, j)).toContain('if (!ehVenda) return;');
  });

  it('o controller manda o usuário, não só o cargo', () => {
    // A matriz resolve o perfil pela PESSOA primeiro. Sem o id, quem recebeu um perfil sob
    // medida seria julgado pelo cargo genérico — e a configuração dela não valeria nada.
    expect(ler('appointments', 'appointments.controller.ts')).toContain('{ role, userId }');
  });
});
