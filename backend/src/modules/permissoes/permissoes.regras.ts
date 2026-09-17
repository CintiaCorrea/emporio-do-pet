// ── A MATRIZ DE PERMISSÕES, AGORA DO LADO DO SERVIDOR ─────────────────────────────────────
//
// Cintia, 15/09/2026, com os prints do Perfil de acesso do SimplesVet: "todas estão liberadas
// para o adm, essa mesma lista aparece para os outros perfis e eu determino quais ficarão
// disponíveis para cada perfil". E antes: "precisamos de mais liberdade para edições mesmo que
// isso tenha que ser autorizado por perfil".
//
// O QUE HAVIA: uma matriz por perfil, guardada em `lista_itens`, lida SÓ pelo navegador. Ela
// escondia botão. Para agenda ou relatório isso resolve; para dinheiro, botão escondido não é
// trava — é sugestão. Quem soubesse o endereço da API fazia a operação assim mesmo.
//
// Este arquivo é a mesma regra que a tela usa, escrita onde ela vale: o servidor.

export type Nivel = 'OCULTO' | 'VISUALIZA' | 'EDITA';

/** Matriz de um perfil: chave da tela ou da ação → nível. */
export type Matriz = Record<string, Nivel>;

/**
 * AS AÇÕES DE DINHEIRO NASCEM FECHADAS.
 *
 * O padrão do resto do sistema é permissivo: tela sem configuração fica visível, porque esconder
 * uma tela por engano só atrapalha. Aqui é o contrário — liberar por engano estorna recebimento,
 * apaga venda e mexe em caixa. O que ninguém decidiu, ninguém pode.
 */
export const ACOES_DINHEIRO = [
  'acao:venda.editar_recebida',
  'acao:venda.reabrir',
  'acao:venda.excluir',
  'acao:venda.alterar_data',
  'acao:caixa.reabrir',
  'acao:caixa.lancar_em_caixa_alheio',
] as const;

export type AcaoDinheiro = (typeof ACOES_DINHEIRO)[number];

const ehAdmin = (papel?: string | null) => String(papel || '').trim().toUpperCase() === 'ADMIN';

/**
 * O administrativo pode tudo, SEMPRE — e isto não é preguiça, é trava anti-tranca.
 *
 * A matriz é editada pela própria Cintia, na tela dela. Se uma configuração errada pudesse tirar
 * o acesso do administrativo, ela se trancaria para fora do próprio sistema, e a única saída
 * seria mexer no banco. O mesmo motivo pelo qual a tela de Permissões nunca entra na matriz.
 */
export function podeAcao(matriz: Matriz | null | undefined, chave: string, papel?: string | null): boolean {
  if (ehAdmin(papel)) return true;
  const nivel = matriz?.[chave];
  if (nivel) return nivel === 'EDITA';
  // Sem nada configurado: dinheiro é fechado, o resto segue o permissivo do sistema.
  return !(ACOES_DINHEIRO as readonly string[]).includes(chave);
}

/**
 * ESTA AÇÃO FOI FECHADA DE PROPÓSITO?
 *
 * `podeAcao` responde "pode ou não pode", e para dinheiro o silêncio conta como NÃO. Existe um
 * caso em que a diferença entre "ninguém decidiu" e "a Cintia decidiu que não" importa: o
 * DESCONTO. Desconto é operação de balcão, acontece o dia inteiro, e já tem uma trava própria
 * (limite em % na configuração de vendas, com liberação de gerente por e-mail e senha). Se o
 * silêncio da matriz virasse bloqueio ali, a recepção pararia de conseguir dar 5% num banho na
 * manhã seguinte — o oposto do "tá tudo muito engessado" que ela pediu para resolver.
 *
 * Então a ação de desconto lê os três níveis da matriz como três coisas diferentes:
 *   EDITA     → concede sem passar pelo limite (equivale a gerente);
 *   nada      → segue o limite de hoje, como sempre foi;
 *   OCULTO    → não dá desconto nenhum, nem dentro do limite. Isto aqui.
 *   VISUALIZA
 */
export function acaoNegada(matriz: Matriz | null | undefined, chave: string, papel?: string | null): boolean {
  if (ehAdmin(papel)) return false;   // a mesma trava anti-tranca de `podeAcao`
  const nivel = matriz?.[chave];
  return nivel === 'OCULTO' || nivel === 'VISUALIZA';
}

/** Cargo (Role) → nome do perfil. Espelha `roleToPerfil` da tela. */
export function papelParaPerfil(papel?: string | null): string {
  const r = String(papel || '').toUpperCase();
  if (r === 'ADMIN') return 'Admin';
  if (r === 'VETERINARIAN' || r === 'VET') return 'Veterinário';
  if (r === 'RECEPTIONIST' || r === 'RECEPCAO') return 'Recepção';
  return 'Admin';   // fallback seguro: não esconde nada de quem o sistema não classificou
}

/**
 * O perfil de um usuário: o atribuído a ele na tela, ou o do cargo.
 *
 * A mesma ordem da tela (`resolvePerfil`), menos o "preview de cargo" — aquilo existe para a
 * Cintia VER o sistema como outra pessoa, e é coisa de tela. Do lado do servidor o que vale é
 * quem a pessoa é de verdade: fingir ser recepção não pode tirar o poder de quem é adm, nem
 * dar poder a quem não é.
 */
export function perfilDoUsuario(
  userId: string | null | undefined,
  papel: string | null | undefined,
  mapaUsuarioPerfil: Record<string, string> | null | undefined,
): string {
  const id = String(userId || '').trim();
  if (id && mapaUsuarioPerfil?.[id]) return mapaUsuarioPerfil[id];
  return papelParaPerfil(papel);
}
