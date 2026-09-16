import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { itemParaVenda } from "./catalogoVendavel";

/**
 * TODA LINHA VENDIDA SABE DE QUE ITEM DO CATÁLOGO ELA É.
 *
 * Cintia, 15/09/2026, olhando "Produto × serviço" com 309 itens em "Não classificado":
 * "na verdade na internação era para estar puxando da aba de produtos/serviços, não sei porque
 * isso não aconteceu... isso depois dos pets e dos clientes é a base de tudo, se não estiver
 * construído direito só pode dar merda".
 *
 * ELA ESTAVA CERTA: a tela PUXAVA do catálogo. O que se perdia era o vínculo na hora de GRAVAR.
 *
 * O ESTRAGO, medido em produção em setembro/2026: de 317 linhas de venda, 260 (R$ 37.991,52)
 * sem nenhum vínculo — nem catálogo novo, nem antigo. Sem vínculo não há tipo nem grupo, então
 * elas somem de todo relatório por produto/serviço. E como o mesmo item era vendido ora ligado
 * ora solto, o relatório ainda marcava "nome repetido" em cima de cadastro que estava certo.
 *
 * ERAM QUATRO PONTOS, todos com a mesma forma: o valor estava na mão e não era copiado.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("o núcleo do envio", () => {
  it("leva o id do catálogo mesmo sem a marca _novo", () => {
    // `_novo` é marca de TELA: some assim que a linha é gravada numa lista e lida de volta —
    // e a conta da internação faz exatamente isso. O id sobrevivia e era descartado mesmo assim.
    const r = itemParaVenda({ descricao: "Fluidoterapia", valorUnitario: 80, catalogoItemId: "cat123" });
    expect(r.catalogoItemId).toBe("cat123");
  });

  it("continua levando quando a marca existe", () => {
    const r = itemParaVenda({ descricao: "Hemograma", valorUnitario: 60, _novo: true, catalogoItemId: "cat9", _exame: true });
    expect(r.catalogoItemId).toBe("cat9");
    expect(r.tipoItem).toBe("EXAME");
  });

  it("item digitado à mão continua passando — a tela não trava quem não achou no catálogo", () => {
    // Bloquear texto livre resolveria o relatório e pararia o balcão. O objetivo é não PERDER
    // o vínculo quando ele existe, não proibir a linha avulsa.
    const r = itemParaVenda({ descricao: "Ajuste", valorUnitario: 10 });
    expect(r.descricao).toBe("Ajuste");
    expect(r.catalogoItemId).toBeUndefined();
  });
});

describe("a conta da internação grava o vínculo", () => {
  const src = ler("app", "(user)", "dashboard", "erp", "internacoes", "[id]", "page.tsx");

  it("no item avulso", () => {
    expect(src).toContain("...(itemForm.catalogoItemId ? { catalogoItemId: itemForm.catalogoItemId } : {})");
  });

  it("na edição do dia — junto do fornecedor e do exame, que também se perdiam", () => {
    expect(src).toContain("...(l.catalogoItemId ? { catalogoItemId: l.catalogoItemId } : {})");
    expect(src).toContain("...(l.fornecedorId ? { fornecedorId: l.fornecedorId } : {})");
  });

  it("na cobrança automática da aplicação de medicação", () => {
    expect(src).toContain("...(slot.p.cobrarCatalogoItemId ? { catalogoItemId: slot.p.cobrarCatalogoItemId } : {})");
  });

  it("e a prescrição guarda de que item do catálogo ela cobra", () => {
    // O seletor já mostrava o catálogo novo; o que se guardava era um id tratado como se fosse
    // do catálogo antigo. Quem resolve o vínculo passa a ser o núcleo, não a tela.
    expect(src).toContain("cobrarCatalogoItemId: l.catalogoItemId");
    expect(src).toContain("const l = linhaDoItem(item, pesoPet);");
  });
});

describe("editar um atendimento não apaga o vínculo dos itens", () => {
  it("a ficha do pet reenvia o catalogoItemId que recebeu", () => {
    // O modal de editar já LIA `catalogoItemId` do item existente para montar a tela, e não o
    // devolvia ao salvar: abrir e salvar sem mudar nada desclassificava a venda inteira.
    const src = ler("app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx");
    expect(src).toContain("...(it.catalogoItemId ? { catalogoItemId: it.catalogoItemId } : {})");
  });
});

describe("o servidor guarda o que recebe", () => {
  it("nas duas gravações de itens de venda", () => {
    const svc = readFileSync(join(RAIZ, "..", "backend", "src", "modules", "appointments", "appointments.service.ts"), "utf8");
    expect((svc.match(/catalogoItemId: it\.catalogoItemId \?\? null/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
