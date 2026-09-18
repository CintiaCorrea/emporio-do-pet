// O NOME DA PÁGINA SAI DO MENU (Cintia, 17/09/2026: "colocar em todas as páginas o nome delas —
// o nome direto ou o nome da aba principal e da sub aba, com os nomes que estão no menu").
//
// Antes, toda tela de ERP sem título próprio mostrava só "ERP" no cabeçalho — a pessoa clicava em
// Aniversários e lia "ERP". Aqui o título vem do MESMO lugar que desenha o menu (PERM_SECTIONS),
// então nome de tela e nome de menu não têm como divergir.
import { PERM_SECTIONS, type PermItem } from "@/lib/permissions";

export type TituloDaPagina = { titulo: string; caminho: string | null };

type Achado = { item: PermItem; pai?: PermItem };

/**
 * POR ENQUANTO, SÓ AS TELAS DE VENDAS (Cintia, 17/09/2026: "muda somente os nomes das abas de
 * venda; depois, conforme formos arrumando as outras, vamos alterando"). Cada grupo entra aqui
 * quando for revisado — assim o nome só muda onde já conferimos.
 */
const GRUPOS_JA_REVISADOS = ["vendas"];

function procurar(caminho: string): Achado | null {
  let melhor: Achado | null = null;
  const considerar = (item: PermItem, pai?: PermItem) => {
    if (!item.key.startsWith("/")) return;
    if (!pai || !GRUPOS_JA_REVISADOS.includes(pai.key)) return;
    const bate = caminho === item.key || caminho.startsWith(item.key + "/");
    if (!bate) return;
    // Ganha a rota mais específica: /dashboard/erp/pets/123 é "Pets", não "ERP".
    if (!melhor || item.key.length > melhor.item.key.length) melhor = { item, pai };
  };
  for (const secao of PERM_SECTIONS) {
    for (const item of secao.itens) {
      for (const filho of item.children || []) considerar(filho, item);
    }
  }
  return melhor;
}

/**
 * O título desta rota e o caminho até ela.
 *  · item solto no menu      → { titulo: "Pets", caminho: null }
 *  · item dentro de um grupo → { titulo: "Recebimentos", caminho: "Vendas › Recebimentos" }
 */
export function tituloDoMenu(pathname: string | null | undefined): TituloDaPagina | null {
  if (!pathname) return null;
  const achado = procurar(pathname);
  if (!achado) return null;
  const { item, pai } = achado as Achado;
  return { titulo: item.label, caminho: pai ? `${pai.label} › ${item.label}` : null };
}
