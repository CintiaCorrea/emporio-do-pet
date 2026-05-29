'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  LuSearch,
  LuPlus
  LuTriangleAlert
  LuCalendar
} from 'react-icons/lu';

// Tipos
type ProductType = 'MEDICINE' | 'VACCINE';
type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  date: string;
  user: string;
  userId?: string;
  userName?: string;
}

interface ApiProduct {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    treatments: number;
  };
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  
  // Form state
  const [movementForm, setMovementForm] = useState({
    quantity: 1,
    reason: ''
  });

  // Carregar dados da API
  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', '1000');
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (stockFilter === 'low') params.append('lowStock', 'true');
      
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar produtos');
      
      const data = await response.json();
      // Filtrar apenas produtos (excluir serviços)
      const productsList = (data.products || []).filter((p: ApiProduct) => p.type !== 'SERVICE');
      
      // Converter para formato da interface Product
      const formattedProducts: Product[] = productsList.map((p: ApiProduct) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        price: p.price,
        stock: p.stock,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
      
      setProducts(formattedProducts);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/stock/movements?limit=100');
      if (!response.ok) throw new Error('Erro ao carregar movimentações');
      
      const data = await response.json();
      const formattedMovements: StockMovement[] = (data.movements || []).map((m: any) => ({
        id: m.id,
        productId: m.productId,
        productName: m.productName,
        type: m.type,
        quantity: m.quantity,
        previousStock: m.previousStock,
        newStock: m.newStock,
        reason: m.reason || '',
        date: m.createdAt,
        user: m.userName || m.user || 'Sistema',
        userId: m.userId,
        userName: m.userName
      }));
      
      setMovements(formattedMovements);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
      // Não mostrar erro para movimentações, apenas logar
    }
  };


  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = product.stock > 0 && product.stock < 10;
    } else if (stockFilter === 'out') {
      matchesStock = product.stock === 0;
    } else if (stockFilter === 'ok') {
      matchesStock = product.stock >= 10;
    }

    return matchesSearch && matchesType && matchesStock;
  });

  // Estatísticas
  const stats = {
    totalProducts: products.length,
    totalItems: products.reduce((acc, p) => acc + p.stock, 0),
    lowStock: products.filter(p => p.stock > 0 && p.stock < 10).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((acc, p) => acc + (p.stock * p.price), 0)
  };

  // Funções auxiliares
  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { label: 'Sem Estoque', color: 'bg-red-100 text-red-800' };
    if (product.stock < 10) return { label: 'Estoque Baixo', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Normal', color: 'bg-green-100 text-green-800' };
  };

  const getTypeIcon = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return;
      case 'VACCINE': return;
      default: return;
    }
  };

  const getTypeLabel = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return 'Medicamento';
      case 'VACCINE': return 'Vacina';
      default: return type;
    }
  };

  const getTypeColor = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return 'bg-blue-100 text-blue-800';
      case 'VACCINE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Abrir modal de movimentação
  const openMovementModal = (product: Product, type: 'IN' | 'OUT') => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementForm({ quantity: 1, reason: '' });
    setIsMovementModalOpen(true);
  };

  // Registrar movimentação
  const handleMovement = async () => {
    if (!selectedProduct || movementForm.quantity <= 0) return;

    const newStock = movementType === 'IN' 
      ? selectedProduct.stock + movementForm.quantity
      : selectedProduct.stock - movementForm.quantity;

    if (newStock < 0) {
      setError('Quantidade insuficiente em estoque');
      toast.error('Quantidade insuficiente em estoque');
      return;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          productId: selectedProduct.id,
          type: movementType,
          quantity: movementForm.quantity,
          reason: movementForm.reason || (movementType === 'IN' ? 'Entrada de estoque' : 'Saída de estoque')
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar movimentação');
      }

      const newMovement = await response.json();

      // Atualizar produto localmente
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, stock: newStock }
          : p
      ));

      // Adicionar movimentação à lista
      setMovements([{
        id: newMovement.id,
        productId: newMovement.productId,
        productName: newMovement.productName,
        type: newMovement.type,
        quantity: newMovement.quantity,
        previousStock: newMovement.previousStock,
        newStock: newMovement.newStock,
        reason: newMovement.reason || '',
        date: newMovement.createdAt,
        user: newMovement.userName || 'Sistema',
        userId: newMovement.userId,
        userName: newMovement.userName
      }, ...movements]);

      setIsMovementModalOpen(false);
      setSelectedProduct(null);
      setMovementForm({ quantity: 1, reason: '' });
      
      toast.success(`Movimentação de ${movementType === 'IN' ? 'entrada' : 'saída'} registrada com sucesso!`);
    } catch (err) {
      console.error('Erro ao registrar movimentação:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Abrir histórico
  const openHistory = async (product: Product) => {
    setSelectedProduct(product);
    setIsHistoryModalOpen(true);
    
    // Buscar movimentações específicas do produto
    try {
      const response = await fetch(`/api/stock/movements/${product.id}`);
      if (response.ok) {
        const data = await response.json();
        const formattedMovements: StockMovement[] = (data || []).map((m: any) => ({
          id: m.id,
          productId: m.productId,
          productName: m.productName,
          type: m.type,
          quantity: m.quantity,
          previousStock: m.previousStock,
          newStock: m.newStock,
          reason: m.reason || '',
          date: m.createdAt,
          user: m.userName || m.user || 'Sistema',
          userId: m.userId,
          userName: m.userName
        }));
        setMovements(formattedMovements);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  // Movimentações do produto selecionado
  const productMovements = selectedProduct 
    ? movements.filter(m => m.productId === selectedProduct.id)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Estoque
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Controle de estoque de medicamentos e vacinas
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      fetchProducts();
                      fetchMovements();
                      toast.success('Dados atualizados!');
                    }}
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <span style={{fontSize:"14px"}}>↻</span>
                    <span>Atualizar</span>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {[
                { 
                  label: "Produtos", 
                  value: stats.totalProducts, 
                  color: "gray", 
                  icon: () => <span style={{fontSize:"14px"}}>📦</span>
                },
                { 
                  label: "Itens em Estoque", 
                  value: stats.totalItems, 
                  color: "blue", 
                  icon: () => <span style={{fontSize:"14px"}}>📦</span>
                },
                { 
                  label: "Estoque Baixo", 
                  value: stats.lowStock, 
                  color: "yellow", 
                  icon: LuTriangleAlert
                },
                { 
                  label: "Sem Estoque", 
                  value: stats.outOfStock, 
                  color: "red", 
                  icon: () => <span style={{fontSize:"14px"}}>📉</span>
                },
                { 
                  label: "Valor Total", 
                  value: formatCurrency(stats.totalValue), 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>🏬</span>,
                  isFormatted: true
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-orange-500/5 p-6 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    <div className={`font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent ${stat.isFormatted ? 'text-lg' : 'text-2xl'}`}>
                      {stat.value}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-orange-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value as ProductType | 'all');
                      fetchProducts();
                    }}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="MEDICINE">Medicamentos</option>
                    <option value="VACCINE">Vacinas</option>
                  </select>

                  <select
                    value={stockFilter}
                    onChange={(e) => {
                      setStockFilter(e.target.value as 'all' | 'low' | 'out' | 'ok');
                    }}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="ok">Estoque Normal</option>
                    <option value="low">Estoque Baixo</option>
                    <option value="out">Sem Estoque</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 hover:scale-105 ${
                      stockFilter === 'low'
                        ? 'text-white bg-yellow-500 hover:bg-yellow-600' 
                        : 'text-gray-600 bg-white/50 border border-gray-300/50 hover:bg-white hover:border-gray-400'
                    }`}
                  >
                    <LuTriangleAlert className="w-4 h-4" />
                    <span>Alertas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-orange-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Controle de Estoque
                  </h3>
                  <div className="text-sm text-gray-600">
                    {filteredProducts.length} produtos encontrados
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Produto</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Tipo</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Estoque</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Valor</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const TypeIcon = getTypeIcon(product.type);
                      const stockStatus = getStockStatus(product);
                      const stockPercentage = Math.min((product.stock / 100) * 100, 100);
                      
                      return (
                        <tr 
                          key={product.id} 
                          className={`border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 ${
                            product.stock === 0 ? 'bg-red-50/30' : 
                            product.stock < 10 ? 'bg-yellow-50/30' : ''
                          }`}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${getTypeColor(product.type)}`}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(product.price)} / unidade
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(product.type)}`}>
                              {getTypeLabel(product.type)}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg font-bold text-gray-900">{product.stock}</span>
                                  <span className="text-sm text-gray-500">unidades</span>
                                </div>
                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      product.stock === 0 ? 'bg-red-500' :
                                      product.stock < 10 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                              {stockStatus.label}
                            </span>
                            {product.updatedAt && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <LuCalendar className="w-3 h-3" />
                                {formatDate(product.updatedAt)}
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(product.stock * product.price)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openMovementModal(product, 'IN')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                                title="Entrada"
                              >
                                <LuPlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openMovementModal(product, 'OUT')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Saída"
                                disabled={product.stock === 0}
                              >
                                <span style={{fontSize:"14px"}}>−</span>
                              </button>
                              <button
                                onClick={() => openHistory(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="Histórico"
                              >
                                <span style={{fontSize:"14px"}}>⏳</span>
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
                    <span style={{fontSize:"14px"}}>🏬</span>
                    <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
                    <p className="text-gray-400 mt-2">Tente ajustar os filtros de busca</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </div>
              </div>
            </div>

            {/* Últimas Movimentações */}
            <div className="mt-6 bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-orange-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span style={{fontSize:"14px"}}>⏳</span>
                  Últimas Movimentações
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {movements.slice(0, 5).map((movement) => (
                  <div key={movement.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          movement.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {movement.type === 'IN' ? <span style={{fontSize:"14px"}}>↘</span> : <span style={{fontSize:"14px"}}>↗</span>}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {movement.type === 'IN' ? '+' : '-'}{movement.quantity} {movement.productName}
                          </div>
                          <div className="text-sm text-gray-500">{movement.reason || 'Movimentação de estoque'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{formatDateTime(movement.date)}</div>
                        <div className="text-xs text-gray-400">{movement.user}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {movements.length === 0 && (
                  <div className="p-12 text-center">
                    <span style={{fontSize:"14px"}}>⏳</span>
                    <p className="text-gray-500">Nenhuma movimentação registrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Movimentação */}
      {isMovementModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {movementType === 'IN' ? 'Entrada de Estoque' : 'Saída de Estoque'}
                </h3>
                <button
                  onClick={() => setIsMovementModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <div className="font-semibold text-gray-900">{selectedProduct.name}</div>
                <div className="text-sm text-gray-500">
                  Estoque atual: {selectedProduct.stock} unidades
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                <input
                  type="number"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({...movementForm, quantity: parseInt(e.target.value) || 0})}
                  min="1"
                  max={movementType === 'OUT' ? selectedProduct.stock : undefined}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                <input
                  type="text"
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({...movementForm, reason: e.target.value})}
                  placeholder={movementType === 'IN' ? 'Ex: Compra - NF 12345' : 'Ex: Consulta #456'}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 text-gray-900"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl">
                <div className="text-sm text-gray-600">Novo estoque após movimentação:</div>
                <div className="text-xl font-bold text-gray-900">
                  {movementType === 'IN' 
                    ? selectedProduct.stock + movementForm.quantity 
                    : selectedProduct.stock - movementForm.quantity
                  } unidades
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMovement}
                disabled={movementForm.quantity <= 0 || (movementType === 'OUT' && movementForm.quantity > selectedProduct.stock)}
                className={`px-6 py-3 text-white rounded-2xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  movementType === 'IN' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {movementType === 'IN' ? <LuPlus className="w-4 h-4" /> : <span style={{fontSize:"14px"}}>−</span>}
                Confirmar {movementType === 'IN' ? 'Entrada' : 'Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {isHistoryModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Histórico de Movimentações</h3>
                  <p className="text-sm text-gray-500">{selectedProduct.name}</p>
                </div>
                <button
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    fetchMovements(); // Recarregar todas as movimentações
                  }}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh]">
              {productMovements.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {productMovements.map((movement) => (
                    <div key={movement.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${
                            movement.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {movement.type === 'IN' ? <span style={{fontSize:"14px"}}>↘</span> : <span style={{fontSize:"14px"}}>↗</span>}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {movement.type === 'IN' ? '+' : '-'}{movement.quantity} unidades
                            </div>
                            <div className="text-sm text-gray-500">{movement.reason || 'Movimentação de estoque'}</div>
                            <div className="text-xs text-gray-400">
                              {movement.previousStock} → {movement.newStock} unidades
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{formatDateTime(movement.date)}</div>
                          <div className="text-xs text-gray-400">{movement.user}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <span style={{fontSize:"14px"}}>⏳</span>
                  <p className="text-gray-500">Nenhuma movimentação registrada</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  fetchMovements(); // Recarregar todas as movimentações
                }}
                className="w-full px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
