import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * A TAXA DO CARTÃO SÓ APARECE PARA O ADMINISTRATIVO.
 *
 * Cintia, 16/09/2026: "não quero que as informações sobre o desconto do cartão de crédito
 * apareçam para todos, somente para o adm".
 *
 * Quanto a operadora cobra é condição comercial da clínica. Quem está no balcão precisa de forma,
 * bandeira, parcelas e AUT — a taxa continua calculada e lançada no Financeiro igual; só deixa de
 * ser mostrada. Eram três lugares, e o "líquido" conta como taxa: dele se tira a porcentagem de
 * cabeça.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("onde a taxa do cartão aparece, ela pergunta quem está vendo", () => {
  it("nas formas de pagamento — PDV, Caixa e baixar várias usam este mesmo componente", () => {
    const src = ler("components", "financeiro", "PagamentoFormas.tsx");
    expect(src).toContain('const verTaxa = sessaoPronta && papelEfetivo === "ADMIN";');
    expect(src).toContain("{verTaxa && (() => { const bps = taxaBpsDe(f, cfg);");
    expect(src).toContain("{verTaxa && taxaTotal > 0.001 && (");
  });

  it("no Caixa, a previsão LÍQUIDA das maquininhas", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "caixa", "page.tsx");
    expect(src).toContain("{verTaxa && prevCred && prevCred.totalCentavos > 0 && (");
  });

  it("na devolução — o valor a devolver continua visível, a taxa não", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");
    expect(src).toContain("{verTaxa && pv.forma.taxaPct > 0 ? ` · taxa da operadora");
    expect(src).toContain("{verTaxa && taxaPct > 0 && (");
    // Quem devolve precisa saber QUANTO devolver: o total não pode ficar escondido junto.
    expect(src).toContain("{brl(liquido)}");
  });

  it("vale o papel EFETIVO, para a pré-visualização como Recepção mostrar o que a recepção vê", () => {
    for (const p of [
      ["components", "financeiro", "PagamentoFormas.tsx"],
      ["app", "(user)", "dashboard", "erp", "caixa", "page.tsx"],
      ["app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx"],
    ]) expect(ler(...p)).toContain("const papelEfetivo = useRolePreview().effectiveRole;");
  });

  it("e só depois que a sessão chegou — sem papel, o sistema trata a pessoa como ADMIN", () => {
    // Cintia, 16/09/2026: "ela está aparecendo no caixa da recepção". Enquanto a sessão carrega o
    // papel vem vazio, e lib/ui/role o transforma em ADMIN: a taxa piscava para a recepção.
    for (const p of [
      ["components", "financeiro", "PagamentoFormas.tsx"],
      ["app", "(user)", "dashboard", "erp", "caixa", "page.tsx"],
      ["app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx"],
    ]) {
      const src = ler(...p);
      expect(src).toMatch(/const sessaoPronta = useSession\(\)\.status === ['"]authenticated['"];/);
      expect(src).toMatch(/const verTaxa = sessaoPronta && papelEfetivo === ['"]ADMIN['"];/);
      // Hook dentro de && muda a ordem das chamadas e quebra a tela.
      expect(src).not.toMatch(/&&\s*useRolePreview\(/);
    }
  });
});
