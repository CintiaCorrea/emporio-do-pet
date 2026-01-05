'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuPackage,
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuX,
  LuPill,
  LuSyringe,
  LuTriangleAlert,
  LuDollarSign,
  LuBox,
  LuTrendingUp
} from 'react-icons/lu';

// Tipos baseados no schema Prisma (sem SERVICE)
type ProductType = 'MEDICINE' | 'VACCINE';

interface Treatment {
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
}

interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock: number;
  treatments: Treatment[];
  _count: {
    treatments: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProductStats {
  total: number;
  totalStock: number;
  totalValue: number;
  averagePrice: number;
  lowStockCount: number;
}

interface ApiResponse {
  products: Product[];
  stats: ProductStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'MEDICINE' as ProductType,
    price: 0,
    stock: 0
  });

  // Buscar products da API (excluindo SERVICE)
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (lowStockFilter) params.append('lowStock', 'true');
      
      const response = await fetch(`/api/products?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }
      
      const data: ApiResponse = await response.json();
      // Filtrar para remover produtos do tipo SERVICE
      const filteredProducts = data.products.filter(p => p.type !== 'SERVICE');
      setProducts(filteredProducts);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar products inicial
  useEffect(() => {
    fetchProducts();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, typeFilter, lowStockFilter]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Filtrar produtos localmente (backup)
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    const matchesLowStock = !lowStockFilter || product.stock < 10;

    return matchesSearch && matchesType && matchesLowStock;
  });

  // Estatísticas locais (sem serviços)
  const localStats = {
    total: products.length,
    medicines: products.filter(p => p.type === 'MEDICINE').length,
    vaccines: products.filter(p => p.type === 'VACCINE').length,
    lowStock: products.filter(p => p.stock < 10).length,
    totalStock: products.reduce((acc, p) => acc + p.stock, 0)
  };

  // Funções para manipular produtos
  const handleCreateProduct = async () => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchProducts();
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar produto');
      }
    } catch (err) {
      console.error('Erro ao criar product:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar produto');
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchProducts();
        setIsModalOpen(false);
        setIsEditMode(false);
        resetForm();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar produto');
      }
    } catch (err) {
      console.error('Erro ao atualizar product:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProducts();
        setIsModalOpen(false);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir produto');
      }
    } catch (err) {
      console.error('Erro ao excluir product:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      type: product.type,
      price: product.price,
      stock: product.stock
    });
    setIsModalOpen(true);
    setIsEditMode(false);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'MEDICINE',
      price: 0,
      stock: 0
    });
  };

  // Funções para obter cores e ícones baseados no tipo
  const getTypeColor = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return 'bg-blue-100 text-blue-800';
      case 'VACCINE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return LuPill;
      case 'VACCINE': return LuSyringe;
      default: return LuPackage;
    }
  };

  const getTypeLabel = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return 'Medicamento';
      case 'VACCINE': return 'Vacina';
      default: return type;
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock < 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
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

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando produtos...</p>
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
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Produtos
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie medicamentos e vacinas da clínica veterinária
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/erp/produtos/relatorio"
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuTrendingUp className="w-4 h-4" />
                    <span>Relatório</span>
                  </Link>
                  <button 
                    onClick={openCreateModal}
                    className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Novo Produto</span>
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
                  <LuX className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {[
                { 
                  label: "Total", 
                  value: localStats.total, 
                  color: "gray", 
                  icon: LuPackage
                },
                { 
                  label: "Medicamentos", 
                  value: localStats.medicines, 
                  color: "blue", 
                  icon: LuPill
                },
                { 
                  label: "Vacinas", 
                  value: localStats.vaccines, 
                  color: "green", 
                  icon: LuSyringe
                },
                { 
                  label: "Estoque Baixo", 
                  value: localStats.lowStock, 
                  color: "orange", 
                  icon: LuTriangleAlert
                },
                { 
                  label: "Itens em Estoque", 
                  value: localStats.totalStock, 
                  color: "teal", 
                  icon: LuBox
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
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
                      placeholder="Buscar por nome do produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as ProductType | 'all')}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="MEDICINE">Medicamentos</option>
                    <option value="VACCINE">Vacinas</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => setLowStockFilter(!lowStockFilter)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 hover:scale-105 ${
                      lowStockFilter 
                        ? 'text-white bg-orange-500 hover:bg-orange-600' 
                        : 'text-gray-600 bg-white/50 border border-gray-300/50 hover:bg-white hover:border-gray-400'
                    }`}
                  >
                    <LuTriangleAlert className="w-4 h-4" />
                    <span>Estoque Baixo</span>
                  </button>
                  
                  <button 
                    onClick={fetchProducts}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    <LuSearch className="w-4 h-4" />
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Catálogo de Produtos
                  </h3>
                  <div className="text-sm text-gray-600">
                    {filteredProducts.length} produtos encontrados
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Produto</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Tipo</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Preço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Estoque</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Uso em Tratamentos</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const TypeIcon = getTypeIcon(product.type);
                      
                      return (
                        <tr 
                          key={product.id} 
                          className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 group cursor-pointer"
                          onClick={() => openProductDetails(product)}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${getTypeColor(product.type)}`}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">
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
                              <LuBox className="w-3 h-3 mr-1" />
                              {product.stock} unidades
                            </span>
                            {product.stock < 10 && product.stock > 0 && (
                              <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
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
                            <div className="text-gray-700">
                              {product._count.treatments} tratamentos
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setFormData({
                                    name: product.name,
                                    type: product.type,
                                    price: product.price,
                                    stock: product.stock
                                  });
                                  setIsEditMode(true);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"
                                title="Editar produto"
                              >
                                <LuPencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 rounded-2xl transition-colors"
                                title="Excluir produto"
                              >
                                <LuTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredProducts.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <LuPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
                    <p className="text-gray-400 mt-2">
                      {products.length === 0 
                        ? 'Comece adicionando seu primeiro produto' 
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </div>
                
                <div className="flex items-center space-x-4">
                  <button className="px-4 py-2 text-sm text-gray-600 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 transition-all duration-300">
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">Página 1 de 1</span>
                  <button className="px-4 py-2 text-sm text-gray-600 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 transition-all duration-300">
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes/Edição do Produto */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Editar Produto' : 'Detalhes do Produto'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {isEditMode ? (
                // Edit Form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as ProductType})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                    >
                      <option value="MEDICINE">Medicamento</option>
                      <option value="VACCINE">Vacina</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estoque</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                      min="0"
                    />
                  </div>
                </div>
              ) : (
                // View Details
                <>
                  {/* Informações do Produto */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <LuPackage className="w-5 h-5 text-blue-600" />
                      Informações do Produto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nome</label>
                        <p className="text-gray-900">{selectedProduct.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Tipo</label>
                        <p className="text-gray-900">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedProduct.type)}`}>
                            {getTypeLabel(selectedProduct.type)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Preço</label>
                        <p className="text-gray-900 font-semibold">{formatCurrency(selectedProduct.price)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Estoque</label>
                        <p className="text-gray-900">{selectedProduct.stock} unidades</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Uso em Tratamentos</label>
                        <p className="text-gray-900">{selectedProduct._count.treatments} tratamentos</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Última Atualização</label>
                        <p className="text-gray-900">{formatDate(selectedProduct.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tratamentos Recentes */}
                  {selectedProduct.treatments.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Tratamentos Recentes</h4>
                      <div className="space-y-3">
                        {selectedProduct.treatments.map((treatment) => (
                          <div key={treatment.id} className="bg-gray-50 p-4 rounded-2xl">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{treatment.description}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Pet: {treatment.appointment.pet.name} • {formatDate(treatment.appointment.date)}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(treatment.cost)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateProduct}
                    className="px-6 py-3 text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    Salvar Alterações
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-6 py-3 text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <LuPencil className="w-4 h-4" />
                    Editar Produto
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Produto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Novo Produto</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                  placeholder="Ex: Vacina V10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as ProductType})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                >
                  <option value="MEDICINE">Medicamento</option>
                  <option value="VACCINE">Vacina</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estoque Inicial</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900"
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={!formData.name || formData.price < 0}
                className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuPlus className="w-4 h-4" />
                Criar Produto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
