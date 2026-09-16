import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { excluirVenda, apagarAtendimento, semPrefixo } from "./excluirVenda";

/**
 * A regra de excluir venda saiu da tela "Todas as vendas" em 12/09/2026, quando a Consulta de
 * vendas passou a ser a porta unica e precisou excluir tambem. Duas copias divergiriam — e e
 * por esse caminho que a clinica ja perdeu R$ 40 mil de historico (ver a trava de 08/09/2026
 * em appointments.service.remove).
 *
 * O servidor continua sendo quem decide. Estes testes guardam o que a tela promete: nao
 * oferecer o que vai dar erro, pedir o segundo aviso quando ha gravacao de audio, e nunca
 * apagar sem a pessoa confirmar.
 */
const venda = { id: "v1", numeroVenda: 1042, tutor: "Monique", pet: "Bob", valor: 320, pago: 0 };
const simAoTudo = () => true;
const naoAoTudo = () => false;

let fetchMock: any;
beforeEach(() => { fetchMock = vi.fn(); (globalThis as any).fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

const ok = () => ({ ok: true, json: async () => ({}) });
const erro = (message: string) => ({ ok: false, json: async () => ({ message }) });

describe("excluirVenda", () => {
  it("quem nao e adm nao apaga venda que ja tem recebimento — e nem chega no servidor", async () => {
    const r = await excluirVenda({ ...venda, pago: 100 }, { isAdmin: false, confirmar: simAoTudo });
    expect(r.ok).toBe(false);
    expect((r as any).erro).toMatch(/já tem recebimento/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adm apaga venda com recebimento (o servidor e' quem barra, se for o caso)", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    const r = await excluirVenda({ ...venda, pago: 100 }, { isAdmin: true, confirmar: simAoTudo });
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sem confirmar, nao apaga nada", async () => {
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: naoAoTudo });
    expect(r.ok).toBe(false);
    expect((r as any).cancelado).toBe(true);
    expect((r as any).erro).toBeUndefined();   // desistir nao e erro: a tela nao avisa nada
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a confirmacao diz o numero, o cliente, o pet e o valor", async () => {
    const vistas: string[] = [];
    fetchMock.mockResolvedValueOnce(ok());
    await excluirVenda(venda, { isAdmin: true, confirmar: (m) => { vistas.push(m); return true; } });
    expect(vistas[0]).toContain("#1042");
    expect(vistas[0]).toContain("Monique");
    expect(vistas[0]).toContain("Bob");
    expect(vistas[0]).toMatch(/R\$\s?320,00/);
    expect(vistas[0]).toMatch(/não dá pra desfazer/i);
  });

  it("gravacao de audio: pede um SEGUNDO aviso antes de apagar junto", async () => {
    fetchMock
      .mockResolvedValueOnce(erro("TEM_GRAVACAO: esse atendimento tem audio"))
      .mockResolvedValueOnce(ok());
    const vistas: string[] = [];
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: (m) => { vistas.push(m); return true; } });
    expect(r.ok).toBe(true);
    expect(vistas).toHaveLength(2);
    expect(vistas[1]).toMatch(/gravação de áudio/i);
    // a segunda chamada e' a que leva o force
    expect(String(fetchMock.mock.calls[1][0])).toContain("force=true");
  });

  it("recusar o segundo aviso deixa a venda E a gravacao no lugar", async () => {
    fetchMock.mockResolvedValueOnce(erro("TEM_GRAVACAO: tem audio"));
    let n = 0;
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: () => (++n === 1) });
    expect((r as any).cancelado).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);   // nao tentou o force
  });

  it("nao adm com gravacao NAO ganha a opcao do force", async () => {
    fetchMock.mockResolvedValueOnce(erro("TEM_GRAVACAO: tem audio"));
    const r = await excluirVenda(venda, { isAdmin: false, confirmar: simAoTudo });
    expect(r.ok).toBe(false);
    expect((r as any).erro).toBe("tem audio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("o codigo do servidor nao aparece pra quem le", async () => {
    fetchMock.mockResolvedValueOnce(erro("CAIXA_FECHADO: venda de caixa fechado so o adm exclui"));
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: simAoTudo });
    expect((r as any).erro).toBe("venda de caixa fechado so o adm exclui");
  });

  it("rede caida vira mensagem, nao tela branca", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: simAoTudo });
    expect(r.ok).toBe(false);
    expect((r as any).erro).toBe("Failed to fetch");
  });

  it("semPrefixo so tira o codigo, nao mexe no resto", () => {
    expect(semPrefixo("TEM_GRAVACAO: tem audio")).toBe("tem audio");
    expect(semPrefixo("Não consegui excluir.")).toBe("Não consegui excluir.");
    expect(semPrefixo("")).toBe("");
  });
});

