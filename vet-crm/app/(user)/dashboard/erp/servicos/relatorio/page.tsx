'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import toast from 'react-hot-toast';

// Paleta Base44 (bege + emojis) — restyle 04/07, logica 100% preservada.
const TEAL = '#009AAC';
const NAVY = '#014D5E';
const BG = '#F6F2EA';
const SOFT = '#FBF9F4';
const TINT = '#E0F4F6';
const LINE = '#E8E2D6';
const DIV = '#F0EBE0';
const TXT = '#1F2A2E';
const TXT2 = '#5C6B70';
const TXT3 = '#8A989D';

const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '14px 24px', fontSize: 11.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.03em', color: TXT3, borderBottom: `1px solid ${LINE}` };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT, outline: 'none' };

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: TEAL }}></div>
          <p className="mt-4" style={{ color: TXT2 }}>Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden" style={{ background: BG }}>
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
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: TXT2 }}
                  >
                    <span style={{ fontSize: "20px" }}>‹</span>
                  </Link>
                  <div>
                    <h1 className="text-3xl flex items-center gap-2" style={{ color: NAVY, fontWeight: 500 }}>
                      <span style={{ fontSize: "26px" }}>📊</span>
                      Relatório de Serviços
                    </h1>
                    <p className="mt-2" style={{ color: TXT2 }}>
                      Análise detalhada dos serviços oferecidos
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="px-6 py-3 text-sm flex items-center space-x-2 transition-all"
                    style={{ fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9 }}
                  >
                    <span style={{ fontSize: "16px" }}>⬇️</span>
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl" style={{ background: '#fdecec', border: '1px solid #f3c9c4', color: '#a03426' }}>
                {error}
                <button
                  onClick={() => setError(null)}
                  className="float-right"
                  style={{ color: '#a03426' }}
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            )}

            {/* Filtros */}
            <div className="p-6 mb-6" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{fontSize:"16px"}}>🔍</span>
                <h3 className="text-lg" style={{ color: NAVY, fontWeight: 500 }}>Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={inputStyle}
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
                  icon: () => <span style={{fontSize:"20px"}}>🏷️</span>,
                  trend: null
                },
                {
                  label: "Total de Usos",
                  value: stats.totalTreatments,
                  icon: () => <span style={{fontSize:"20px"}}>⚡</span>,
                  trend: null
                },
                {
                  label: "Receita Total",
                  value: formatCurrency(stats.totalRevenue),
                  icon: () => <span style={{fontSize:"20px"}}>💰</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Preço Médio",
                  value: formatCurrency(stats.averagePrice),
                  icon: () => <span style={{fontSize:"20px"}}>📈</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Receita Média/Serviço",
                  value: formatCurrency(stats.averageRevenuePerService),
                  icon: () => <span style={{fontSize:"20px"}}>⚡</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Serviço Mais Usado",
                  value: stats.mostUsedService.name || 'N/A',
                  icon: () => <span style={{fontSize:"20px"}}>✓</span>,
                  trend: stats.mostUsedService.count > 0 ? `${stats.mostUsedService.count} usos` : null,
                  isText: true
                },
                {
                  label: "Maior Receita",
                  value: stats.highestRevenueService.name || 'N/A',
                  icon: () => <span style={{fontSize:"20px"}}>📈</span>,
                  trend: stats.highestRevenueService.revenue > 0 ? formatCurrency(stats.highestRevenueService.revenue) : null,
                  isText: true
                },
                {
                  label: "Sem Uso",
                  value: stats.servicesWithNoUsage,
                  icon: () => <span style={{fontSize:"20px"}}>🚫</span>,
                  trend: stats.totalServices > 0 ? ((stats.servicesWithNoUsage / stats.totalServices) * 100).toFixed(1) + '%' : '0%'
                }
              ].map((stat, index) => (
                <div key={index} className="p-6" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12 }}>
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ background: TINT, borderRadius: 10, padding: '6px 10px', display: 'inline-flex' }}>
                      <stat.icon />
                    </span>
                    {stat.trend && (
                      <div style={{ fontSize: 11, fontWeight: 500, color: TXT3 }}>
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div style={{ color: NAVY, fontWeight: 500, fontSize: stat.isFormatted ? 20 : stat.isText ? 16 : 26 }}>
                    {stat.value}
                  </div>
                  <div>
                    <p className="mt-2" style={{ fontSize: 11, color: TXT3, fontWeight: 500 }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela de Serviços */}
            <div className="overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4" style={{ background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg flex items-center gap-2" style={{ color: NAVY, fontWeight: 500 }}>
                    <span style={{fontSize:"18px"}}>📋</span>
                    Detalhamento dos Serviços
                  </h3>
                  <div className="text-sm" style={{ color: TXT2 }}>
                    {services.length} serviços encontrados
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: SOFT }}>
                      <th style={thStyle}>Serviço</th>
                      <th style={thStyle}>Preço</th>
                      <th style={thStyle}>Usos</th>
                      <th style={thStyle}>Receita Total</th>
                      <th style={thStyle}>Receita Média/Uso</th>
                      <th style={thStyle}>Última Atualização</th>
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
                          className="transition-all duration-300"
                          style={{ borderBottom: `1px solid ${DIV}` }}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div style={{ background: TINT, borderRadius: 10, padding: '6px 10px' }}>
                                <span style={{fontSize:"16px"}}>🏷️</span>
                              </div>
                              <div>
                                <div style={{ color: TXT, fontWeight: 500 }}>{service.name}</div>
                                <div className="text-xs" style={{ color: TXT3 }}>
                                  ID: {service.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1" style={{ color: TXT, fontWeight: 500 }}>
                              <span style={{fontSize:"14px"}}>💰</span>
                              {formatCurrency(service.price)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs"
                                style={serviceTreatments.length > 0
                                  ? { background: TINT, color: NAVY, fontWeight: 500 }
                                  : { background: DIV, color: TXT3, fontWeight: 500 }}
                              >
                                <span style={{fontSize:"14px"}}>⚡</span>
                                {serviceTreatments.length} {serviceTreatments.length === 1 ? 'uso' : 'usos'}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div style={{ color: TXT, fontWeight: 500 }}>
                              {formatCurrency(serviceRevenue)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div style={{ color: TXT2 }}>
                              {serviceTreatments.length > 0
                                ? formatCurrency(averageRevenuePerUse)
                                : 'N/A'
                              }
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1" style={{ color: TXT2 }}>
                              <span style={{fontSize:"14px"}}>📅</span>
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
                    <span style={{fontSize:"32px"}}>🏷️</span>
                    <p className="text-lg" style={{ color: TXT2 }}>Nenhum serviço encontrado</p>
                    <p className="mt-2" style={{ color: TXT3 }}>
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
