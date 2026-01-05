'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuUsers,
  LuPawPrint,
  LuCalendar,
  LuStethoscope,
  LuBedDouble,
  LuDollarSign,
  LuTrendingUp,
  LuTrendingDown,
  LuBot,
  LuMegaphone,
  LuMail,
  LuPackage,
  LuWarehouse,
  LuPercent,
  LuClock,
  LuCircleCheck,
  LuCircleAlert,
  LuArrowUpRight,
  LuArrowDownRight,
  LuRefreshCw,
  LuChevronRight,
  LuActivity,
  LuZap,
  LuTarget,
  LuSparkles,
  LuMessageSquare,
  LuPhone,
  LuSettings
} from 'react-icons/lu';

// Tipos
interface DashboardData {
  // ERP
  totalTutores: number;
  totalPets: number;
  totalClientes: number;
  agendamentosHoje: number;
  consultasHoje: number;
  consultasPendentes: number;
  internacoesAtivas: number;
  // Financeiro
  faturamentoMes: number;
  faturamentoHoje: number;
  ticketMedio: number;
  comissoesPendentes: number;
  // CRM
  leadsNovos: number;
  leadsQualificados: number;
  taxaConversao: number;
  // Campanhas
  campanhasAtivas: number;
  emailsEnviados: number;
  taxaAbertura: number;
  // AI Agents
  agentesAtivos: number;
  interacoesHoje: number;
  taxaSucessoAgentes: number;
  // Estoque
  produtosBaixoEstoque: number;
  alertasEstoque: number;
}

interface AtividadeRecente {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  tempo: string;
  icone: string;
  cor: string;
}

interface AgendamentoProximo {
  id: string;
  horario: string;
  tutor: string;
  pet: string;
  servico: string;
  status: 'confirmado' | 'pendente' | 'em_atendimento';
}

// Mock data
const mockData: DashboardData = {
  totalTutores: 1248,
  totalPets: 1876,
  totalClientes: 892,
  agendamentosHoje: 18,
  consultasHoje: 12,
  consultasPendentes: 6,
  internacoesAtivas: 3,
  faturamentoMes: 87650,
  faturamentoHoje: 4280,
  ticketMedio: 185,
  comissoesPendentes: 2450,
  leadsNovos: 24,
  leadsQualificados: 8,
  taxaConversao: 33.3,
  campanhasAtivas: 2,
  emailsEnviados: 1250,
  taxaAbertura: 38.5,
  agentesAtivos: 3,
  interacoesHoje: 156,
  taxaSucessoAgentes: 94.2,
  produtosBaixoEstoque: 8,
  alertasEstoque: 3
};

const mockAtividades: AtividadeRecente[] = [
  { id: '1', tipo: 'agendamento', titulo: 'Novo agendamento', descricao: 'Rex - Consulta de rotina às 14:30', tempo: '2 min', icone: '📅', cor: 'blue' },
  { id: '2', tipo: 'pagamento', titulo: 'Pagamento recebido', descricao: 'Maria Silva - R$ 280,00', tempo: '15 min', icone: '💰', cor: 'green' },
  { id: '3', tipo: 'lead', titulo: 'Novo lead qualificado', descricao: 'João Santos via WhatsApp', tempo: '32 min', icone: '🎯', cor: 'purple' },
  { id: '4', tipo: 'ai_agent', titulo: 'Atendimento automático', descricao: 'Bot respondeu 12 mensagens', tempo: '45 min', icone: '🤖', cor: 'violet' },
  { id: '5', tipo: 'internacao', titulo: 'Alta de internação', descricao: 'Luna - Recuperação completa', tempo: '1h', icone: '🏥', cor: 'teal' },
  { id: '6', tipo: 'campanha', titulo: 'Newsletter enviada', descricao: '450 destinatários', tempo: '2h', icone: '📧', cor: 'cyan' }
];

