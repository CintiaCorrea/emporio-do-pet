"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Configurações (índice)  (configuracoes)
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo.
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ───────────────────────────────────────────────────────────── */

import Link from "next/link";
import { useState } from "react";
import {
  LuUsers, LuTag, LuPackage, LuPawPrint, LuList,
  LuMessageSquare, LuClock, LuFlaskConical, LuMail, LuLayoutGrid,
  LuMegaphone, LuTarget, LuStar, LuArrowRight, LuSearch,
} from "react-icons/lu";

type Item = {
  href: string; title: string; description: string;
  Icon: any; group: "CADASTROS" | "COMUNICACAO" | "PERFORMANCE";
};

const ITEMS: Item[] = [
  // Cadastros
  { href: "/dashboard/configuracoes/profissionais", title: "Profissionais", description: "Equipe + acessos ao sistema (login)", Icon: LuUsers, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/permissoes", title: "Perfis e Permissões", description: "O que cada perfil vê e edita em cada tela", Icon: LuUsers, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/etiquetas", title: "Etiquetas", description: "Tags pra Lead, Cliente e Pet", Icon: LuTag, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/servicos", title: "Serviços e Produtos", description: "Catálogo com preço, custo e comissão", Icon: LuPackage, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/racas", title: "Raças", description: "Lista de raças por espécie", Icon: LuPawPrint, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/atendimento", title: "Atendimento", description: "Tipos e status do atendimento", Icon: LuPawPrint, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/listas", title: "Listas customizáveis", description: "Canais, origens, motivos, status", Icon: LuList, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/exames", title: "Exames e Fornecedores", description: "Catálogo + laboratórios parceiros", Icon: LuFlaskConical, group: "CADASTROS" },
  { href: "/dashboard/configuracoes/protocolos", title: "Protocolos", description: "Vacinas, vermífugos e ectoparasitas (cronograma de doses)", Icon: LuFlaskConical, group: "CADASTROS" },
  { href: "/dashboard/legacy", title: "Sistema antigo (comparar)", description: "Telas originais do dev — mesmo banco, só comparação", Icon: LuList, group: "CADASTROS" },
  // Comunicação
  { href: "/dashboard/configuracoes/scripts", title: "Scripts", description: "Roteiros de mensagem (áudio/texto/email)", Icon: LuMessageSquare, group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/cadencias", title: "Cadências", description: "Sequências automáticas de comunicação", Icon: LuClock, group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/email-templates", title: "Templates de Email", description: "Modelos com variáveis", Icon: LuMail, group: "COMUNICACAO" },
  { href: "/dashboard/configuracoes/pipelines", title: "Pipelines", description: "Etapas comercial / clínico / fisio", Icon: LuLayoutGrid, group: "COMUNICACAO" },
  // Performance
  { href: "/dashboard/configuracoes/campanhas", title: "Campanhas", description: "Marketing (Google/Meta Ads)", Icon: LuMegaphone, group: "PERFORMANCE" },
  { href: "/dashboard/configuracoes/metas", title: "Metas", description: "Faturamento, atendimentos, conversões", Icon: LuTarget, group: "PERFORMANCE" },
  { href: "/dashboard/configuracoes/avaliacoes", title: "Avaliações", description: "NPS interno + Google Reviews", Icon: LuStar, group: "PERFORMANCE" },
];

const GROUP_LABEL: Record<Item["group"], string> = {
  CADASTROS: "Cadastros base",
  COMUNICACAO: "Comunicação",
  PERFORMANCE: "Performance",
};

export default function ConfiguracoesIndex() {
  const [search, setSearch] = useState("");
  const filtered = search
    ? ITEMS.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
    : ITEMS;

  const groups: Item["group"][] = ["CADASTROS", "COMUNICACAO", "PERFORMANCE"];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div className="relative max-w-md">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar configuração..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {groups.map(g => {
          const items = filtered.filter(i => i.group === g);
          if (items.length === 0) return null;
          return (
            <section key={g}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {GROUP_LABEL[g]} <span className="text-gray-400 font-normal">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(it => {
                  const I = it.Icon;
                  return (
                    <Link key={it.href} href={it.href} className="group bg-white border rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition" style={{ borderColor: "#E8DFC8" }}>
                      <div className="rounded-lg p-2.5 shrink-0" style={{ background: "#E0F4F6", color: "#009AAC" }}>
                        <I size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1.5" style={{ color: "#0E2244" }}>
                          {it.title}
                          <LuArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{it.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
