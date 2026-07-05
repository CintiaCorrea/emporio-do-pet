// ─────────────────────────────────────────────────────────────
// Perfis de acesso — base compartilhada entre a tela de Permissões
// (configuracoes/permissoes) e o menu lateral (Sidebar).
// A CHAVE de cada tela é o próprio href (estável e único).
// Armazenamento: listas `perfis_acesso` + `permissoes_acesso` (via /api/listas).
// ─────────────────────────────────────────────────────────────

export type Nivel = "OCULTO" | "VISUALIZA" | "EDITA";
export const NIVEIS: Nivel[] = ["OCULTO", "VISUALIZA", "EDITA"];
export const NIVEL_LABEL: Record<Nivel, string> = { OCULTO: "Oculto", VISUALIZA: "Visualiza", EDITA: "Edita" };

export const LISTA_PERFIS = "perfis_acesso";
export const LISTA_PERM = "permissoes_acesso";
export const LISTA_PERFIL_USUARIO = "perfil_usuario"; // 1 item JSON {map:{userId:perfilNome}}
export const PERFIS_SISTEMA = ["Admin", "Veterinário", "Recepção"];

// Telas que NUNCA entram na matriz: são gateadas por cargo (só Admin) e
// ficam sempre visíveis pro Admin (trava anti-lockout).
export const LOCKED_KEYS = ["/dashboard/configuracoes", "/dashboard/configuracoes/permissoes"];

export interface PermItem { key: string; label: string; emoji: string; children?: PermItem[]; }
export interface PermSection { titulo: string; emoji: string; itens: PermItem[]; }

// Árvore = espelho do menu (Sidebar). key = href.
export const PERM_SECTIONS: PermSection[] = [
  {
    titulo: "Dia a dia", emoji: "🗂️", itens: [
      { key: "/dashboard/hoje", label: "Hoje", emoji: "✨" },
      { key: "/dashboard", label: "Painel", emoji: "📊" },
      { key: "/dashboard/inbox", label: "Inbox BC", emoji: "💬" },
      { key: "/dashboard/inbox-nativo", label: "Inbox Meta", emoji: "📲" },
      { key: "/dashboard/comercial", label: "Comercial", emoji: "🎯" },
      { key: "/dashboard/erp/tutores", label: "Clientes", emoji: "👥" },
      { key: "/dashboard/erp/agendamentos/agenda", label: "Agenda", emoji: "📅" },
      { key: "/dashboard/erp/vacinacao", label: "Vacinação", emoji: "💉" },
      { key: "/dashboard/erp/aniversarios", label: "Aniversários", emoji: "🎂" },
      {
        key: "clinico", label: "Atendimento clínico", emoji: "🩺", children: [
          { key: "/dashboard/erp/consultas", label: "Consultas", emoji: "🩺" },
          { key: "/dashboard/erp/documentos", label: "Documentos", emoji: "📄" },
          { key: "/dashboard/erp/tratamentos", label: "Tratamentos", emoji: "💉" },
        ],
      },
      { key: "/dashboard/erp/internacoes", label: "Internação", emoji: "🏥" },
    ],
  },
  {
    titulo: "Gestão", emoji: "📊", itens: [
      {
        key: "vendas", label: "Vendas", emoji: "💰", children: [
          { key: "/dashboard/erp/comandas", label: "Em atendimento", emoji: "🛎️" },
          { key: "/dashboard/erp/ponto-de-venda", label: "Ponto de venda", emoji: "🛒" },
          { key: "/dashboard/erp/caixa", label: "Caixa", emoji: "💵" },
          { key: "/dashboard/erp/pacotes", label: "Pacotes", emoji: "📦" },
          { key: "/dashboard/erp/recebimentos", label: "Recebimentos", emoji: "🧾" },
          { key: "/dashboard/erp/movimentos-caixa", label: "Movimentos de caixa", emoji: "🔄" },
          { key: "/dashboard/erp/saldo-clientes", label: "Saldo dos clientes", emoji: "👛" },
          { key: "/dashboard/erp/formas-recebimento", label: "Formas de recebimento", emoji: "💳" },
          { key: "/dashboard/erp/configuracoes-vendas", label: "Configuração de vendas", emoji: "⚙️" },
          { key: "/dashboard/erp/modelos-orcamento", label: "Modelo de orçamento", emoji: "📄" },
          { key: "/dashboard/erp/modelo-demonstrativo", label: "Modelo de demonstrativo", emoji: "🧾" },
          { key: "/dashboard/erp/importar-vendas", label: "Importar vendas", emoji: "📥" },
        ],
      },
      { key: "/dashboard/erp/comissoes", label: "Comissionamento", emoji: "🧾" },
      {
        key: "inteligencia", label: "Inteligência", emoji: "💡", children: [
          { key: "/dashboard/erp/minhas-vendas", label: "Produtividade", emoji: "📈" },
          { key: "/dashboard/erp/consulta-vendas", label: "Consulta de vendas", emoji: "🧾" },
          { key: "/dashboard/erp/ranking-clientes", label: "Ranking de clientes", emoji: "🏆" },
          { key: "/dashboard/erp/vendas-graficos", label: "Vendas — gráficos", emoji: "📊" },
        ],
      },
      {
        key: "estoque", label: "Estoque e serviços", emoji: "📦", children: [
          { key: "/dashboard/erp/produtos", label: "Produtos", emoji: "📦" },
          { key: "/dashboard/erp/servicos", label: "Serviços", emoji: "🏷️" },
          { key: "/dashboard/erp/estoque", label: "Estoque", emoji: "📊" },
          { key: "/dashboard/erp/lista-precos", label: "Lista de preços", emoji: "💲" },
        ],
      },
      {
        key: "financeiro", label: "Financeiro", emoji: "💵", children: [
          { key: "/dashboard/erp/financeiro", label: "Financeiro", emoji: "💵" },
          { key: "/dashboard/erp/financeiro-terceiros", label: "Fin. Terceiros", emoji: "💸" },
        ],
      },
    ],
  },
  {
    titulo: "Crescimento", emoji: "🚀", itens: [
      {
        key: "marketing", label: "Marketing", emoji: "📣", children: [
          { key: "/dashboard/marketing/funil-semana", label: "Funil Semana", emoji: "📊" },
          { key: "/dashboard/marketing/google-ads", label: "Google Ads", emoji: "🔍" },
          { key: "/dashboard/marketing/meta-ads", label: "Meta Ads", emoji: "📣" },
          { key: "/dashboard/marketing/nps", label: "NPS", emoji: "⭐" },
          { key: "/dashboard/marketing/avaliacoes-google", label: "Aval. Google", emoji: "🌟" },
          { key: "/dashboard/marketing/campanhas", label: "Campanhas", emoji: "🎯" },
          { key: "/dashboard/marketing/midia", label: "Mídia", emoji: "🎬" },
          { key: "/dashboard/marketing/emails", label: "Emails", emoji: "✉️" },
        ],
      },
      {
        key: "ia", label: "IA / Atendimento", emoji: "🤖", children: [
          { key: "/dashboard/ai-agents/agents", label: "Agentes", emoji: "🤖" },
          { key: "/dashboard/ai-agents/conhecimento", label: "Conhecimento", emoji: "📚" },
          { key: "/dashboard/ai-agents/automacoes", label: "Automações", emoji: "⚡" },
          { key: "/dashboard/ai-agents/conexoes", label: "Conexões", emoji: "🔌" },
          { key: "/dashboard/ai-agents/templates", label: "Templates", emoji: "📋" },
        ],
      },
    ],
  },
  {
    titulo: "Sistema", emoji: "⚙️", itens: [
      {
        key: "cadastros", label: "Cadastros", emoji: "📁", children: [
          { key: "/dashboard/erp/contatos", label: "Contatos", emoji: "📇" },
          { key: "/dashboard/erp/duplicados", label: "Duplicados", emoji: "🔀" },
          { key: "/dashboard/configuracoes/listas", label: "Listas (pelagem, marca…)", emoji: "🎨" },
          { key: "/dashboard/configuracoes/racas", label: "Raças", emoji: "🐾" },
          { key: "/dashboard/configuracoes/exames", label: "Exames", emoji: "🔬" },
          { key: "/dashboard/configuracoes/modelos-receita", label: "Modelo de receita", emoji: "💊" },
          { key: "/dashboard/configuracoes/modelos-documento", label: "Modelo de documento", emoji: "📄" },
        ],
      },
      { key: "/dashboard/erp/logs", label: "Log de auditoria", emoji: "🔎" },
      { key: "/dashboard/erp/dados-clinica", label: "Dados da clínica", emoji: "🏢" },
    ],
  },
];

