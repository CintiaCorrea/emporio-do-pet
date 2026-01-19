'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LuMegaphone,
  LuMail,
  LuMessageSquare,
  LuSend,
  LuUsers,
  LuTrendingUp,
  LuPlus,
  LuArrowUpRight,
  LuCircleCheck
} from 'react-icons/lu';

// Tipos
interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  completedCampaigns: number;
  totalRecipients: number;
  avgOpenRate: number;
  avgClickRate: number;
}

interface RecentCampaign {
  id: string;
  name: string;
  type: 'newsletter' | 'sms' | 'whatsapp' | 'email';
  status: 'active' | 'scheduled' | 'completed' | 'draft';
  recipients: number;
  openRate: number;
  clickRate: number;
  date: string;
}

// Mock data
const mockStats: CampaignStats = {
  totalCampaigns: 24,
  activeCampaigns: 3,
  scheduledCampaigns: 5,
  completedCampaigns: 16,
  totalRecipients: 4850,
  avgOpenRate: 32.5,
  avgClickRate: 8.2
};

const mockRecentCampaigns: RecentCampaign[] = [
  {
    id: '1',
    name: 'Promoção de Natal',
    type: 'newsletter',
    status: 'active',
    recipients: 1250,
    openRate: 38.5,
    clickRate: 12.3,
    date: '2024-12-01'
  },
  {
    id: '2',
    name: 'Lembrete de Vacinas',
    type: 'email',
    status: 'scheduled',
    recipients: 450,
    openRate: 0,
    clickRate: 0,
    date: '2024-12-05'
  },
  {
    id: '3',
    name: 'Black Friday Pet',
    type: 'newsletter',
    status: 'completed',
    recipients: 2100,
    openRate: 45.2,
    clickRate: 15.8,
    date: '2024-11-25'
  },
  {
    id: '4',
    name: 'Novos Serviços',
    type: 'email',
    status: 'draft',
    recipients: 0,
    openRate: 0,
    clickRate: 0,
    date: '2024-12-03'
  }
];

export default function CampanhasPage() {
  const [stats, setStats] = useState<CampaignStats>(mockStats);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>(mockRecentCampaigns);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento
    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setStats(mockStats);
      setRecentCampaigns(mockRecentCampaigns);
      setLoading(false);
    };
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'draft': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'scheduled': return 'Agendada';
      case 'completed': return 'Concluída';
      case 'draft': return 'Rascunho';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'newsletter': return <LuMail className="w-4 h-4" />;
      case 'sms': return <LuMessageSquare className="w-4 h-4" />;
      case 'whatsapp': return <LuMessageSquare className="w-4 h-4" />;
      case 'email': return <LuMail className="w-4 h-4" />;
      default: return <LuSend className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const campaignModules = [
    {
      title: 'Newsletter',
      description: 'Envie newsletters para seus clientes',
      icon: LuMail,
      href: '/dashboard/campanhas/newsletter',
      color: 'from-blue-500 to-indigo-600',
      stats: '12 enviadas'
    },
    {
      title: 'Email Marketing',
      description: 'Campanhas de email personalizadas',
      icon: LuSend,
      href: '/dashboard/campanhas/email',
      color: 'from-purple-500 to-pink-600',
      stats: 'Em breve',
      disabled: true
    },
    {
      title: 'SMS',
      description: 'Mensagens de texto diretas',
      icon: LuMessageSquare,
      href: '/dashboard/campanhas/sms',
      color: 'from-green-500 to-emerald-600',
      stats: 'Em breve',
      disabled: true
    },
    {
      title: 'WhatsApp',
      description: 'Campanhas via WhatsApp',
      icon: LuMessageSquare,
      href: '/dashboard/campanhas/whatsapp',
      color: 'from-emerald-500 to-teal-600',
      stats: 'Em breve',
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
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  Campanhas
                </h1>
                <p className="mt-2 text-gray-400">
                  Central de marketing e comunicação com clientes
                </p>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/30">
                <LuPlus className="w-5 h-5" />
                Nova Campanha
              </button>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20">
                    <LuMegaphone className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Campanhas</p>
                    <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20">
                    <LuCircleCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Ativas</p>
                    <p className="text-2xl font-bold text-white">{stats.activeCampaigns}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20">
                    <LuUsers className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Destinatários</p>
                    <p className="text-2xl font-bold text-white">{stats.totalRecipients.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-500/20">
                    <LuTrendingUp className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Taxa de Abertura</p>
                    <p className="text-2xl font-bold text-white">{stats.avgOpenRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Módulos de Campanha */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Tipos de Campanha</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <span className="text-xs text-gray-500">{module.stats}</span>
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

          {/* Campanhas Recentes */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Campanhas Recentes</h2>
                <Link
                  href="/dashboard/campanhas/newsletter"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Ver todas
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-white/10">
                          {getTypeIcon(campaign.type)}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{campaign.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-500">{formatDate(campaign.date)}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                              {getStatusText(campaign.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="text-sm text-gray-400">Destinatários</p>
                          <p className="font-medium text-white">{campaign.recipients.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Abertura</p>
                          <p className="font-medium text-white">{campaign.openRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Cliques</p>
                          <p className="font-medium text-white">{campaign.clickRate}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

