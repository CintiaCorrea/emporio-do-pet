"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Configurações (índice) — reorganizado 14/07
   Concentra SÓ o que é configuração, agrupado por assunto.
   Mockup aprovado pela Cintia.
   ───────────────────────────────────────────────────────────── */
import Link from "next/link";
import { useState } from "react";
import { LuSearch, LuArrowRight } from "react-icons/lu";

type Group = "CADASTROS" | "AGENDA" | "COMUNICACAO" | "CATALOGO" | "VENDAS" | "SISTEMA";
type Item = { href: string; title: string; description: string; emoji: string; group: Group; novo?: boolean };

const ITEMS: Item[] = [
  // Cadastros base
  { href: "/dashboard/configuracoes/profissionais", title: "Equipe", description: "Equipe interna + acessos ao sistema (login)", emoji: "👥", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/permissoes", title: "Perfis e Permissões", description: "O que cada perfil vê e edita em cada tela", emoji: "🔐", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/etiquetas", title: "Etiquetas", description: "Tags pra Lead, Cliente e Pet", emoji: "🏷️", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/servicos", title: "Serviços e Produtos", description: "Catálogo com preço, custo e comissão", emoji: "📦", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/racas", title: "Raças", description: "Lista de raças por espécie", emoji: "🐾", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/modelos-receita", title: "Modelos de Receita", description: "Modelos editáveis da ficha do pet", emoji: "💊", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/modelos-documento", title: "Modelos de Documento", description: "Modelos editáveis da ficha do pet", emoji: "📄", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/listas", title: "Listas customizáveis", description: "Canais, origens, motivos, fases…", emoji: "📋", group: "CADASTROS" },
  { href: "/dashboard/configuracoes/protocolos", title: "Protocolos", description: "Vacinas, vermífugos e ectoparasitas", emoji: "💉", group: "CADASTROS" },

  // Agenda & Atendimento
  { href: "/dashboard/erp/agendamentos/configuracoes", title: "Agenda", description: "Horários, durações e tipos de agendamento", emoji: "📅", group: "AGENDA", novo: true },
  { href: "/dashboard/configuracoes/atendimento", title: "Atendimento", description: "Tipos e status do atendimento", emoji: "🩺", group: "AGENDA" },

  // Comunicação & Mensagens
  { href: "/dashboard/configuracoes/inbox", title: "Caixa de Entrada", description: "WhatsApp: criar lead automático de número novo", emoji: "📥", group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/cadastros-recebidos", title: "Cadastros recebidos", description: "Fichas que os clientes preenchem pelo link público", emoji: "📝", group: "COMUNICACAO", novo: true },
  { href: "/dashboard/configuracoes/resposta-automatica", title: "Resposta automática", description: "Mensagem automática fora do horário", emoji: "⏰", group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/scripts", title: "Scripts", description: "Roteiros de mensagem (texto/áudio/e-mail)", emoji: "💬", group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/cadencias", title: "Cadências", description: "Sequências automáticas de comunicação", emoji: "🔁", group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/email-templates", title: "Templates de E-mail", description: "Modelos com variáveis", emoji: "✉️", group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/pipelines", title: "Pipelines", description: "Etapas comercial / clínico / fisio", emoji: "🧩", group: "COMUNICACAO" },

  // Catálogo & Terceiros
  { href: "/dashboard/configuracoes/exames", title: "Exames, Fornecedores e Profissionais", description: "Catálogo de exames + fornecedores (lab/empresa) e profissionais", emoji: "🔬", group: "CATALOGO" },
  { href: "/dashboard/configuracoes/grupos", title: "Grupos do catálogo", description: "Categorias de produtos e serviços", emoji: "📁", group: "CATALOGO" },

  // Vendas & Financeiro
  { href: "/dashboard/erp/configuracoes-vendas", title: "Configuração de vendas", description: "Regras de venda, descontos e comportamento do PDV", emoji: "💰", group: "VENDAS", novo: true },
  { href: "/dashboard/erp/formas-recebimento", title: "Formas de recebimento", description: "Dinheiro, cartão, Pix, prazos…", emoji: "💳", group: "VENDAS" },

  // Sistema & Acesso
  { href: "/dashboard/erp/dados-clinica", title: "Dados da clínica", description: "Nome, CNPJ, endereço e marcas", emoji: "🏢", group: "SISTEMA", novo: true },
  { href: "/dashboard/configuracoes/metas", title: "Metas", description: "Faturamento, atendimentos, conversões", emoji: "🎯", group: "SISTEMA" },
  { href: "/dashboard/configuracoes/timbrado", title: "Papel timbrado", description: "A folha com o logo pros documentos impressos (boletim, receituário…)", emoji: "📄", group: "SISTEMA", novo: true },
];

const GROUP_LABEL: Record<Group, string> = {
  CADASTROS: "Cadastros base",
  AGENDA: "Agenda & Atendimento",
  COMUNICACAO: "Comunicação & Mensagens",
  CATALOGO: "Catálogo & Terceiros",
  VENDAS: "Vendas & Financeiro",
  SISTEMA: "Sistema & Acesso",
};
const GROUPS: Group[] = ["CADASTROS", "AGENDA", "COMUNICACAO", "CATALOGO", "VENDAS", "SISTEMA"];

export default function ConfiguracoesIndex() {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? ITEMS.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
    : ITEMS;

  return (
    <div className="min-h-screen" style={{ background: "#F6F2EA" }}>
      <div className="max-w-6xl mx-auto px-6 pt-5 pb-16">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#0E2244" }}>⚙️ Configurações</h1>
        <p className="text-sm mb-5" style={{ color: "#6B7A80", maxWidth: "68ch", lineHeight: 1.5 }}>
          Tudo o que é configuração num lugar só, agrupado por assunto.
        </p>

        <div className="relative max-w-md mb-7">
          <LuSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar configuração..."
            className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#ECE6D8" }} />
        </div>

        <div className="space-y-7">
          {GROUPS.map((g) => {
            const items = filtered.filter((i) => i.group === g);
            if (items.length === 0) return null;
            return (
              <section key={g}>
                <div className="text-xs font-extrabold uppercase tracking-wide mb-3 px-0.5" style={{ color: "#6B7A80", letterSpacing: "0.8px" }}>
                  {GROUP_LABEL[g]} <span className="font-semibold" style={{ color: "#94a3a8" }}>({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((it) => (
                    <Link key={it.href} href={it.href}
                      className="group bg-white border rounded-2xl p-4 flex items-start gap-3 hover:shadow-md hover:-translate-y-0.5 transition" style={{ borderColor: "#ECE6D8" }}>
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[19px]" style={{ background: "#E0F4F6" }}>
                        {it.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-1.5 flex-wrap" style={{ color: "#0E2244" }}>
                          {it.title}
                          {it.novo && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: "#0F6E56", background: "#E7F7EF" }}>Novo aqui</span>
                          )}
                          <LuArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" style={{ color: "#009AAC" }} />
                        </div>
                        <div className="text-xs mt-0.5 line-clamp-2" style={{ color: "#6B7A80" }}>{it.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                {g === "COMUNICACAO" && (
                  <div className="mt-3 text-xs rounded-xl p-3" style={{ background: "#FAFAF7", border: "1px solid #ECE6D8", color: "#6B7A80" }}>
                    📌 Os modelos aprovados pelo <b style={{ color: "#0E2244" }}>Meta</b> (confirmação de agenda, aniversário…) continuam sendo gerenciados <b style={{ color: "#0E2244" }}>no Meta</b> — não entram aqui.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
