import Link from 'next/link';
import {
  LuArrowUpRight,
  LuBot,
  LuChartColumn,
  LuCheckCheck,
  LuClock,
  LuMegaphone,
  LuSearch,
  LuUsers,
} from 'react-icons/lu';

const channels = [
  {
    name: 'Google Ads',
    icon: LuSearch,
    color: 'from-blue-500 to-cyan-500',
    accent: 'text-blue-300',
    badge: 'Search + Performance Max',
    objective: 'Captar leads com alta intenção para banho, tosa, consultas e vacinas.',
    budget: 'R$ 3.500/mês',
    cpl: 'R$ 18,40',
    ctr: '6,8%',
    audience: 'Raio de 8 km, tutores ativos, busca por serviços pet e urgências veterinárias.',
    highlights: [
      'Palavras-chave separadas por serviço',
      'Campanhas locais com extensão de chamada',
      'Landing pages por intenção de busca',
    ],
  },
  {
    name: 'Meta Ads',
    icon: LuUsers,
    color: 'from-fuchsia-500 to-violet-500',
    accent: 'text-fuchsia-300',
    badge: 'Feed + Stories + Remarketing',
    objective: 'Gerar reconhecimento, reativar clientes e converter ofertas sazonais.',
    budget: 'R$ 2.200/mês',
    cpl: 'R$ 12,90',
    ctr: '3,4%',
    audience: 'Lookalike de clientes, público engajado no Instagram e remarketing do site.',
    highlights: [
      'Criativos com pets e provas sociais',
      'Campanhas de tráfego e geração de cadastro',
      'Remarketing para carrinho e páginas de serviço',
    ],
  },
];

const funnelStages = [
  {
    title: 'Topo',
    description: 'Alcance e reconhecimento para serviços e diferenciais da clínica.',
    metric: 'CPM médio R$ 11,20',
  },
  {
    title: 'Meio',
    description: 'Campanhas com prova social, depoimentos e ofertas sazonais.',
    metric: 'CTR médio 4,7%',
  },
  {
    title: 'Fundo',
    description: 'Remarketing com CTA direto para WhatsApp, formulário e agendamento.',
    metric: 'Conversão estimada 12,6%',
  },
];

const audiences = [
  'Tutores novos em um raio de 8 km',
  'Clientes inativos há mais de 90 dias',
  'Público semelhante aos clientes premium',
  'Visitantes das landing pages de vacina e banho',
];

const creatives = [
  {
    title: 'Vacinação em dia',
    format: 'Imagem estática + CTA para WhatsApp',
    copy: 'Proteja seu pet com lembretes automáticos e agendamento rápido.',
  },
  {
    title: 'Banho e tosa recorrente',
    format: 'Carrossel com benefícios e combo mensal',
    copy: 'Mostre antes/depois, benefícios e incentive recorrência.',
  },
  {
    title: 'Consulta preventiva',
    format: 'Vídeo curto com veterinário',
    copy: 'Explique sintomas, check-up e urgência de prevenção.',
  },
];

export default function AdsenseCampaignsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-blue-600/20 to-cyan-600/20" />
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl border border-violet-500/20 bg-violet-500/20 p-2.5">
                <LuMegaphone className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
                    Preview da feature
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                    Google + Meta
                  </span>
                </div>
                <h1 className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                  Campanhas Adsense
                </h1>
                <p className="mt-2 max-w-3xl text-gray-300">
                  Exemplo visual de como a feature de campanhas pagas pode organizar planejamento,
                  canais, criativos e previsibilidade de performance para Google e Meta.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/campanhas"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/15"
              >
                Voltar para Campanhas
              </Link>
              <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20">
                <LuBot className="h-4 w-4" />
                Conceito com IA + mídia paga
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Investimento mensal', value: 'R$ 5.700', icon: LuChartColumn, tint: 'bg-violet-500/20 text-violet-300' },
              { label: 'Leads estimados', value: '312', icon: LuUsers, tint: 'bg-cyan-500/20 text-cyan-300' },
              { label: 'ROAS projetado', value: '4.8x', icon: LuArrowUpRight, tint: 'bg-emerald-500/20 text-emerald-300' },
              { label: 'Tempo de otimização', value: '7 dias', icon: LuClock, tint: 'bg-amber-500/20 text-amber-300' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${item.tint}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">{item.label}</p>
                    <p className="text-2xl font-bold text-white">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Canais da operação</h2>
                  <p className="text-sm text-gray-400">Visão de como Google e Meta podem coexistir na mesma campanha.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">Exemplo visual</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {channels.map((channel) => (
                  <div key={channel.name} className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl bg-gradient-to-br p-3 ${channel.color}`}>
                          <channel.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{channel.name}</h3>
                          <p className={`text-xs ${channel.accent}`}>{channel.badge}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                        Ativo
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-gray-300">{channel.objective}</p>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs text-gray-400">Budget</p>
                        <p className="mt-1 font-semibold text-white">{channel.budget}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs text-gray-400">CPL</p>
                        <p className="mt-1 font-semibold text-white">{channel.cpl}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs text-gray-400">CTR</p>
                        <p className="mt-1 font-semibold text-white">{channel.ctr}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Público</p>
                      <p className="mt-2 text-sm text-gray-300">{channel.audience}</p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {channel.highlights.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-gray-300">
                          <LuCheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-white">Estratégia de funil</h2>
                <p className="text-sm text-gray-400">Exemplo de distribuição entre atração, consideração e conversão.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {funnelStages.map((stage) => (
                  <div key={stage.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-white">{stage.title}</span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-gray-300">Stage</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-300">{stage.description}</p>
                    <div className="mt-4 rounded-xl border border-cyan-500/10 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
                      {stage.metric}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-white">Peças e criativos</h2>
                <p className="text-sm text-gray-400">Variações de criativo que a feature pode organizar por objetivo.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {creatives.map((creative) => (
                  <div key={creative.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{creative.title}</p>
                      <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200">Criativo</span>
                    </div>
                    <p className="text-sm text-cyan-200">{creative.format}</p>
                    <p className="mt-3 text-sm leading-6 text-gray-300">{creative.copy}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">Segmentos prioritários</h2>
              <p className="mt-1 text-sm text-gray-400">Públicos que a feature pode salvar, reutilizar e sincronizar.</p>

              <div className="mt-5 space-y-3">
                {audiences.map((audience, index) => (
                  <div key={audience} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-sm font-semibold text-cyan-200">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{audience}</p>
                      <p className="mt-1 text-sm text-gray-400">Sincronizado com CRM, tags e comportamento de navegação.</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">Roadmap visual</h2>
              <p className="mt-1 text-sm text-gray-400">Como essa feature pode evoluir em camadas.</p>

              <div className="mt-5 space-y-4">
                {[
                  'Conexão com contas Google Ads e Meta Ads',
                  'Biblioteca de campanhas por objetivo e sazonalidade',
                  'Sync com leads, CRM e eventos de conversão',
                  'Painel com CAC, CPL, ROAS e receita atribuída',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <p className="text-sm text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-5 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white/10 p-2.5">
                  <LuBot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Como esse exemplo pode virar produto</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-200">
                    A tela foi desenhada como vitrine conceitual. O próximo passo natural seria conectar contas,
                    permitir criação de campanha guiada e exibir métricas reais por canal com atribuição.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
