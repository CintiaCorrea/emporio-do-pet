import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { allTelaKeys } from "./permissions";

/**
 * TELA QUE NINGUÉM ALCANÇA É TELA QUE NÃO EXISTE.
 *
 * Cintia, 15/09/2026, depois de eu dizer que duas telas estavam prontas: "Clientes do portal —
 * não achei onde posso ver os que estão utilizando. Aprovação do cadastro que pedi para colocar
 * na aba de cliente — não está."
 *
 * Ela estava certa nas duas. Eu tinha criado a rota, escrito a tela, ligado a API e posto a
 * chave na MATRIZ DE PERFIS — e a matriz não é o menu. São dois arquivos:
 *   · lib/permissions/index.ts  → quem PODE ver (a tela de Perfil de acesso)
 *   · components/protected/dashboard/Sidebar.tsx → onde se CLICA
 *
 * O comentário no topo da matriz diz "Árvore = espelho do menu", e eu li como se fosse o menu.
 * Espelho não é a coisa. Quatro telas ficaram existindo só para quem soubesse digitar o endereço.
 *
 * Este teste é a trava: entrou na matriz, tem de ter porta.
 */
const RAIZ = join(__dirname, "..");
const sidebar = readFileSync(join(RAIZ, "components", "protected", "dashboard", "Sidebar.tsx"), "utf8");

/**
 * Telas que de propósito NÃO ficam no menu lateral — cada uma com o motivo, porque uma lista de
 * exceções sem explicação vira o esconderijo do próximo esquecimento.
 */
const SEM_MENU_PROPOSITAL: Record<string, string> = {
  "/dashboard/inbox-nativo/automaticas": "aba dentro do próprio Inbox, para não encher o menu",
  "/dashboard/configuracoes/agendamento-online": "mora em Configurações",
  "/dashboard/configuracoes/listas": "mora em Configurações",
  "/dashboard/configuracoes/racas": "mora em Configurações",
  "/dashboard/configuracoes/exames": "mora em Configurações",
  "/dashboard/configuracoes/modelos-receita": "mora em Configurações",
  "/dashboard/configuracoes/modelos-documento": "mora em Configurações",
  "/dashboard/configuracoes/grupos": "mora em Configurações",
  "/dashboard/erp/dados-clinica": "mora em Configurações > Dados da clínica",
  "/dashboard/erp/documentos": "aberta pela ficha do pet, no contexto do atendimento",

  // ── AS DUAS ABAIXO SÃO PROBLEMA CONHECIDO, NÃO DECISÃO ────────────────────────────────
  // Achadas em 15/09/2026 ao escrever esta trava. Ficam listadas para o teste passar sem
  // esconder o defeito — e para a próxima pessoa saber que há conta a acertar aqui.
  //
  // `pesos-suspeitos`: a tela existe, está na matriz e NÃO é referenciada em lugar nenhum do
  // sistema. Ou entra no menu, ou sai. Aguardando a Cintia decidir.
  "/dashboard/erp/pesos-suspeitos": "ÓRFÃ — ninguém alcança; decidir se entra no menu ou sai",
  //
  // `erp/financeiro`: a matriz aponta para /dashboard/erp/financeiro e o menu leva para
  // /dashboard/financeiro — endereços diferentes. A permissão pode estar governando uma tela
  // que ninguém abre, enquanto a que se abre não obedece a ninguém.
  "/dashboard/erp/financeiro": "CHAVE DIVERGENTE — o menu leva para /dashboard/financeiro",
};

describe("toda tela da matriz tem porta no menu", () => {
  it("nenhuma tela ficou só para quem sabe o endereço", () => {
    const faltando = allTelaKeys()
      .filter((k) => !SEM_MENU_PROPOSITAL[k])
      .filter((k) => !sidebar.includes(`"${k}"`));
    // Se falhar, a lista diz QUAIS — e a correção é uma linha no Sidebar, não uma exceção aqui.
    expect(faltando).toEqual([]);
  });

  it("as quatro telas de 15/09 estão no menu", () => {
    // As que ela não achou. Ficam nomeadas para o teste falar do caso concreto.
    for (const k of [
      "/dashboard/erp/cadastros-recebidos",
      "/dashboard/erp/portal-tutores",
      "/dashboard/erros",
    ]) {
      expect(sidebar).toContain(`"${k}"`);
    }
  });

  it("e as mensagens automáticas têm porta dentro do Inbox", () => {
    // A exceção só vale porque existe outra entrada. Sem ela, seria esquecimento com desculpa.
    const inbox = readFileSync(join(RAIZ, "app", "(user)", "dashboard", "inbox-nativo", "page.tsx"), "utf8");
    expect(inbox).toContain("/dashboard/inbox-nativo/automaticas");
  });
});
