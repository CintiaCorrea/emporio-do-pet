'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
  LuClock,
  LuMail,
  LuMessageSquare,
  LuArrowUpRight,
  LuMegaphone,
  LuSave,
  LuSend,
  LuUsers,
  LuChartColumn
} from 'react-icons/lu';

type NewsletterLike = {
  id?: string;
  title?: string;
  status?: string;
  recipients?: any[];
  recipientCount?: number;
  openCount?: number;
  clickCount?: number;
};

export default function CampanhasPage() {
  const [emailCampaigns, setEmailCampaigns] = useState<NewsletterLike[]>([]);
  const [whatsAppCampaigns, setWhatsAppCampaigns] = useState<any[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [emailHasEngagementMetrics, setEmailHasEngagementMetrics] = useState(false);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setResultsLoading(true);

        const safeFetchList = async (url: string) => {
          const res = await fetch(url, { cache: 'no-store' });
          const data = await res.json().catch(() => null);
          if (!res.ok) return [];
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.campaigns)) return data.campaigns;
          if (Array.isArray(data?.items)) return data.items;
          if (Array.isArray(data?.newsletters)) return data.newsletters;
          return [];
        };

        const [emailList, whatsappList, smsList] = await Promise.all([
          safeFetchList('/api/newsletters'),
          // Se ainda não existir endpoint, vai retornar [] sem quebrar a UI
          safeFetchList('/api/whatsapp-campaigns'),
          safeFetchList('/api/sms-campaigns'),
        ]);

        const normalizedEmail: NewsletterLike[] = (emailList as any[]).map((n) => n as NewsletterLike);
        setEmailCampaigns(normalizedEmail);
        setWhatsAppCampaigns(whatsappList as any[]);
        setSmsCampaigns(smsList as any[]);

        setEmailHasEngagementMetrics(
          normalizedEmail.some((n) => typeof n.openCount === 'number' || typeof n.clickCount === 'number')
        );
      } catch {
        setEmailCampaigns([]);
        setWhatsAppCampaigns([]);
        setSmsCampaigns([]);
        setEmailHasEngagementMetrics(false);
      } finally {
        setResultsLoading(false);
      }
    };

    loadResults();
  }, []);

  const computeResults = useMemo(() => {
    const lower = (s: unknown) => String(s || '').toLowerCase();
    const calc = (list: any[]) => {
      const total = list.length;
      const drafts = list.filter((n) => lower(n?.status) === 'draft').length;
      const scheduled = list.filter((n) => lower(n?.status) === 'scheduled').length;
      const sent = list.filter((n) => lower(n?.status) === 'sent').length;
      const failed = list.filter((n) => lower(n?.status) === 'failed').length;

      const totalRecipients = list.reduce((acc, n) => {
        const rc =
          typeof n?.recipientCount === 'number'
            ? n.recipientCount
            : Array.isArray(n?.recipients)
              ? n.recipients.length
              : 0;
        return acc + rc;
      }, 0);

      const openCount = list.reduce((acc, n) => acc + (typeof n?.openCount === 'number' ? n.openCount : 0), 0);
      const clickCount = list.reduce((acc, n) => acc + (typeof n?.clickCount === 'number' ? n.clickCount : 0), 0);

      const openRate = totalRecipients > 0 ? (openCount / totalRecipients) * 100 : 0;
      const clickRate = totalRecipients > 0 ? (clickCount / totalRecipients) * 100 : 0;

      return { total, drafts, scheduled, sent, failed, totalRecipients, openRate, clickRate };
    };

    return {
      email: calc(emailCampaigns),
      whatsapp: calc(whatsAppCampaigns),
      sms: calc(smsCampaigns),
      all: calc([...emailCampaigns, ...whatsAppCampaigns, ...smsCampaigns]),
    };
  }, [emailCampaigns, whatsAppCampaigns, smsCampaigns]);

  const campaignModules = [
    {
      title: 'Email',
      description: 'Campanhas de email para seus clientes',
      icon: LuMail,
      href: '/dashboard/campanhas/email',
      color: 'from-blue-500 to-indigo-600',
      badge: 'Disponível',
      disabled: false
    },
    {
      title: 'WhatsApp',
      description: 'Campanhas via WhatsApp',
      icon: LuMessageSquare,
      href: '/dashboard/campanhas/whatsapp',
      color: 'from-emerald-500 to-teal-600',
      badge: 'Disponível',
      disabled: false
    },
    {
      title: 'Adsense',
      description: 'Exemplo visual para campanhas Google e Meta',
      icon: LuChartColumn,
      href: '/dashboard/campanhas/adsense',
      color: 'from-violet-500 to-cyan-600',
      badge: 'Preview',
      disabled: false
    },
    {
      title: 'SMS',
      description: 'Mensagens de texto diretas',
      icon: LuMessageSquare,
      href: '/dashboard/campanhas/sms',
      color: 'from-green-500 to-emerald-600',
      badge: 'Em breve',
      disabled: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900">
        {/* Header com gradiente */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-teal-600/20 to-emerald-600/20"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/20">
                  <LuMegaphone className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                    Campanhas
                  </h1>
                  <p className="mt-2 text-gray-400">
                    Escolha o canal para criar e gerenciar campanhas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Resultados (sem mock) */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-white">Resultados</h2>
              <span className="text-xs text-gray-400">Todos os canais</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                {
                  key: 'email',
                  title: 'Email',
                  icon: LuMail,
                  href: '/dashboard/campanhas/email',
                  tint: 'bg-blue-500/20',
                  iconColor: 'text-blue-300',
                  showEngagement: emailHasEngagementMetrics,
                  data: computeResults.email,
                },
                {
                  key: 'whatsapp',
                  title: 'WhatsApp',
                  icon: LuMessageSquare,
                  href: '/dashboard/campanhas/whatsapp',
                  tint: 'bg-emerald-500/20',
                  iconColor: 'text-emerald-300',
                  showEngagement: false,
                  data: computeResults.whatsapp,
                },
                {
                  key: 'sms',
                  title: 'SMS',
                  icon: LuMessageSquare,
                  href: '/dashboard/campanhas/sms',
                  tint: 'bg-green-500/20',
                  iconColor: 'text-green-300',
                  showEngagement: false,
                  data: computeResults.sms,
                },
              ].map((section) => (
                <div key={section.key} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl ${section.tint}`}>
                        <section.icon className={`w-5 h-5 ${section.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold">{section.title}</p>
                        <p className="text-xs text-gray-400">Resultados do canal</p>
                      </div>
                    </div>
                    <Link
                      href={section.href}
                      className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      Ver <LuArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { label: 'Total', value: section.data.total, icon: LuMail },
                      { label: 'Enviados', value: section.data.sent, icon: LuSend },
                      { label: 'Agendados', value: section.data.scheduled, icon: LuClock },
                      { label: 'Rascunhos', value: section.data.drafts, icon: LuSave },
                    ].map((kpi) => (
                      <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs text-gray-400">{kpi.label}</p>
                        <p className={`text-lg font-bold text-white ${resultsLoading ? 'animate-pulse' : ''}`}>
                          {resultsLoading ? '—' : kpi.value.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-gray-400">Destinatários</p>
                      <p className={`text-lg font-bold text-white ${resultsLoading ? 'animate-pulse' : ''}`}>
                        {resultsLoading ? '—' : section.data.totalRecipients.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-gray-400">Falhas</p>
                      <p className={`text-lg font-bold text-white ${resultsLoading ? 'animate-pulse' : ''}`}>
                        {resultsLoading ? '—' : section.data.failed.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-gray-400">Abertura</p>
                      <p className={`text-lg font-bold text-white ${resultsLoading ? 'animate-pulse' : ''}`}>
                        {resultsLoading
                          ? '—'
                          : section.showEngagement
                            ? `${section.data.openRate.toFixed(1)}%`
                            : '—'}
                      </p>
                      {!section.showEngagement && <p className="text-[11px] text-gray-500 mt-1">Em breve</p>}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-gray-400">Cliques</p>
                      <p className={`text-lg font-bold text-white ${resultsLoading ? 'animate-pulse' : ''}`}>
                        {resultsLoading
                          ? '—'
                          : section.showEngagement
                            ? `${section.data.clickRate.toFixed(1)}%`
                            : '—'}
                      </p>
                      {!section.showEngagement && <p className="text-[11px] text-gray-500 mt-1">Em breve</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Módulos de Campanha */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Tipos de Campanha</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignModules.map((module) => (
                <Link
                  key={module.title}
                  href={module.disabled ? '#' : module.href}
                  className={`relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 transition-all group ${
                    module.disabled 
                      ? 'opacity-60 cursor-not-allowed' 
                      : 'hover:bg-white/10 hover:border-cyan-500/30 cursor-pointer'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}></div>
                  <div className="relative">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color} w-fit mb-4`}>
                      <module.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{module.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">{module.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{module.badge}</span>
                      {!module.disabled && (
                        <LuArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                      )}
                    </div>
                  </div>
                  {module.disabled && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                      Em breve
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}

