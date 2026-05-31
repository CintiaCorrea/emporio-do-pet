"use client";

import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

interface ConfigItem {
  href: string;
  title: string;
  description: string;
  status: "ready" | "soon";
  badge?: string;
}

const ITEMS: ConfigItem[] = [
  { href: "/dashboard/configuracoes/profissionais", title: "Profissionais — Equipe e Acesso", description: "Equipe da clínica + acessos ao sistema (login)", status: "ready" },
  { href: "/dashboard/configuracoes/etiquetas", title: "Etiquetas", description: "Tags e categorias pra Lead, Cliente e Pet", status: "ready" },
  { href: "/dashboard/configuracoes/servicos", title: "Serviços e Produtos", description: "Catálogo com preço, custo e comissão", status: "ready" },
  { href: "/dashboard/configuracoes/racas", title: "Raças", description: "Lista de raças por espécie", status: "ready" },
  { href: "/dashboard/configuracoes/listas", title: "Listas customizáveis", description: "Canais, origens, motivos de perda, status clínicos", status: "ready" },
  { href: "/dashboard/configuracoes/scripts", title: "Scripts", description: "Roteiros de mensagem áudio/texto/email", status: "ready" },
  { href: "/dashboard/configuracoes/cadencias", title: "Cadências automáticas", description: "Sequências de comunicação (pós-cirurgia, etc)", status: "ready" },
  { href: "/dashboard/configuracoes/exames", title: "Exames e Fornecedores", description: "Catálogo de exames + laboratórios parceiros", status: "ready" },
  { href: "/dashboard/configuracoes/email-templates", title: "Templates de Email", description: "Modelos com variáveis pra disparos automáticos", status: "ready" },
  { href: "/dashboard/configuracoes/pipelines", title: "Pipelines", description: "Etapas customizáveis do comercial/clínico/fisio", status: "ready" },
  { href: "/dashboard/configuracoes/campanhas", title: "Campanhas", description: "Campanhas de marketing (Google/Meta Ads)", status: "ready" },
  { href: "/dashboard/configuracoes/metas", title: "Metas", description: "Metas de faturamento, atendimentos, conversões", status: "ready" },
  { href: "/dashboard/configuracoes/avaliacoes", title: "Avaliações", description: "Pesquisa NPS e fluxo Google My Business", status: "ready" },
];

export default function ConfiguracoesIndex() {
  const ready = ITEMS.filter(i => i.status === "ready").length;
  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold" style={{ color: "#009AAC" }}>Configurações</h1>
          <p className="text-sm text-gray-600">Cadastros base que alimentam o CRM. {ready} das {ITEMS.length} prontas.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Configuração</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 hidden md:table-cell">Descrição</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((item) => {
                const isReady = item.status === "ready";
                return (
                  <tr key={item.href} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-4 py-3">
                      {isReady ? (
                        <Link href={item.href} className="font-medium hover:underline" style={{ color: "#009AAC" }}>
                          {item.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-500">{item.title}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{item.description}</td>
                    <td className="px-4 py-3 text-right">
                      {isReady ? (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#E8F5E9", color: "#1E6B36" }}>Pronto</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Em breve</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
