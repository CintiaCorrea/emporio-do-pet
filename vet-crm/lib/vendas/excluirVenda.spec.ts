import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { excluirVenda, semPrefixo } from "./excluirVenda";

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
    fetchMock.mockResolvedValueOnce(erro("TEM_RECEBIMENTO: apague o recebimento no caixa"));
    const r = await excluirVenda(venda, { isAdmin: true, confirmar: simAoTudo });
    expect((r as any).erro).toBe("apague o recebimento no caixa");
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
