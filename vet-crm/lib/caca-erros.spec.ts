import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * O SISTEMA CONTA O QUE QUEBROU NA TELA DOS OUTROS.
 *
 * Cintia, 15/09/2026, no fim de uma tarde perdida: "às vezes, como não acontecem comigo, não sei
 * nem como nem porque estão acontecendo".
 *
 * O caso que motivou: a Dra. Vivian não conseguia salvar um orçamento. O servidor não registrava
 * nada — o pedido morria antes de chegar, porque a sessão tinha sido derrubada por uma segunda
 * aba — e eu passei horas procurando recusa de permissão e de validação que não existiam. O
 * sistema sabia do erro. Só não tinha onde contar.
 *
 * AS TRÊS REGRAS QUE ESTA PEÇA NUNCA PODE QUEBRAR, e é isto que os testes prendem:
 *   1. nunca derrubar a tela de quem está trabalhando;
 *   2. nunca entrar em laço reportando a própria falha;
 *   3. nunca inundar a lista com o mesmo erro.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");
const avisar = ler("lib", "avisarErro.ts");

describe("o caça-erros não pode virar o problema", () => {
  it("falha em silêncio — relatório de erro que causa erro é piada pronta", () => {
    expect(avisar).toMatch(/try\s*\{[\s\S]*\}\s*catch\s*\{/);
    expect(avisar).toContain("keepalive: true");
  });

  it("o envio que falha NÃO reporta a própria falha", () => {
    // Sem isto, uma rede instável viraria um laço: falha ao enviar → reporta → falha ao enviar.
    expect(avisar).toMatch(/\.catch\(\(\) => \{ \/\* regra 2/);
  });

  it("o mesmo erro, na mesma tela, é enviado uma vez a cada 5 minutos", () => {
    // Um erro que dispara a cada tecla digitada encheria a lista e esconderia o que é raro —
    // que é exatamente para o que a lista existe.
    expect(avisar).toContain("INTERVALO_MS = 5 * 60 * 1000");
    expect(avisar).toContain("const chave = `${tela}|${msg}`");
  });

  it("ignora o ruído conhecido do navegador", () => {
    expect(avisar).toContain("ResizeObserver loop");
  });

  it("não tenta rodar no servidor", () => {
    expect(avisar).toContain("typeof window === 'undefined'");
  });
});

describe("onde o erro é capturado", () => {
  it("em TODAS as telas logadas, pelo layout", () => {
    // Capturar só em algumas telas é pior do que não capturar: a ausência vira "lá não dá erro".
    const layout = ler("app", "(user)", "layout.tsx");
    expect(layout).toContain("CacaErros");
  });

  it("e na tela de erro, que é o caso mais grave", () => {
    // A tela inteira caiu — e era justamente o que não deixava rastro nenhum.
    const erro = ler("app", "error.tsx");
    expect(erro).toContain("avisarErro(error");
  });
});

describe("a lista que ela vai olhar", () => {
  it("existe", () => {
    expect(existsSync(join(RAIZ, "app", "(user)", "dashboard", "erros", "page.tsx"))).toBe(true);
  });

  it("agrupa por PESSOA — é a pergunta dela: com quem está acontecendo?", () => {
    const pg = ler("app", "(user)", "dashboard", "erros", "page.tsx");
    expect(pg).toContain("porPessoa");
  });

  it("mostra o nome da tela, não só o endereço", () => {
    // "/dashboard/erp/pets/abc-123" não diz nada a quem está lendo; "Ficha do pet" diz.
    const pg = ler("app", "(user)", "dashboard", "erros", "page.tsx");
    expect(pg).toContain("nomeDaTela");
  });

  it("NÃO tem botão de apagar nem de resolver", () => {
    // O registro some sozinho em 14 dias. Um erro que alguém "resolve" com um clique some sem
    // ter sido entendido — e volta.
    // A checagem é pelo que a tela FAZ, não pela palavra: o comentário de topo explica por que
    // esses botões não existem, e um teste que procura a palavra reprovaria a própria explicação.
    const pg = ler("app", "(user)", "dashboard", "erros", "page.tsx");
    expect(pg).not.toMatch(/method:\s*["']DELETE["']/);
    expect(pg).not.toMatch(/method:\s*["']PATCH["']/);
    expect(pg).not.toMatch(/onClick=\{[^}]*(apagar|resolver)/i);
  });

  it("diz o que fazer quando está vazia", () => {
    // Lista vazia pode significar "nada quebrou" ou "o registro não está funcionando". A tela
    // precisa dizer qual das duas, senão vira falsa tranquilidade.
    const pg = ler("app", "(user)", "dashboard", "erros", "page.tsx");
    expect(pg).toContain("não chegou a virar erro de tela");
  });
});

describe("o registro tem prazo", () => {
  it("14 dias, e o expurgo pega carona na rotina que já roda de madrugada", () => {
    const svc = readFileSync(join(RAIZ, "..", "backend", "src", "modules", "erros-tela", "erros-tela.service.ts"), "utf8");
    expect(svc).toContain("DIAS_GUARDADOS = 14");
    const sched = readFileSync(join(RAIZ, "..", "backend", "src", "modules", "exames", "exames.scheduler.ts"), "utf8");
    expect(sched).toContain("this.errosTela.expurgar()");
  });

  it("o servidor junta os repetidos em vez de empilhar linhas", () => {
    const svc = readFileSync(join(RAIZ, "..", "backend", "src", "modules", "erros-tela", "erros-tela.service.ts"), "utf8");
    expect(svc).toContain("vezes: Number(d.vezes || 1) + 1");
  });

  it("quem registrou vem do TOKEN, não do corpo da requisição", () => {
    // O navegador não escolhe em nome de quem um erro é registrado.
    const ctrl = readFileSync(join(RAIZ, "..", "backend", "src", "modules", "erros-tela", "erros-tela.controller.ts"), "utf8");
    expect(ctrl).toContain("@CurrentUser('id')");
    expect(ctrl).toContain("{ ...body, userId, userNome }");
  });
});
