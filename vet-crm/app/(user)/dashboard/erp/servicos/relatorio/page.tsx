'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuArrowLeft,
  LuCalendar,
  LuDollarSign,
  LuDownload,
  LuFileText
} from 'react-icons/lu';
import toast from 'react-hot-toast';

// Tipos
interface Service {
  id: string;
  name: string;
  type: 'SERVICE';
  price: number;
  stock: number;
  treatments: Array<{
    id: string;
    description: string;
    cost: number;
    appointment: {
      id: string;
      date: string;
      pet: {
        name: string;
      };
      tutor: {
        name: string;
      };
    };
    createdAt: string;
  }>;
  _count: {
    treatments: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Treatment {
  id: string;
  description: string;
  cost: number;
  appointment: {
    id: string;
    date: string;
    description?: string;
    tutor: {
      id: string;
      name: string;
    };
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
  };
  product: {
    id: string;
    name: string;
    type: string;
    price: number;
  } | null;
  createdAt: string;
}

interface ApiResponse {
  products: Service[];
  stats: {
    total: number;
    totalValue: number;
    averagePrice: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface TreatmentsResponse {
  treatments: Treatment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ServicesReportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Estatísticas
  const [stats, setStats] = useState({
    totalServices: 0,
    totalTreatments: 0,
    totalRevenue: 0,
    averagePrice: 0,
    averageRevenuePerService: 0,
    mostUsedService: { name: '', count: 0 },
    leastUsedService: { name: '', count: 0 },
    highestRevenueService: { name: '', revenue: 0 },
    servicesWithNoUsage: 0
  });

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar serviços
      const servicesResponse = await fetch('/api/products?type=SERVICE&limit=1000');
      if (!servicesResponse.ok) throw new Error('Erro ao carregar serviços');
      const servicesData: ApiResponse = await servicesResponse.json();
      const servicesList = servicesData.products.filter(p => p.type === 'SERVICE');
      setServices(servicesList);

      // Buscar tratamentos (usos dos serviços)
      const treatmentsParams = new URLSearchParams();
      treatmentsParams.append('limit', '1000');
      if (startDate) treatmentsParams.append('startDate', startDate);
      if (endDate) treatmentsParams.append('endDate', endDate);
      
      const treatmentsResponse = await fetch(`/api/treatments?${treatmentsParams.toString()}`);
      if (!treatmentsResponse.ok) throw new Error('Erro ao carregar tratamentos');
      const treatmentsData: TreatmentsResponse = await treatmentsResponse.json();
      
      // Filtrar apenas tratamentos que usam serviços (product.type === 'SERVICE')
      const serviceTreatments = treatmentsData.treatments.filter(
        t => t.product && t.product.type === 'SERVICE'
      );
      
      // Filtrar por data se necessário
      let filteredTreatments = serviceTreatments;
      if (startDate || endDate) {
        filteredTreatments = serviceTreatments.filter(t => {
          const treatmentDate = new Date(t.createdAt);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          
          if (start && treatmentDate < start) return false;
          if (end && treatmentDate > end) return false;
          return true;
        });
      }
      
      setTreatments(filteredTreatments);
      calculateStats(servicesList, filteredTreatments);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (servicesList: Service[], treatmentsList: Treatment[]) => {
    const totalServices = servicesList.length;
    const totalTreatments = treatmentsList.length;
    
    // Calcular receita total
    const totalRevenue = treatmentsList.reduce((acc, t) => acc + t.cost, 0);
    
    // Preço médio dos serviços
    const averagePrice = totalServices > 0
      ? servicesList.reduce((acc, s) => acc + s.price, 0) / totalServices
      : 0;
    
    // Receita média por serviço
    const averageRevenuePerService = totalServices > 0 ? totalRevenue / totalServices : 0;
    
    // Contar uso de cada serviço
    const serviceUsage = new Map<string, { name: string; count: number; revenue: number }>();
    
    servicesList.forEach(service => {
      serviceUsage.set(service.id, { name: service.name, count: 0, revenue: 0 });
    });
    
    treatmentsList.forEach(treatment => {
      if (treatment.product) {
        const usage = serviceUsage.get(treatment.product.id);
        if (usage) {
          usage.count++;
          usage.revenue += treatment.cost;
        }
      }
    });
    
    // Encontrar serviço mais usado
    let mostUsed = { name: 'N/A', count: 0 };
    let leastUsed = { name: 'N/A', count: Infinity };
    let highestRevenue = { name: 'N/A', revenue: 0 };
    let servicesWithNoUsage = 0;
    
    serviceUsage.forEach((usage, serviceId) => {
      if (usage.count > mostUsed.count) {
        mostUsed = { name: usage.name, count: usage.count };
      }
      if (usage.count < leastUsed.count && usage.count > 0) {
        leastUsed = { name: usage.name, count: usage.count };
      }
      if (usage.revenue > highestRevenue.revenue) {
        highestRevenue = { name: usage.name, revenue: usage.revenue };
      }
      if (usage.count === 0) {
        servicesWithNoUsage++;
      }
    });
    
    if (leastUsed.count === Infinity) {
      leastUsed = { name: 'N/A', count: 0 };
    }
    
    setStats({
      totalServices,
      totalTreatments,
      totalRevenue,
      averagePrice,
      averageRevenuePerService,
      mostUsedService: mostUsed,
      leastUsedService: leastUsed,
      highestRevenueService: highestRevenue,
      servicesWithNoUsage
    });
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Serviço', 'Preço', 'Usos', 'Receita Total', 'Receita Média por Uso', 'Última Atualização'];
    const rows = services.map(service => {
      const serviceTreatments = treatments.filter(t => t.product?.id === service.id);
      const serviceRevenue = serviceTreatments.reduce((acc, t) => acc + t.cost, 0);
      const averageRevenuePerUse = serviceTreatments.length > 0 
        ? serviceRevenue / serviceTreatments.length 
        : 0;
      
      return [
        service.name,
        service.price.toFixed(2),
        serviceTreatments.length.toString(),
        serviceRevenue.toFixed(2),
        averageRevenuePerUse.toFixed(2),
        formatDate(service.updatedAt)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-servicos-${startDate}-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

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
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard/erp/servicos"
                    className="p-2 hover:bg-white/80 rounded-xl transition-colors"
                  >
                    <LuArrowLeft className="w-5 h-5 text-gray-600" />
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Relatório de Serviços
                    </h1>
                    <p className="text-gray-600 mt-2">
                      Análise detalhada dos serviços oferecidos
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuDownload className="w-4 h-4" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="float-right text-red-500 hover:text-red-700"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-purple-500/5 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span style={{fontSize:"14px"}}>⌕</span>
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { 
                  label: "Total de Serviços", 
                  value: stats.totalServices, 
                  color: "purple", 
                  icon: () => <span style={{fontSize:"14px"}}>🔧</span>,
                  trend: null
                },
                { 
                  label: "Total de Usos", 
                  value: stats.totalTreatments, 
                  color: "blue", 
                  icon: () => <span style={{fontSize:"14px"}}>⚡</span>,
                  trend: null
                },
                { 
                  label: "Receita Total", 
                  value: formatCurrency(stats.totalRevenue), 
                  color: "teal", 
                  icon: LuDollarSign,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Preço Médio", 
                  value: formatCurrency(stats.averagePrice), 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>📈</span>,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Receita Média/Serviço", 
                  value: formatCurrency(stats.averageRevenuePerService), 
                  color: "orange", 
                  icon: () => <span style={{fontSize:"14px"}}>⚡</span>,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Serviço Mais Usado", 
                  value: stats.mostUsedService.name || 'N/A', 
                  color: "blue", 
                  icon: () => <span style={{fontSize:"14px"}}>✓</span>,
                  trend: stats.mostUsedService.count > 0 ? `${stats.mostUsedService.count} usos` : null,
                  isText: true
                },
                { 
                  label: "Maior Receita", 
                  value: stats.highestRevenueService.name || 'N/A', 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>📈</span>,
                  trend: stats.highestRevenueService.revenue > 0 ? formatCurrency(stats.highestRevenueService.revenue) : null,
                  isText: true
                },
                { 
                  label: "Sem Uso", 
                  value: stats.servicesWithNoUsage, 
                  color: "red", 
                  icon: () => null, 
                  trend: stats.totalServices > 0 ? ((stats.servicesWithNoUsage / stats.totalServices) * 100).toFixed(1) + '%' : '0%'
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-purple-500/5 p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    {stat.trend && (
                      <div className="text-xs font-semibold text-gray-500">
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div className={`font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent ${stat.isFormatted ? 'text-lg' : stat.isText ? 'text-base' : 'text-2xl'}`}>
                    {stat.value}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mt-2">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela de Serviços */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-purple-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <LuFileText className="w-5 h-5" />
                    Detalhamento dos Serviços
                  </h3>
                  <div className="text-sm text-gray-600">
                    {services.length} serviços encontrados
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Serviço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Preço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Usos</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Receita Total</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Receita Média/Uso</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Última Atualização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => {
                      const serviceTreatments = treatments.filter(t => t.product?.id === service.id);
                      const serviceRevenue = serviceTreatments.reduce((acc, t) => acc + t.cost, 0);
                      const averageRevenuePerUse = serviceTreatments.length > 0 
                        ? serviceRevenue / serviceTreatments.length 
                        : 0;
                      
                      return (
                        <tr 
                          key={service.id} 
                          className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300"
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                                <span style={{fontSize:"14px"}}>🔧</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{service.name}</div>
                                <div className="text-xs text-gray-500">
                                  ID: {service.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900 flex items-center gap-1">
                              <LuDollarSign className="w-4 h-4 text-green-600" />
                              {formatCurrency(service.price)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                serviceTreatments.length > 0 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <span style={{fontSize:"14px"}}>⚡</span>
                                {serviceTreatments.length} {serviceTreatments.length === 1 ? 'uso' : 'usos'}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(serviceRevenue)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-gray-700">
                              {serviceTreatments.length > 0 
                                ? formatCurrency(averageRevenuePerUse)
                                : 'N/A'
                              }
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1 text-gray-600">
                              <span style={{fontSize:"14px"}}>⏱</span>
                              {formatDate(service.updatedAt)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {services.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <span style={{fontSize:"14px"}}>🔧</span>
                    <p className="text-gray-500 text-lg">Nenhum serviço encontrado</p>
                    <p className="text-gray-400 mt-2">
                      Tente ajustar os filtros de busca
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

