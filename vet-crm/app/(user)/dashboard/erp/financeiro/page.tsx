// app/(user)/dashboard/erp/financeiro/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuDollarSign, 
  LuUsers, 
  LuTrendingUp, 
  LuCalendar,
  LuDownload,
  LuFilter,
  LuSearch,
  LuArrowUpRight,
  LuArrowDownRight,
  LuFileText,
  LuChartPie
} from 'react-icons/lu';

// Mock data - substituir por chamada à API
const paymentData = [
  {
    id: 1,
    patientName: 'Maria Silva',
    treatment: 'Consulta',
    value: 2500,
    status: 'pago',
    date: '2024-01-15',
    dueDate: '2024-01-10',
    method: 'Cartão de Crédito'
  },
  {
    id: 2,
    patientName: 'João Santos',
    treatment: 'Cirurgia',
    value: 5000,
    status: 'pendente',
    date: '2024-01-14',
    dueDate: '2024-01-12',
    method: 'Boleto'
  },
  {
    id: 3,
    patientName: 'Ana Costa',
    treatment: 'Vacinação',
    value: 800,
    status: 'pago',
    date: '2024-01-13',
    dueDate: '2024-01-13',
    method: 'PIX'
  },
  {
    id: 4,
    patientName: 'Pedro Oliveira',
    treatment: 'Consulta',
    value: 200,
    status: 'atrasado',
    date: '2024-01-12',
    dueDate: '2024-01-05',
    method: 'Dinheiro'
  },
  {
    id: 5,
    patientName: 'Carla Rodrigues',
    treatment: 'Internação',
    value: 3200,
    status: 'pago',
    date: '2024-01-11',
    dueDate: '2024-01-11',
    method: 'Cartão de Débito'
  },
  {
    id: 6,
    patientName: 'Roberto Alves',
    treatment: 'Exames',
    value: 450,
    status: 'pendente',
    date: '2024-01-10',
    dueDate: '2024-01-15',
    method: 'Boleto'
  },
  {
    id: 7,
    patientName: 'Fernanda Lima',
    treatment: 'Banho e Tosa',
    value: 1800,
    status: 'pago',
    date: '2024-01-09',
    dueDate: '2024-01-09',
    method: 'PIX'
  },
  {
    id: 8,
    patientName: 'Ricardo Souza',
    treatment: 'Cirurgia',
    value: 4200,
    status: 'pago',
    date: '2024-01-08',
    dueDate: '2024-01-08',
    method: 'Cartão de Crédito'
  }
];

const financialSummary = {
  totalRevenue: 15950,
  pendingPayments: 5450,
  averageTicket: 1993.75,
  paidPercentage: 72.5,
  monthlyGrowth: 15.3,
  patientsCount: 42
};

export default function FinanceiroPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState('30dias');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const filteredPayments = paymentData.filter(payment =>
    payment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.treatment.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(payment => 
    statusFilter === 'todos' || payment.status === statusFilter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'atrasado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago': return 'Pago';
      case 'pendente': return 'Pendente';
      case 'atrasado': return 'Atrasado';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Financeiro
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie pagamentos e performance financeira da clínica
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2">
                    <LuDownload className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>
                  <button className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuFileText className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Gerar Relatório</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { 
                  label: "Faturamento Total", 
                  value: formatCurrency(financialSummary.totalRevenue), 
                  color: "green", 
                  icon: LuDollarSign,
                  change: `+${financialSummary.monthlyGrowth}%`,
                  trend: 'up'
                },
                { 
                  label: "Pagamentos Pendentes", 
                  value: formatCurrency(financialSummary.pendingPayments), 
                  color: "yellow", 
                  icon: LuUsers,
                  change: "5 pendentes",
                  trend: 'neutral'
                },
                { 
                  label: "Ticket Médio", 
                  value: formatCurrency(financialSummary.averageTicket), 
                  color: "blue", 
                  icon: LuTrendingUp,
                  change: "+8.2%",
                  trend: 'up'
                },
                { 
                  label: "Taxa de Pagos", 
                  value: `${financialSummary.paidPercentage}%`, 
                  color: "purple", 
                  icon: LuChartPie,
                  change: "+3.1%",
                  trend: 'up'
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {stat.trend === 'up' && <LuArrowUpRight className="w-4 h-4" />}
                      {stat.trend === 'down' && <LuArrowDownRight className="w-4 h-4" />}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters and Search */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por cliente ou serviço..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="pago">Pagos</option>
                    <option value="pendente">Pendentes</option>
                    <option value="atrasado">Atrasados</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm flex-1 lg:flex-none"
                  >
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                    <option value="90dias">Últimos 90 dias</option>
                    <option value="ano">Este ano</option>
                  </select>
                  
                  <button className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                    <LuFilter className="w-4 h-4" />
                    <span>Mais Filtros</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Últimos Pagamentos
                  </h3>
                  <div className="text-sm text-gray-600">
                    {filteredPayments.length} registros encontrados
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Cliente</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Serviço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Valor</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Data</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Vencimento</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr 
                        key={payment.id} 
                        className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 group"
                      >
                        <td className="p-6">
                          <div className="font-semibold text-gray-900">{payment.patientName}</div>
                        </td>
                        <td className="p-6">
                          <div className="text-gray-700">{payment.treatment}</div>
                        </td>
                        <td className="p-6">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(payment.value)}
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="text-gray-700">{formatDate(payment.date)}</div>
                        </td>
                        <td className="p-6">
                          <div className={`text-gray-700 ${
                            payment.status === 'atrasado' ? 'text-red-600 font-semibold' : ''
                          }`}>
                            {formatDate(payment.dueDate)}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-gray-700">{payment.method}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Mostrando {filteredPayments.length} de {paymentData.length} pagamentos
                </div>
                
                <div className="flex items-center space-x-4">
                  <button className="px-4 py-2 text-sm text-gray-600 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 transition-all duration-300">
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">Página 1 de 2</span>
                  <button className="px-4 py-2 text-sm text-gray-600 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 transition-all duration-300">
                    Próxima
                  </button>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Revenue Chart Placeholder */}
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Faturamento Mensal</h3>
                  <LuTrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div className="h-64 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <LuChartPie className="w-12 h-12 mx-auto mb-2" />
                    <p>Gráfico de Faturamento</p>
                  </div>
                </div>
              </div>

              {/* Payment Methods Chart Placeholder */}
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Métodos de Pagamento</h3>
                  <LuDollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div className="h-64 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <LuChartPie className="w-12 h-12 mx-auto mb-2" />
                    <p>Gráfico de Métodos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