const mockAgendamentos: AgendamentoProximo[] = [
  { id: '1', horario: '09:00', tutor: 'Maria Silva', pet: 'Rex', servico: 'Consulta', status: 'em_atendimento' },
  { id: '2', horario: '09:30', tutor: 'João Santos', pet: 'Luna', servico: 'Vacinação', status: 'confirmado' },
  { id: '3', horario: '10:00', tutor: 'Ana Costa', pet: 'Thor', servico: 'Banho e Tosa', status: 'confirmado' },
  { id: '4', horario: '10:30', tutor: 'Pedro Oliveira', pet: 'Mel', servico: 'Consulta', status: 'pendente' },
  { id: '5', horario: '11:00', tutor: 'Carla Rodrigues', pet: 'Bob', servico: 'Retorno', status: 'confirmado' }
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<DashboardData>(mockData);
  const [atividades, setAtividades] = useState<AtividadeRecente[]>(mockAtividades);
  const [agendamentos, setAgendamentos] = useState<AgendamentoProximo[]>(mockAgendamentos);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'hoje' | 'semana' | 'mes'>('hoje');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData(mockData);
      setAtividades(mockAtividades);
      setAgendamentos(mockAgendamentos);
      setLoading(false);
    };
    loadData();
  }, [timeFilter]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-emerald-100 text-emerald-700';
      case 'pendente': return 'bg-amber-100 text-amber-700';
      case 'em_atendimento': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'pendente': return 'Pendente';
      case 'em_atendimento': return 'Em atendimento';
      default: return status;
    }
  };

  const hoje = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`flex-1 flex items-center justify-center transition-all duration-300 ${sidebarOpen ? 'ml-56 sm:ml-64' : 'ml-12 sm:ml-16'}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-56 sm:ml-64' : 'ml-12 sm:ml-16'}`}>
        <div className="p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Bom dia! 👋
                </h1>
                <p className="text-gray-500 mt-1 capitalize">{hoje}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-white rounded-xl border border-gray-200 p-1">
                  {['hoje', 'semana', 'mes'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter as any)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        timeFilter === filter
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {filter === 'hoje' ? 'Hoje' : filter === 'semana' ? 'Semana' : 'Mês'}
                    </button>
                  ))}
                </div>
                <button className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <LuRefreshCw className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Stats Grid Principal */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {/* Tutores */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <LuUsers className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="flex items-center text-xs font-medium text-emerald-600">
                    <LuArrowUpRight className="w-3 h-3 mr-0.5" />
                    12%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.totalTutores.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">Tutores</p>
              </div>

              {/* Pets */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-purple-500/5 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                    <LuPawPrint className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="flex items-center text-xs font-medium text-emerald-600">
                    <LuArrowUpRight className="w-3 h-3 mr-0.5" />
                    8%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.totalPets.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">Pets</p>
              </div>

              {/* Agendamentos Hoje */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-amber-500/5 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                    <LuCalendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">hoje</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.agendamentosHoje}</p>
                <p className="text-sm text-gray-500 mt-1">Agendamentos</p>
              </div>

              {/* Consultas */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-teal-500/5 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-teal-50 rounded-xl group-hover:bg-teal-100 transition-colors">
                    <LuStethoscope className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    {data.consultasPendentes} pendentes
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.consultasHoje}</p>
                <p className="text-sm text-gray-500 mt-1">Consultas hoje</p>
              </div>

              {/* Internações */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-rose-500/5 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors">
                    <LuBedDouble className="w-5 h-5 text-rose-600" />
                  </div>
                  <span className="flex items-center w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.internacoesAtivas}</p>
                <p className="text-sm text-gray-500 mt-1">Internações ativas</p>
              </div>

              {/* Faturamento Hoje */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <LuDollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="flex items-center text-xs font-medium text-emerald-600">
                    <LuArrowUpRight className="w-3 h-3 mr-0.5" />
                    18%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.faturamentoHoje)}</p>
                <p className="text-sm text-gray-500 mt-1">Faturamento hoje</p>
              </div>
            </div>

            {/* Grid Principal de Conteúdo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Coluna 1 - Agendamentos do Dia */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                          <LuCalendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900">Agenda do Dia</h2>
                          <p className="text-sm text-gray-500">{data.agendamentosHoje} agendamentos</p>
                        </div>
                      </div>
                      <Link 
                        href="/dashboard/erp/agendamentos"
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <LuChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {agendamentos.map((agendamento) => (
                      <div key={agendamento.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[50px]">
                            <p className="text-lg font-bold text-gray-900">{agendamento.horario}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{agendamento.tutor}</p>
                            <p className="text-sm text-gray-500">{agendamento.pet} • {agendamento.servico}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(agendamento.status)}`}>
                            {getStatusText(agendamento.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                    <Link 
                      href="/dashboard/erp/agendamentos"
                      className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Ver agenda completa
                      <LuChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Coluna 2 - Atividades Recentes */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-xl">
                          <LuActivity className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900">Atividades Recentes</h2>
                          <p className="text-sm text-gray-500">Últimas atualizações</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {atividades.map((atividade) => (
                      <div key={atividade.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{atividade.icone}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{atividade.titulo}</p>
                            <p className="text-sm text-gray-500 truncate">{atividade.descricao}</p>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{atividade.tempo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna 3 - Módulos Rápidos */}
              <div className="lg:col-span-1 space-y-4">
                {/* AI Agents */}
                <Link href="/dashboard/ai-agents" className="block">
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white hover:shadow-xl hover:shadow-purple-500/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <LuBot className="w-6 h-6" />
                      </div>
                      <span className="flex items-center gap-1.5 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                        {data.agentesAtivos} ativos
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">AI Agents</h3>
                    <p className="text-white/80 text-sm mb-3">{data.interacoesHoje} interações hoje</p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/20">
                      <span className="text-sm text-white/80">Taxa de sucesso</span>
                      <span className="text-lg font-bold">{data.taxaSucessoAgentes}%</span>
                    </div>
                  </div>
                </Link>

                {/* CRM */}
                <Link href="/dashboard/crm/pipelines" className="block">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white hover:shadow-xl hover:shadow-blue-500/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <LuTarget className="w-6 h-6" />
                      </div>
                      <span className="flex items-center text-sm font-medium">
                        <LuArrowUpRight className="w-4 h-4 mr-1" />
                        {data.taxaConversao}%
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">CRM</h3>
                    <p className="text-white/80 text-sm mb-3">{data.leadsNovos} novos leads</p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/20">
                      <span className="text-sm text-white/80">Qualificados</span>
                      <span className="text-lg font-bold">{data.leadsQualificados}</span>
                    </div>
                  </div>
                </Link>

                {/* Campanhas */}
                <Link href="/dashboard/campanhas" className="block">
                  <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-5 text-white hover:shadow-xl hover:shadow-cyan-500/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <LuMegaphone className="w-6 h-6" />
                      </div>
                      <span className="flex items-center gap-1.5 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                        {data.campanhasAtivas} ativas
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Campanhas</h3>
                    <p className="text-white/80 text-sm mb-3">{data.emailsEnviados.toLocaleString()} emails enviados</p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/20">
                      <span className="text-sm text-white/80">Taxa de abertura</span>
                      <span className="text-lg font-bold">{data.taxaAbertura}%</span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Grid de Resumos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Financeiro */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <LuDollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Financeiro</h3>
                    <p className="text-xs text-gray-500">Este mês</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Faturamento</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(data.faturamentoMes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Ticket médio</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(data.ticketMedio)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Comissões pendentes</span>
                    <span className="font-semibold text-amber-600">{formatCurrency(data.comissoesPendentes)}</span>
                  </div>
                </div>
                <Link 
                  href="/dashboard/erp/financeiro"
                  className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Ver detalhes
                  <LuChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Estoque */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-amber-50 rounded-xl">
                    <LuWarehouse className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Estoque</h3>
                    <p className="text-xs text-gray-500">Status atual</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Produtos baixo estoque</span>
                    <span className="font-semibold text-amber-600">{data.produtosBaixoEstoque}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Alertas ativos</span>
                    <span className="font-semibold text-rose-600">{data.alertasEstoque}</span>
                  </div>
                </div>
                <Link 
                  href="/dashboard/erp/estoque"
                  className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Gerenciar estoque
                  <LuChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Serviços */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-indigo-50 rounded-xl">
                    <LuSparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Serviços</h3>
                    <p className="text-xs text-gray-500">Mais populares</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600">Consultas</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="w-[70%] h-full bg-indigo-500 rounded-full"></div>
                      </div>
                      <span className="text-xs text-gray-500">70%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600">Vacinação</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="w-[45%] h-full bg-indigo-500 rounded-full"></div>
                      </div>
                      <span className="text-xs text-gray-500">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600">Banho e Tosa</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="w-[35%] h-full bg-indigo-500 rounded-full"></div>
                      </div>
                      <span className="text-xs text-gray-500">35%</span>
                    </div>
                  </div>
                </div>
                <Link 
                  href="/dashboard/erp/servicos"
                  className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Ver serviços
                  <LuChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Integrações */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-violet-50 rounded-xl">
                    <LuSettings className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Integrações</h3>
                    <p className="text-xs text-gray-500">Status dos serviços</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">WhatsApp Bot</span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">N8N Automações</span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">AI Agents</span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600">Online</span>
                  </div>
                </div>
                <Link 
                  href="/dashboard/ai-agents/conexoes"
                  className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Configurar
                  <LuChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <Link 
                  href="/dashboard/erp/agendamentos"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    <LuCalendar className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Agendar</span>
                </Link>

                <Link 
                  href="/dashboard/erp/tutores/novo"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-purple-50 hover:text-purple-600 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    <LuUsers className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600 transition-colors">Novo Tutor</span>
                </Link>

                <Link 
                  href="/dashboard/erp/pets/novo"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    <LuPawPrint className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600 transition-colors">Novo Pet</span>
                </Link>

                <Link 
                  href="/dashboard/erp/consultas"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-teal-50 hover:text-teal-600 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    <LuStethoscope className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-teal-600 transition-colors">Consultas</span>
                </Link>

                <Link 
                  href="/dashboard/campanhas/newsletter/novo"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-cyan-50 hover:text-cyan-600 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    <LuMail className="w-5 h-5 text-gray-600 group-hover:text-cyan-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-600 transition-colors">Newsletter</span>
                </Link>

                <Link 
                  href="/dashboard/ai-agents"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-violet-50 hover:text-violet-600 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    <LuBot className="w-5 h-5 text-gray-600 group-hover:text-violet-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-violet-600 transition-colors">AI Agents</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
