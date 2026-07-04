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
type ProductType = 'MEDICINE' | 'VACCINE';

interface Product {
  id: string;
  name: string;
  type: ProductType;
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
  products: Product[];
  stats: {
    total: number;
    totalStock: number;
    totalValue: number;
    averagePrice: number;
    lowStockCount: number;
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

export default function ProductsReportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Estatísticas
  const [stats, setStats] = useState({
    totalProducts: 0,
    medicines: 0,
    vaccines: 0,
    totalStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalRevenue: 0,
    averagePrice: 0,
    averageStock: 0,
    totalTreatments: 0,
    mostUsedProduct: { name: '', count: 0 },
    highestRevenueProduct: { name: '', revenue: 0 },
    totalStockValue: 0
  });

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, typeFilter, stockFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar produtos
      const productsParams = new URLSearchParams();
      productsParams.append('limit', '1000');
      if (typeFilter !== 'all') productsParams.append('type', typeFilter);
      if (stockFilter === 'low') productsParams.append('lowStock', 'true');

      const productsResponse = await fetch(`/api/products?${productsParams.toString()}`);
      if (!productsResponse.ok) throw new Error('Erro ao carregar produtos');
      const productsData: ApiResponse = await productsResponse.json();

      // Filtrar apenas produtos (excluir serviços)
      const productsList = productsData.products.filter(p => p.type !== 'SERVICE');

      // Aplicar filtro de estoque
      let filteredProducts = productsList;
      if (stockFilter === 'low') {
        filteredProducts = productsList.filter(p => p.stock < 10 && p.stock > 0);
      } else if (stockFilter === 'out') {
        filteredProducts = productsList.filter(p => p.stock === 0);
      } else if (stockFilter === 'in') {
        filteredProducts = productsList.filter(p => p.stock > 0);
      }

      setProducts(filteredProducts);

      // Buscar tratamentos (usos dos produtos)
      const treatmentsParams = new URLSearchParams();
      treatmentsParams.append('limit', '1000');
      if (startDate) treatmentsParams.append('startDate', startDate);
      if (endDate) treatmentsParams.append('endDate', endDate);

      const treatmentsResponse = await fetch(`/api/treatments?${treatmentsParams.toString()}`);
      if (!treatmentsResponse.ok) throw new Error('Erro ao carregar tratamentos');
      const treatmentsData: TreatmentsResponse = await treatmentsResponse.json();

      // Filtrar apenas tratamentos que usam produtos (não serviços)
      const productTreatments = treatmentsData.treatments.filter(
        t => t.product && t.product.type !== 'SERVICE'
      );

      // Filtrar por data se necessário
      let filteredTreatments = productTreatments;
      if (startDate || endDate) {
        filteredTreatments = productTreatments.filter(t => {
          const treatmentDate = new Date(t.createdAt);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && treatmentDate < start) return false;
          if (end && treatmentDate > end) return false;
          return true;
        });
      }

