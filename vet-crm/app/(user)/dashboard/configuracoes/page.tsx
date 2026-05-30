"use client";

import Link from "next/link";
import { LuUser, LuArrowLeft } from "react-icons/lu";

interface ConfigItem {
  href: string;
  title: string;
  icon: string;
  description: string;
  status: "ready" | "soon";
  badge?: string;
}

const ITEMS: ConfigItem[] = [
  { href: "/dashboard/configuracoes/profissionais", icon: "👥", title: "Profissionais", description: "Equipe da clínica — vets, recepção, estagiários", status: "ready" },
  { href: "/dashboard/configuracoes/etiquetas", icon: "🏷", title: "Etiquetas", description: "Tags e categorias pra Lead, Cliente e Pet", status: "soon" },
  { href: "/dashboard/configuracoes/servicos", icon: "🛠", title: "Serviços e Produtos", description: "Catálogo com preço, custo e comissão", status: "soon" },
  { href: "/dashboard/configuracoes/racas", icon: "🐾", title: "Raças", description: "Lista de raças por espécie", status: "soon" },
  { href: "/dashboard/configuracoes/listas", icon: "📋", title: "Listas customizáveis", description: "Canais, origens, motivos de perda, status clínicos", status: "soon" },
  { href: "/dashboard/configuracoes/scripts", icon: "📝", title: "Scripts", description: "Roteiros de mensagem áudio/texto/email", status: "soon" },
  { href: "/dashboard/configuracoes/cadencias", icon: "⚡", title: "Cadências automáticas", description: "Sequências de comunicação (pós-cirurgia, etc)", status: "soon" },
  { href: "/dashboard/configuracoes/exames", icon: "🧪", title: "Exames e Fornecedores", description: "Catálogo de exames + laboratórios parceiros", status: "soon" },
  { href: "/dashboard/configuracoes/emails", icon: "✉️", title: "Templates de Email", description: "Modelos com variáveis pra disparos automáticos", status: "soon" },
  { href: "/dashboard/configuracoes/pipelines", icon: "🌿", title: "Pipelines", description: "Etapas customizáveis do comercial/clínico/fisio", status: "soon" },
  { href: "/dashboard/configuracoes/campanhas", icon: "📣", title: "Campanhas", description: "Campanhas de marketing (Google/Meta Ads)", status: "soon" },
  { href: "/dashboard/configuracoes/metas", icon: "🎯", title: "Metas", description: "Metas de faturamento, atendimentos, conversões", status: "soon" },
  { href: "/dashboard/configuracoes/avaliacoes", icon: "⭐", title: "Avaliações", description: "Pesquisa NPS e fluxo Google My Business", status: "soon" },
];

export default function ConfiguracoesIndex() {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="mb-5">
        <h1 className="text-xl text-[#0E2244] font-medium">Configurações</h1>
        <p className="text-sm text-[#888780]">Cadastros base que alimentam as telas do CRM. Acesso restrito a Admin e Veterinário.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ITEMS.map((item) => {
          const isReady = item.status === "ready";
          const Card = (
            <div className={`bg-white border rounded-xl p-4 transition ${isReady ? "border-[#e8e1d2] hover:border-[#009AAC] hover:shadow-md cursor-pointer" : "border-dashed border-[#e8e1d2] opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{item.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm text-[#0E2244] font-medium">{item.title}</h3>
                    {!isReady && (
                      <span className="text-[9px] bg-[#EEEDFE] text-[#3C3489] px-1.5 py-0.5 rounded-full font-medium">Em breve</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5F5E5A] leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          );
          return isReady ? <Link key={item.href} href={item.href}>{Card}</Link> : <div key={item.href}>{Card}</div>;
        })}
      </div>

      <p className="text-[11px] text-[#888780] text-center mt-6">
        Configurações sendo portadas do Base44. 1 das 13 finalizadas.
      </p>
    </div>
  );
}
