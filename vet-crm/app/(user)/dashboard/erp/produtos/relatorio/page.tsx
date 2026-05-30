'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuArrowLeft,
  LuCalendar,
  LuDollarSign,
  LuDownload,
  LuFileText,
  LuTriangleAlert
} from 'react-icons/lu';
import toast from 'react-hot-toast';

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
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  const getTypeIcon = (type: ProductType) => {
    return type === 'MEDICINE' ? (() => null) : (() => null);
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock < 10) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
                    href="/dashboard/erp/produtos"
                    className="p-2 hover:bg-white/80 rounded-xl transition-colors"
                  >
                    <LuArrowLeft className="w-5 h-5 text-gray-600" />
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Relatório de Produtos
                    </h1>
                    <p className="text-gray-600 mt-2">
                      Análise detalhada de medicamentos e vacinas
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
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span style={{fontSize:"14px"}}>⌕</span>
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="all">Todos</option>
                    <option value="MEDICINE">Medicamentos</option>
                    <option value="VACCINE">Vacinas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estoque</label>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
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
                  color: "gray", 
                  icon: () => <span style={{fontSize:"14px"}}>📦</span>,
                  trend: null
                },
                { 
                  label: "Medicamentos", 
                  value: stats.medicines, 
                  color: "blue", 
                  icon: () => <span style={{fontSize:"14px"}}>💊</span>,
                  trend: stats.totalProducts > 0 ? ((stats.medicines / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Vacinas", 
                  value: stats.vaccines, 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>💉</span>,
                  trend: stats.totalProducts > 0 ? ((stats.vaccines / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Total em Estoque", 
                  value: stats.totalStock, 
                  color: "teal", 
                  icon: () => <span style={{fontSize:"14px"}}>📦</span>,
                  trend: null
                },
                { 
                  label: "Estoque Baixo", 
                  value: stats.lowStock, 
                  color: "orange", 
                  icon: LuTriangleAlert,
                  trend: stats.totalProducts > 0 ? ((stats.lowStock / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Sem Estoque", 
                  value: stats.outOfStock, 
                  color: "red", 
                  icon: () => null, 
                  trend: stats.totalProducts > 0 ? ((stats.outOfStock / stats.totalProducts) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Valor do Estoque", 
                  value: formatCurrency(stats.totalStockValue), 
                  color: "purple", 
                  icon: LuDollarSign,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Receita Total", 
                  value: formatCurrency(stats.totalRevenue), 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>📈</span>,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Preço Médio", 
                  value: formatCurrency(stats.averagePrice), 
                  color: "blue", 
                  icon: LuDollarSign,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Estoque Médio", 
                  value: `${Math.round(stats.averageStock)} unidades`, 
                  color: "indigo", 
                  icon: () => <span style={{fontSize:"14px"}}>📦</span>,
                  trend: null
                },
                { 
                  label: "Total de Usos", 
                  value: stats.totalTreatments, 
                  color: "cyan", 
                  icon: () => <span style={{fontSize:"14px"}}>⚡</span>,
                  trend: null
                },
                { 
                  label: "Produto Mais Usado", 
                  value: stats.mostUsedProduct.name || 'N/A', 
                  color: "blue", 
                  icon: () => <span style={{fontSize:"14px"}}>✓</span>,
                  trend: stats.mostUsedProduct.count > 0 ? `${stats.mostUsedProduct.count} usos` : null,
                  isText: true
                },
                { 
                  label: "Maior Receita", 
                  value: stats.highestRevenueProduct.name || 'N/A', 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>📈</span>,
                  trend: stats.highestRevenueProduct.revenue > 0 ? formatCurrency(stats.highestRevenueProduct.revenue) : null,
                  isText: true
                }
              ].map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                        <IconComponent className={`w-6 h-6 text-${stat.color}-600`} />
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
                );
              })}
            </div>

            {/* Tabela de Produtos */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <LuFileText className="w-5 h-5" />
                    Detalhamento dos Produtos
                  </h3>
                  <div className="text-sm text-gray-600">
                    {products.length} produtos encontrados
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Produto</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Tipo</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Preço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Estoque</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Valor Estoque</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Usos</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Receita Total</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Última Atualização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const TypeIcon = getTypeIcon(product.type);
                      const productTreatments = treatments.filter(t => t.product?.id === product.id);
                      const productRevenue = productTreatments.reduce((acc, t) => acc + t.cost, 0);
                      const stockValue = product.price * product.stock;
                      
                      return (
                        <tr 
                          key={product.id} 
                          className={`border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 ${
                            product.stock === 0 ? 'bg-red-50/30' : product.stock < 10 ? 'bg-orange-50/30' : ''
                          }`}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${getTypeColor(product.type)}`}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{product.name}</div>
                                <div className="text-xs text-gray-500">
                                  ID: {product.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(product.type)}`}>
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {getTypeLabel(product.type)}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900 flex items-center gap-1">
                              <LuDollarSign className="w-4 h-4 text-green-600" />
                              {formatCurrency(product.price)}
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStockColor(product.stock)}`}>
                              <span style={{fontSize:"14px"}}>📦</span>
                              {product.stock} unidades
                            </span>
                            {product.stock < 10 && product.stock > 0 && (
                              <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                <LuTriangleAlert className="w-3 h-3" />
                                Estoque baixo
                              </div>
                            )}
                            {product.stock === 0 && (
                              <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                <LuTriangleAlert className="w-3 h-3" />
                                Sem estoque
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(stockValue)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                productTreatments.length > 0 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <span style={{fontSize:"14px"}}>⚡</span>
                                {productTreatments.length} {productTreatments.length === 1 ? 'uso' : 'usos'}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(productRevenue)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1 text-gray-600">
                              <span style={{fontSize:"14px"}}>⏱</span>
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
                    <span style={{fontSize:"14px"}}>📦</span>
                    <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
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