// O CASO DA #1177 (16/09/2026): apagada pelo administrativo numa sequência de oito exclusões,
// levou junto R$ 468,35 recebidos no caixa nº 11 — sem nenhum aviso.
describe("dinheiro recebido não sai sem aviso", () => {
  const AVISO = "TEM_RECEBIMENTO: Esta venda tem R$ 468,35 recebido (R$ 468,35 no caixa nº 11 de Maria Gabriela 10/09). Apagar a venda apaga o recebimento junto, e o caixa fica R$ 468,35 menor. Apagar mesmo assim?";

  it("mostra a frase do servidor, sem o código, e só repete com comRecebimento se a pessoa aceitar", async () => {
    fetchMock.mockResolvedValueOnce(erro(AVISO)).mockResolvedValueOnce(ok());
    const perguntas: string[] = [];
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: (m) => { perguntas.push(m); return true; } });
    expect(r.ok).toBe(true);
    expect(perguntas[1]).toContain("R$ 468,35 no caixa nº 11 de Maria Gabriela");
    expect(perguntas[1]).not.toContain("TEM_RECEBIMENTO");
    expect(String(fetchMock.mock.calls[1][0])).toContain("comRecebimento=true");
  });

  it("recusar deixa a venda e o dinheiro no lugar", async () => {
    fetchMock.mockResolvedValueOnce(erro(AVISO));
    let n = 0;
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: () => ++n === 1 });
    expect(r.ok).toBe(false);
    expect((r as any).cancelado).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gravação E dinheiro: pergunta as duas coisas e manda os dois 'sim'", async () => {
    fetchMock
      .mockResolvedValueOnce(erro("TEM_GRAVACAO: tem audio"))
      .mockResolvedValueOnce(erro(AVISO))
      .mockResolvedValueOnce(ok());
    const r = await apagarAtendimento("v1", { confirmar: simAoTudo });
    expect(r.ok).toBe(true);
    const ultima = String(fetchMock.mock.calls[2][0]);
    expect(ultima).toContain("force=true");
    expect(ultima).toContain("comRecebimento=true");
  });

  it("não fica em laço se o servidor insistir", async () => {
    fetchMock.mockResolvedValue(erro(AVISO));
    const r = await apagarAtendimento("v1", { confirmar: simAoTudo });
    expect(r.ok).toBe(false);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3);
  });
});

// 🛡️ Um caminho só para apagar atendimento. Eram três cópias, cada uma entendendo o servidor de
// um jeito (a da ficha do pet tratava qualquer recusa como gravação de áudio).
describe("ninguém volta a copiar a exclusão", () => {
  it("só lib/vendas/excluirVenda trata os avisos do servidor", async () => {
    const { codigoDoProjeto } = await import("@/lib/testes/varreduraDoProjeto");
    const copias = codigoDoProjeto()
      .filter((a) => a.caminho !== "lib/vendas/excluirVenda.ts")
      .filter((a) => /TEM_GRAVACAO|TEM_RECEBIMENTO/.test(a.src))
      .map((a) => a.caminho);
    expect(copias).toEqual([]);
  });
}, 30000);

