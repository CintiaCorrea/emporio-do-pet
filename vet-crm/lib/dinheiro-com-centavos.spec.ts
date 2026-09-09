import { describe, it, expect } from "vitest";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";
import { formatBRL } from "@/lib/format";

// 🛡️ DINHEIRO SEMPRE COM DOIS DÍGITOS DEPOIS DA VÍRGULA.
//
// A Cintia, em 08/09/2026: "tudo o que for valor ter como padrão dois dígitos depois da vírgula".
//
// Existiam DEZESSEIS formatadores de dinheiro copiados pelo sistema, e seis deles cortavam os
// centavos por conta própria. Um total de R$ 1.438,06 aparecia como "R$ 1.438" na ficha do pet,
// no perfil do cliente, na Produtividade, nos gráficos e no inbox. Numa clínica, centavo
// escondido é diferença de caixa que ninguém consegue explicar depois.
//
// Nada disso quebra o build nem aparece no tsc: é a tela arredondando em silêncio. Por isso a
// trava lê os arquivos.

// A VARREDURA E COMPARTILHADA (lib/testes/varreduraDoProjeto): esta trava e a do fuso, em
// lib/datas.test.ts, nasceram no mesmo dia em abas diferentes e as duas liam a arvore inteira.
// Juntas, disputavam o disco e uma estourava o tempo da outra.
const fontes = codigoDoProjeto().map(({ caminho, src }) => ({ p: caminho, src }));

describe("nenhuma tela corta os centavos", () => {
  // 30s: le o disco, igual a trava do fuso em lib/datas.test.ts.
  it("não existe formatador de moeda com maximumFractionDigits: 0", { timeout: 30000 }, () => {
    const culpados = fontes
      .filter(({ src }) => /currency[\s\S]{0,120}maximumFractionDigits:\s*0/.test(src)
        || /maximumFractionDigits:\s*0[\s\S]{0,120}currency/.test(src))
      .map(({ p }) => p);
    expect(culpados).toEqual([]);
  });

  it("não existe 'R$' montado com toFixed(0)", { timeout: 30000 }, () => {
    // `R$ ${Number(v).toFixed(0)}` era o formato do perfil do pet e do cliente.
    const culpados = fontes
      .filter(({ src }) => /R\$[^`"']{0,20}toFixed\(0\)/.test(src))
      .map(({ p }) => p);
    expect(culpados).toEqual([]);
  });
});

describe("o formatador central", () => {
  it("mostra os centavos, inclusive quando são zero", () => {
    expect(formatBRL(1438.06)).toMatch(/1\.438,06/);
    expect(formatBRL(170)).toMatch(/170,00/);
    expect(formatBRL(0)).toMatch(/0,00/);
  });

  it("arredonda para o centavo, não para o real", () => {
    expect(formatBRL(89.055)).toMatch(/89,0[56]/);
  });

  it("aceita o número escrito em português", () => {
    expect(formatBRL("1.234,56")).toMatch(/1\.234,56/);
  });

  it("valor sujo vale zero em vez de virar NaN", () => {
    expect(formatBRL(null)).toMatch(/0,00/);
    expect(formatBRL("abc")).toMatch(/0,00/);
  });
});