/** Todas as chaves-folha (hrefs) da matriz. */
export function allLeafKeys(): string[] {
  const out: string[] = [];
  for (const s of PERM_SECTIONS) for (const it of s.itens) {
    if (it.children) it.children.forEach((c) => out.push(c.key));
    else out.push(it.key);
  }
  return out;
}

/** Cargo (Role) → nome do perfil de acesso. */
export function roleToPerfil(role?: string | null): string {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "Admin";
  if (r === "VETERINARIAN" || r === "VET") return "Veterinário";
  if (r === "RECEPTIONIST" || r === "RECEPCAO") return "Recepção";
  return "Admin"; // fallback seguro (não esconde nada)
}

/** Matriz padrão de um perfil: tudo EDITA (permissivo). A Cintia define os OCULTO. */
export function matrizPadrao(_perfil: string): Record<string, Nivel> {
  const m: Record<string, Nivel> = {};
  for (const k of allLeafKeys()) m[k] = "EDITA";
  return m;
}

/** Nível de uma tela num perfil (default EDITA quando não definido = visível). */
export function nivelDe(matriz: Record<string, Nivel> | undefined, key: string): Nivel {
  return (matriz && matriz[key]) || "EDITA";
}

/** Resolve o caminho atual (pathname) para a chave (href) da matriz.
 *  Casa por maior prefixo (ex.: /dashboard/erp/tutores/123 → /dashboard/erp/tutores).
 *  '/dashboard' (Painel) só casa exato. Retorna null se a rota não estiver na matriz. */
export function pathToKey(pathname: string): string | null {
  if (!pathname) return null;
  const keys = allLeafKeys();
  if (pathname === "/dashboard") return keys.includes("/dashboard") ? "/dashboard" : null;
  let best: string | null = null;
  for (const k of keys) {
    if (k === "/dashboard") continue;
    if (pathname === k || pathname.startsWith(k + "/")) {
      if (!best || k.length > best.length) best = k;
    }
  }
  return best;
}

/** Nome do perfil de acesso do usuário: preview (cargo) > perfil atribuído > cargo real. */
export function resolvePerfil(opts: {
  meId?: string | null; realRole?: string | null; previewRole?: string | null;
  isPreviewing?: boolean; userMap?: Record<string, string>;
}): string {
  const { meId, realRole, previewRole, isPreviewing, userMap } = opts;
  if (isPreviewing) return roleToPerfil(previewRole);
  if (meId && userMap && userMap[meId]) return userMap[meId];
  return roleToPerfil(realRole);
}
