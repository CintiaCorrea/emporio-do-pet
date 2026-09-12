import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cintia, 12/09/2026 (Fig 2): "a unica coisa que preciso e que essa parte apareca somente a
 * informacoes do cliente solicitado, nao quero que todas as informacoes da empresa fiquem
 * disponivel para todos os clientes."
 *
 * A Consulta de vendas abria mostrando faturamento, desconto e ticket medio da clinica — e e
 * essa a tela que fica virada pro balcao. Tres estados agora:
 *   1. pesquisa devolveu UM cliente  -> o extrato dele, e nada da clinica;
 *   2. sem cliente + administrativo  -> os sete cartoes atras do olhinho, que abre escondido;
 *   3. sem cliente + outros perfis   -> nenhum valor da clinica.
 *
 * Esta varredura existe porque um proximo ajuste no cabecalho pode desfazer isso sem ninguem
 * perceber: os cartoes voltariam a aparecer soltos e o vazamento volta calado.
 */
const tela = readFileSync(
  join(__dirname, "..", "app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx"),
  "utf8",
);

/** O trecho entre o comeco do cabecalho e o aviso do credito de cliente, que vem depois. */
function blocoDoCabecalho(): string {
  const ini = tela.indexOf("O CABEÇALHO, EM TRÊS ESTADOS");
  expect(ini, "o bloco do cabecalho perdeu o comentario que o identifica").toBeGreaterThan(0);
  const fim = tela.indexOf("crédito de cliente", ini);
  return tela.slice(ini, fim > ini ? fim : undefined);
}

describe("consulta de vendas: cabecalho por cliente", () => {
  it("reconhece o cliente pela propria pesquisa, sem campo novo", () => {
    // Um clienteId so nos resultados = a consulta e de um cliente. Sem seletor extra.
    expect(tela).toMatch(/const clienteUnico = useMemo/);
    expect(tela).toMatch(/if \(ids\.size !== 1\) return null/);
  });

  it("os sete cartoes da clinica NAO aparecem soltos — dependem de adm e do olhinho", () => {
    const bloco = blocoDoCabecalho();
    // "Ticket médio" e "Venda bruta" so existem dentro do ramo isAdmin && verTotaisClinica.
    expect(bloco).toMatch(/isAdmin && verTotaisClinica/);
    const antesDoRamo = bloco.slice(0, bloco.indexOf("isAdmin && verTotaisClinica"));
    expect(antesDoRamo).not.toMatch(/Ticket médio|Venda bruta|Venda líquida/);
  });

  it("o olhinho abre ESCONDIDO", () => {
    expect(tela).toMatch(/const \[verTotaisClinica, setVerTotaisClinica\] = useState\(false\)/);
  });

  it("o olhinho e' so do administrativo e so quando nao ha cliente na tela", () => {
    expect(tela).toMatch(/\{isAdmin && !clienteUnico && \(/);
  });

  it("o cartao em destaque e' o saldo de TODOS os tempos, nao o do periodo", () => {
    const bloco = blocoDoCabecalho();
    // saldos[] vem de /api/caixa/vendas?abertas=true (todos os dias); resumo.cards.aberto e' do periodo.
    expect(bloco).toMatch(/saldos\[clienteUnico\.id\][^\n]*destaque/);
    const doCliente = bloco.slice(0, bloco.indexOf("isAdmin && verTotaisClinica"));
    expect(doCliente).not.toMatch(/resumo\.cards\.aberto/);
  });

  it("Totais e Resumo (painel da clinica) sao so do administrativo", () => {
    // Cintia, 12/09/2026: "so vendas, e orcamento para o restante da equipe — somente adm
    // ve tudo". Os dois modos consolidam a clinica inteira; Vendas e Orcamentos nao.
    expect(tela).toMatch(/\{isAdmin && <option value="RESUMO">/);
    expect(tela).toMatch(/\{isAdmin && <option value="TOTAIS">/);
    expect(tela).toMatch(/<option value="VENDAS">/);
    expect(tela).toMatch(/<option value="ORCAMENTOS">/);
    // e quem nao e' adm nao fica preso num deles por link ou troca de perfil
    expect(tela).toMatch(/if \(!isAdmin && \(modo === 'RESUMO' \|\| modo === 'TOTAIS'\)\) setModo\('VENDAS'\)/);
  });

  it("situacao e' baixado ou em aberto — nao existe outra", () => {
    // Cintia, 12/09/2026: "situacao e baixado e aberto (nao existe outra situacao)".
    // "Orcamento" nao e' situacao de pagamento; tem aba propria.
    const sel = tela.slice(tela.indexOf("value={sitPg}"), tela.indexOf("value={sitPg}") + 420);
    expect(sel).toMatch(/<option value="">Situação: todas<\/option>/);
    expect(sel).toMatch(/<option value="BAIXADO">Baixado<\/option>/);
    expect(sel).toMatch(/<option value="ABERTO">Em aberto<\/option>/);
    expect(sel).not.toMatch(/Orçamento</);
  });

  it("baixado sai do SALDO, nao da etiqueta de status", () => {
    // Venda parcialmente recebida ainda deve. Com status COMPLETED ela passava por baixada.
    expect(tela).toMatch(/sitPg === 'BAIXADO' \? v\.situacao === 'PAGA' : v\.situacao !== 'PAGA'/);
    expect(tela).not.toMatch(/p\.set\('status'/);
  });

  it("papel, PDF e WhatsApp do extrato saem da mesma fonte das outras telas", () => {
    // Duas contas parecidas = a clinica se contradizendo na frente do cliente.
    expect(tela).toMatch(/from '@\/lib\/textoDoRelatorioVendas'/);
    expect(tela).toMatch(/from '@\/lib\/documentos\/relatorio-vendas-pdf'/);
    expect(tela).toMatch(/<EnviarPorWhatsApp/);
  });
});
