import { readFileSync } from 'fs';
import { join } from 'path';
import { chaveDaSessao, chaveAntiga, padraoDasSessoes, sessaoValida } from './sessoes.regras';

/**
 * VÁRIAS ABAS, VÁRIAS SESSÕES.
 *
 * Cintia, 15/09/2026: "preciso poder usar mais de uma aba, pois trabalhamos com várias linhas
 * dentro do mesmo sistema". E, no mesmo dia: "preciso saber o porquê das coisas não salvarem".
 *
 * O QUE HAVIA: o refresh token morava numa chave por USUÁRIO (`refresh:<userId>`), e cada login
 * sobrescrevia a anterior. Abrir o sistema numa segunda aba, no celular, ou entrar de novo
 * depois de um tempo parado matava a sessão que já estava aberta.
 *
 * E MORRIA EM SILÊNCIO: a tela continuava na frente da pessoa, o pedido saía sem credencial
 * válida, era recusado na porta e não gerava linha de log nenhuma. Foi o que a Dra. Vivian viveu
 * tentando salvar um orçamento — e o que me fez procurar o erro no lugar errado por horas.
 */
describe('várias sessões por pessoa', () => {
  const USER = 'user-vivian';
  const TOKEN_A = 'jwt.da.aba.um';
  const TOKEN_B = 'jwt.da.aba.dois';

  describe('cada sessão tem a sua chave', () => {
    it('dois tokens do mesmo usuário geram chaves diferentes', () => {
      // É isto que faz a segunda aba parar de derrubar a primeira.
      expect(chaveDaSessao(USER, TOKEN_A)).not.toBe(chaveDaSessao(USER, TOKEN_B));
    });

    it('o mesmo token sempre cai na mesma chave', () => {
      expect(chaveDaSessao(USER, TOKEN_A)).toBe(chaveDaSessao(USER, TOKEN_A));
    });

    it('a chave guarda o HASH, não o token', () => {
      // O token é a credencial: escrevê-lo no Redis seria guardar a chave de casa no capacho.
      expect(chaveDaSessao(USER, TOKEN_A)).not.toContain(TOKEN_A);
      expect(chaveDaSessao(USER, TOKEN_A).startsWith(`refresh:${USER}:`)).toBe(true);
    });

    it('o padrão do logout alcança todas as sessões da pessoa', () => {
      expect(chaveDaSessao(USER, TOKEN_A)).toMatch(new RegExp(`^${padraoDasSessoes(USER).replace('*', '')}`));
      expect(chaveDaSessao(USER, TOKEN_B)).toMatch(new RegExp(`^${padraoDasSessoes(USER).replace('*', '')}`));
    });
  });

  describe('quando a sessão vale', () => {
    it('a chave da sessão existe → vale', () => {
      expect(sessaoValida({ existeChaveNova: true, refreshToken: TOKEN_A })).toBe(true);
    });

    it('sessão aberta ANTES desta mudança continua valendo', () => {
      // Ninguém pode ser deslogado por causa de uma atualização do sistema. Quem estava dentro
      // com a chave antiga segue dentro.
      expect(sessaoValida({ existeChaveNova: false, tokenAntigoGuardado: TOKEN_A, refreshToken: TOKEN_A })).toBe(true);
    });

    it('token que NÃO bate com a chave antiga e não tem chave nova → encerrada', () => {
      // É o caso depois de um logout: as chaves foram apagadas de propósito.
      expect(sessaoValida({ existeChaveNova: false, tokenAntigoGuardado: TOKEN_B, refreshToken: TOKEN_A })).toBe(false);
    });

    it('sem registro nenhum, NÃO desloga', () => {
      // Redis limpo (reinício, expiração) não pode virar "todo mundo para fora". A assinatura e
      // a validade do JWT continuam sendo conferidas antes disto.
      expect(sessaoValida({ existeChaveNova: false, tokenAntigoGuardado: null, refreshToken: TOKEN_A })).toBe(true);
    });

    it('Redis fora do ar NÃO desloga', () => {
      // A revogação é um extra sobre o JWT. Derrubar a clínica porque o Redis piscou seria
      // trocar um risco pequeno por uma parada geral.
      expect(sessaoValida({ existeChaveNova: false, tokenAntigoGuardado: TOKEN_B, refreshToken: TOKEN_A, redisFalhou: true })).toBe(true);
    });
  });

  describe('o que o serviço faz com isso', () => {
    const src = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8');

    it('o login grava a chave DA SESSÃO, não a do usuário', () => {
      expect(src).toContain('chaveDaSessao(user.id, refreshToken)');
      expect(src).not.toMatch(/set\(\s*`refresh:\$\{user\.id\}`/);
    });

    it('o logout encerra TODAS as sessões', () => {
      // Com várias abas abertas, sair numa e continuar logada na outra seria pior do que não
      // ter botão de sair.
      expect(src).toContain('delByPattern(padraoDasSessoes(userId))');
      expect(src).toContain('del(chaveAntiga(userId))');
    });
  });

  describe('a tela diz que a sessão caiu', () => {
    it('o proxy traduz 401 em português, e uma vez só', () => {
      // Qualquer rota pode devolver 401; deixar cada tela inventar o seu texto daria dez
      // versões do mesmo aviso — e foi a AUSÊNCIA de aviso que custou a tarde da Dra. Vivian.
      const proxy = readFileSync(join(__dirname, '..', '..', '..', '..', 'vet-crm', 'lib', 'backend-proxy.ts'), 'utf8');
      expect(proxy).toContain('upstreamResponse.status === 401');
      expect(proxy).toContain('Sua sessão expirou');
      expect(proxy).toContain('sessaoExpirada: true');
    });
  });
});