      setTreatments(filteredTreatments);
      calculateStats(filteredProducts, filteredTreatments);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (productsList: Product[], treatmentsList: Treatment[]) => {
    const totalProducts = productsList.length;
    const medicines = productsList.filter(p => p.type === 'MEDICINE').length;
    const vaccines = productsList.filter(p => p.type === 'VACCINE').length;

    // Calcular estoque
    const totalStock = productsList.reduce((acc, p) => acc + p.stock, 0);
    const lowStock = productsList.filter(p => p.stock < 10 && p.stock > 0).length;
    const outOfStock = productsList.filter(p => p.stock === 0).length;
    const averageStock = totalProducts > 0 ? totalStock / totalProducts : 0;

    // Calcular valor do estoque
    const totalStockValue = productsList.reduce((acc, p) => acc + (p.price * p.stock), 0);

    // Calcular receita total
    const totalRevenue = treatmentsList.reduce((acc, t) => acc + t.cost, 0);

    // Preço médio
    const averagePrice = totalProducts > 0
      ? productsList.reduce((acc, p) => acc + p.price, 0) / totalProducts
      : 0;

    // Contar uso de cada produto
    const productUsage = new Map<string, { name: string; count: number; revenue: number }>();

    productsList.forEach(product => {
      productUsage.set(product.id, { name: product.name, count: 0, revenue: 0 });
    });

    treatmentsList.forEach(treatment => {
      if (treatment.product) {
        const usage = productUsage.get(treatment.product.id);
        if (usage) {
          usage.count++;
          usage.revenue += treatment.cost;
        }
      }
    });

    // Encontrar produto mais usado
    let mostUsed = { name: 'N/A', count: 0 };
    let highestRevenue = { name: 'N/A', revenue: 0 };

    productUsage.forEach((usage, productId) => {
      if (usage.count > mostUsed.count) {
        mostUsed = { name: usage.name, count: usage.count };
      }
      if (usage.revenue > highestRevenue.revenue) {
        highestRevenue = { name: usage.name, revenue: usage.revenue };
      }
    });

    setStats({
      totalProducts,
      medicines,
      vaccines,
      totalStock,
      lowStock,
      outOfStock,
      totalRevenue,
      averagePrice,
      averageStock,
      totalTreatments: treatmentsList.length,
      mostUsedProduct: mostUsed,
      highestRevenueProduct: highestRevenue,
      totalStockValue
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

  const getTypeLabel = (type: ProductType) => {
    return type === 'MEDICINE' ? 'Medicamento' : 'Vacina';
  };

  const getTypeColor = (type: ProductType) => {
    return type === 'MEDICINE'
      ? { background: TINT, color: NAVY }
      : { background: '#E4F1E8', color: '#0f6e56' };
  };

  const getTypeEmoji = (type: ProductType) => {
    return type === 'MEDICINE' ? '💊' : '💉';
  };

  const getStockStyle = (stock: number) => {
    if (stock === 0) return { background: '#fdecec', color: '#a03426' };
    if (stock < 10) return { background: '#fbeee2', color: '#b45f22' };
    return { background: '#E4F1E8', color: '#0f6e56' };
  };

  const exportToCSV = () => {
    const headers = ['Produto', 'Tipo', 'Preço', 'Estoque', 'Valor Estoque', 'Usos', 'Receita Total', 'Última Atualização'];
    const rows = products.map(product => {
      const productTreatments = treatments.filter(t => t.product?.id === product.id);
      const productRevenue = productTreatments.reduce((acc, t) => acc + t.cost, 0);
      const stockValue = product.price * product.stock;

      return [
        product.name,
        getTypeLabel(product.type),
        product.price.toFixed(2),
        product.stock.toString(),
        stockValue.toFixed(2),
        productTreatments.length.toString(),
        productRevenue.toFixed(2),
        formatDate(product.updatedAt)
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
    link.setAttribute('download', `relatorio-produtos-${startDate}-${endDate}.csv`);
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
                    href="/dashboard/erp/produtos"
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: TXT2 }}
                  >
                    <span style={{ fontSize: "20px" }}>‹</span>
                  </Link>
                  <div>
                    <h1 className="text-3xl flex items-center gap-2" style={{ color: NAVY, fontWeight: 500 }}>
                      <span style={{ fontSize: "26px" }}>📊</span>
                      Relatório de Produtos
                    </h1>
                    <p className="mt-2" style={{ color: TXT2 }}>
                      Análise detalhada de medicamentos e vacinas
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div>
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Tipo</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="all">Todos</option>
                    <option value="MEDICINE">Medicamentos</option>
                    <option value="VACCINE">Vacinas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Estoque</label>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="all">Todos</option>
                    <option value="in">Com Estoque</option>
                    <option value="low">Estoque Baixo</option>
                    <option value="out">Sem Estoque</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  label: "Total de Produtos",
                  value: stats.totalProducts,
                  icon: () => <span style={{fontSize:"20px"}}>📦</span>,
                  trend: null
                },
                {
                  label: "Medicamentos",
                  value: stats.medicines,
                  icon: () => <span style={{fontSize:"20px"}}>💊</span>,
                  trend: stats.totalProducts > 0 ? ((stats.medicines / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Vacinas",
                  value: stats.vaccines,
                  icon: () => <span style={{fontSize:"20px"}}>💉</span>,
                  trend: stats.totalProducts > 0 ? ((stats.vaccines / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Total em Estoque",
                  value: stats.totalStock,
                  icon: () => <span style={{fontSize:"20px"}}>📦</span>,
                  trend: null
                },
                {
                  label: "Estoque Baixo",
                  value: stats.lowStock,
                  icon: () => <span style={{fontSize:"20px"}}>⚠️</span>,
                  trend: stats.totalProducts > 0 ? ((stats.lowStock / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Sem Estoque",
                  value: stats.outOfStock,
                  icon: () => <span style={{fontSize:"20px"}}>🚫</span>,
                  trend: stats.totalProducts > 0 ? ((stats.outOfStock / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Valor do Estoque",
                  value: formatCurrency(stats.totalStockValue),
                  icon: () => <span style={{fontSize:"20px"}}>💰</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Receita Total",
                  value: formatCurrency(stats.totalRevenue),
                  icon: () => <span style={{fontSize:"20px"}}>📈</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Preço Médio",
                  value: formatCurrency(stats.averagePrice),
                  icon: () => <span style={{fontSize:"20px"}}>💰</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Estoque Médio",
                  value: `${Math.round(stats.averageStock)} unidades`,
                  icon: () => <span style={{fontSize:"20px"}}>📦</span>,
                  trend: null
                },
                {
                  label: "Total de Usos",
                  value: stats.totalTreatments,
                  icon: () => <span style={{fontSize:"20px"}}>⚡</span>,
                  trend: null
                },
                {
                  label: "Produto Mais Usado",
                  value: stats.mostUsedProduct.name || 'N/A',
                  icon: () => <span style={{fontSize:"20px"}}>✓</span>,
                  trend: stats.mostUsedProduct.count > 0 ? `${stats.mostUsedProduct.count} usos` : null,
                  isText: true
                },
                {
                  label: "Maior Receita",
                  value: stats.highestRevenueProduct.name || 'N/A',
                  icon: () => <span style={{fontSize:"20px"}}>📈</span>,
                  trend: stats.highestRevenueProduct.revenue > 0 ? formatCurrency(stats.highestRevenueProduct.revenue) : null,
                  isText: true
                }
              ].map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="p-6" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12 }}>
                    <div className="flex items-center justify-between mb-4">
                      <span style={{ background: TINT, borderRadius: 10, padding: '6px 10px', display: 'inline-flex' }}>
                        <IconComponent />
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
                );
              })}
            </div>

            {/* Tabela de Produtos */}
            <div className="overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4" style={{ background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg flex items-center gap-2" style={{ color: NAVY, fontWeight: 500 }}>
                    <span style={{fontSize:"18px"}}>📋</span>
                    Detalhamento dos Produtos
                  </h3>
                  <div className="text-sm" style={{ color: TXT2 }}>
                    {products.length} produtos encontrados
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: SOFT }}>
                      <th style={thStyle}>Produto</th>
                      <th style={thStyle}>Tipo</th>
                      <th style={thStyle}>Preço</th>
                      <th style={thStyle}>Estoque</th>
                      <th style={thStyle}>Valor Estoque</th>
                      <th style={thStyle}>Usos</th>
                      <th style={thStyle}>Receita Total</th>
                      <th style={thStyle}>Última Atualização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const productTreatments = treatments.filter(t => t.product?.id === product.id);
                      const productRevenue = productTreatments.reduce((acc, t) => acc + t.cost, 0);
                      const stockValue = product.price * product.stock;

                      return (
                        <tr
                          key={product.id}
                          className="transition-all duration-300"
                          style={{ borderBottom: `1px solid ${DIV}`, background: product.stock === 0 ? '#fdecec55' : product.stock < 10 ? '#fbeee255' : undefined }}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div style={{ ...getTypeColor(product.type), borderRadius: 10, padding: '6px 10px' }}>
                                <span style={{fontSize:"16px"}}>{getTypeEmoji(product.type)}</span>
                              </div>
                              <div>
                                <div style={{ color: TXT, fontWeight: 500 }}>{product.name}</div>
                                <div className="text-xs" style={{ color: TXT3 }}>
                                  ID: {product.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs" style={{ ...getTypeColor(product.type), fontWeight: 500 }}>
                              <span style={{fontSize:"14px"}}>{getTypeEmoji(product.type)}</span>
                              <span className="ml-1">{getTypeLabel(product.type)}</span>
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1" style={{ color: TXT, fontWeight: 500 }}>
                              <span style={{fontSize:"14px"}}>💰</span>
                              {formatCurrency(product.price)}
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs" style={{ ...getStockStyle(product.stock), fontWeight: 500 }}>
                              <span style={{fontSize:"14px"}}>📦</span>
                              <span className="ml-1">{product.stock} unidades</span>
                            </span>
                            {product.stock < 10 && product.stock > 0 && (
                              <div className="text-xs mt-1 flex items-center gap-1" style={{ color: '#b45f22' }}>
                                <span style={{fontSize:"12px"}}>⚠️</span>
                                Estoque baixo
                              </div>
                            )}
                            {product.stock === 0 && (
                              <div className="text-xs mt-1 flex items-center gap-1" style={{ color: '#a03426' }}>
                                <span style={{fontSize:"12px"}}>⚠️</span>
                                Sem estoque
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <div style={{ color: TXT, fontWeight: 500 }}>
                              {formatCurrency(stockValue)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs"
                                style={productTreatments.length > 0
                                  ? { background: TINT, color: NAVY, fontWeight: 500 }
                                  : { background: DIV, color: TXT3, fontWeight: 500 }}
                              >
                                <span style={{fontSize:"14px"}}>⚡</span>
                                {productTreatments.length} {productTreatments.length === 1 ? 'uso' : 'usos'}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div style={{ color: TXT, fontWeight: 500 }}>
                              {formatCurrency(productRevenue)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1" style={{ color: TXT2 }}>
                              <span style={{fontSize:"14px"}}>📅</span>
                              {formatDate(product.updatedAt)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {products.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <span style={{fontSize:"32px"}}>📦</span>
                    <p className="text-lg" style={{ color: TXT2 }}>Nenhum produto encontrado</p>
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
