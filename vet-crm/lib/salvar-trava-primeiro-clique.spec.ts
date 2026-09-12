import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cintia, 12/09/2026: "pode travar o salvamento no primeiro clique e talvez ao inves de dizer
 * que deu erro, informar que ja esta salvo."
 *
 * O boletim da fisio salvava duas vezes o mesmo conteudo e a segunda gravacao batia no indice
 * unico (lista, valor) do banco — a tela dizia "Erro ao salvar boletim" e a pessoa achava que
 * tinha perdido o trabalho. Duas travas:
 *   1. ref sincrona (nao estado): `saving` so vira true no render seguinte, entao dois cliques
 *      no mesmo instante leriam false os dois;
 *   2. duplicidade nao e' erro — e' "ja esta salvo".
 */
const arquivo = readFileSync(join(__dirname, "..", "components", "pets", "BoletimModal.tsx"), "utf8");

describe("boletim: trava no primeiro clique", () => {
  it("usa ref sincrona, nao apenas o estado saving", () => {
    expect(arquivo).toMatch(/salvandoRef\s*=\s*useRef\(false\)/);
    expect(arquivo).toMatch(/if \(salvandoRef\.current\) return true/);
  });

  it("os dois caminhos de salvar passam pela trava", () => {
    const salvar = arquivo.slice(arquivo.indexOf("async function handleSalvar()"));
    expect(salvar).toMatch(/travarPrimeiroClique\(\)/);
    const enviar = arquivo.slice(arquivo.indexOf("async function handleSalvarEnviar()"));
    expect(enviar).toMatch(/salvandoRef\.current|travarPrimeiroClique\(\)/);
  });

  it("libera a trava em todo retorno, senao o botao fica morto", () => {
    // nenhum setSaving(false) solto: tem que passar por liberarTrava, que zera a ref tambem
    const corpo = arquivo.replace(/function liberarTrava\(\)[^\n]*\n/, "");
    expect(corpo).not.toMatch(/setSaving\(false\)/);
    expect(arquivo).toMatch(/function liberarTrava\(\) \{ salvandoRef\.current = false; setSaving\(false\); \}/);
  });

  it("cancelar o confirm do envio NAO deixa a trava presa", () => {
    const enviar = arquivo.slice(arquivo.indexOf("async function handleSalvarEnviar()"));
    const posConfirm = enviar.indexOf("confirm(");
    const posTrava = enviar.indexOf("travarPrimeiroClique()");
    expect(posConfirm).toBeGreaterThan(0);
    expect(posTrava).toBeGreaterThan(posConfirm);   // trava depois das guardas de saida
  });

  it("duplicidade e' avisada como 'ja esta salvo', nao como erro", () => {
    const bloco = arquivo.slice(arquivo.indexOf("unique|duplicate|lista_valor"));
    const ate = bloco.slice(0, bloco.indexOf("}"));
    expect(ate).toMatch(/toast\.success/);
    expect(ate).not.toMatch(/toast\.error/);
  });
});
