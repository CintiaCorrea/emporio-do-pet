// Estoque no padrao Base44 (bege + emojis). Roupagem repaginada 04/07 — LOGICA 100% preservada.
'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usePodeEditar } from "@/lib/permissions/context";

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const ORANGE = '#D85A30';    // coral (estoque baixo / saidas)
const GREEN = '#0f6e56';     // sucesso
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '12px 18px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '12px 18px', borderBottom: `1px solid ${DIV}` };
const inp: React.CSSProperties = { width: '100%', padding: '9px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff' };
const lbl: React.CSSProperties = { fontSize: 13, color: TXT2, display: 'block', marginBottom: 6 };

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
  const podeEditar = usePodeEditar();
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
      params.append('excludeService', '1'); // estoque = só itens estocáveis (catálogo unificado)
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
  const getStockStatus = (product: Product): { label: string; style: React.CSSProperties } => {
    if (product.stock === 0) return { label: 'Sem Estoque', style: { background: '#fef0e8', color: ORANGE } };
    if (product.stock < 10) return { label: 'Estoque Baixo', style: { background: '#fdf6e3', color: '#854F0B' } };
    return { label: 'Normal', style: { background: '#e1f5ee', color: GREEN } };
  };

  const getTypeIcon = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return '💊';
      case 'VACCINE': return '💉';
      default: return '📦';
    }
  };

  const getTypeLabel = (type: ProductType) => {
    switch (type) {
      case 'MEDICINE': return 'Medicamento';
      case 'VACCINE': return 'Vacina';
      default: return type;
    }
  };

  const getTypeColor = (type: ProductType): React.CSSProperties => {
    switch (type) {
      case 'MEDICINE': return { background: TINT, color: TEAL_DARK };
      case 'VACCINE': return { background: '#e1f5ee', color: GREEN };
      default: return { background: DIV, color: TXT2 };
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
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>📦</div>
          <p style={{ marginTop: 12, color: TXT2 }}>Carregando estoque...</p>
        </div>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: '14px 15px' };

  return (
    <div style={{ minHeight: '100vh', background: BG, width: '100%', overflow: 'hidden' }}>
      {/* Main Content */}
      <div style={{ padding: 24 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📦</span> Estoque
                  </h1>
                  <p style={{ color: TXT2, marginTop: 6, fontSize: 13.5 }}>
                    Controle de estoque de medicamentos e vacinas
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {!podeEditar && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: TXT3 }}>👁️ Somente leitura</span>
                  )}
                  <button
                    onClick={() => {
                      fetchProducts();
                      fetchMovements();
                      toast.success('Dados atualizados!');
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 12.5, fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
                  >
                    <span>↻</span>
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ marginBottom: 24, padding: 16, background: '#fef0e8', border: `1px solid ${ORANGE}`, borderRadius: 12, color: '#993C1D' }}>
                {error}
                <button
                  onClick={() => setError(null)}
                  style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', color: ORANGE, fontSize: 14 }}
                >
                  <span>✕</span>
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: "Produtos", value: stats.totalProducts, emoji: "📦" },
                { label: "Itens em Estoque", value: stats.totalItems, emoji: "📦" },
                { label: "Estoque Baixo", value: stats.lowStock, emoji: "⚠️" },
                { label: "Sem Estoque", value: stats.outOfStock, emoji: "📉" },
                { label: "Valor Total", value: formatCurrency(stats.totalValue), emoji: "🏬", isFormatted: true }
              ].map((stat, index) => (
                <div key={index} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{stat.emoji}</span>
                    <div style={{ fontWeight: 500, color: TEAL_DARK, fontSize: stat.isFormatted ? 18 : 26 }}>
                      {stat.value}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: TXT3, textTransform: 'uppercase', letterSpacing: '.03em', margin: 0 }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 15 }}>🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ ...inp, paddingLeft: 36 }}
                    />
                  </div>

                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value as ProductType | 'all');
                      fetchProducts();
                    }}
                    style={{ ...inp, width: 'auto' }}
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
                    style={{ ...inp, width: 'auto' }}
                  >
                    <option value="all">Todos os Status</option>
                    <option value="ok">Estoque Normal</option>
                    <option value="low">Estoque Baixo</option>
                    <option value="out">Sem Estoque</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', fontSize: 12.5, fontWeight: 500, borderRadius: 9, cursor: 'pointer', ...(stockFilter === 'low' ? { color: '#fff', background: ORANGE, border: 'none' } : { color: TXT2, background: '#fff', border: `1px solid ${LINE}` }) }}
                  >
                    <span>⚠️</span>
                    <span>Alertas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
                    Controle de Estoque
                  </h3>
                  <div style={{ fontSize: 12.5, color: TXT2 }}>
                    {filteredProducts.length} produtos encontrados
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Produto</th>
                      <th style={thStyle}>Tipo</th>
                      <th style={thStyle}>Estoque</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Valor</th>
                      <th style={thStyle}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const typeIcon = getTypeIcon(product.type);
                      const stockStatus = getStockStatus(product);
                      const stockPercentage = Math.min((product.stock / 100) * 100, 100);

                      return (
                        <tr
                          key={product.id}
                          style={product.stock === 0 ? { background: '#fef0e8' } : product.stock < 10 ? { background: '#fdf6e3' } : undefined}
                        >
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ padding: 8, borderRadius: 10, display: 'inline-flex', ...getTypeColor(product.type) }}>
                                <span style={{ fontSize: 16 }}>{typeIcon}</span>
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, color: TXT }}>{product.name}</div>
                                <div style={{ fontSize: 12, color: TXT3 }}>
                                  {formatCurrency(product.price)} / unidade
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, ...getTypeColor(product.type) }}>
                              {getTypeLabel(product.type)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 17, fontWeight: 500, color: TXT }}>{product.stock}</span>
                                  <span style={{ fontSize: 12.5, color: TXT3 }}>unidades</span>
                                </div>
                                <div style={{ width: 96, height: 8, background: DIV, borderRadius: 999, overflow: 'hidden' }}>
                                  <div
                                    style={{ height: '100%', borderRadius: 999, width: `${Math.min(stockPercentage, 100)}%`, background: product.stock === 0 ? ORANGE : product.stock < 10 ? '#D9A400' : GREEN }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, ...stockStatus.style }}>
                              {stockStatus.label}
                            </span>
                            {product.updatedAt && (
                              <div style={{ fontSize: 11, color: TXT3, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>📅</span>
                                {formatDate(product.updatedAt)}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 500, color: TXT }}>
                              {formatCurrency(product.stock * product.price)}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {podeEditar && (
                                <>
                                  <button
                                    onClick={() => openMovementModal(product, 'IN')}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, fontSize: 15, lineHeight: 1 }}
                                    title="Entrada"
                                  >
                                    <span>📥</span>
                                  </button>
                                  <button
                                    onClick={() => openMovementModal(product, 'OUT')}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, fontSize: 15, lineHeight: 1, opacity: product.stock === 0 ? 0.4 : 1 }}
                                    title="Saída"
                                    disabled={product.stock === 0}
                                  >
                                    <span>📤</span>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openHistory(product)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, fontSize: 15, lineHeight: 1 }}
                                title="Histórico"
                              >
                                <span>⏳</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredProducts.length === 0 && !loading && (
                  <div style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 30 }}>🏬</div>
                    <p style={{ color: TXT2, fontSize: 16, margin: '10px 0 0' }}>Nenhum produto encontrado</p>
                    <p style={{ color: TXT3, marginTop: 6 }}>Tente ajustar os filtros de busca</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderTop: `1px solid ${LINE}`, background: SOFT, gap: 12 }}>
                <div style={{ fontSize: 12.5, color: TXT2 }}>
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </div>
              </div>
            </div>

            {/* Últimas Movimentações */}
            <div style={{ marginTop: 24, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span>⏳</span>
                  Últimas Movimentações
                </h3>
              </div>
              <div>
                {movements.slice(0, 5).map((movement) => (
                  <div key={movement.id} style={{ padding: 16, borderBottom: `1px solid ${DIV}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 8, borderRadius: 10, display: 'inline-flex', ...(movement.type === 'IN' ? { background: '#e1f5ee', color: GREEN } : { background: '#fef0e8', color: ORANGE }) }}>
                          {movement.type === 'IN' ? <span style={{ fontSize: 15 }}>📥</span> : <span style={{ fontSize: 15 }}>📤</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: TXT }}>
                            {movement.type === 'IN' ? '+' : '-'}{movement.quantity} {movement.productName}
                          </div>
                          <div style={{ fontSize: 12.5, color: TXT3 }}>{movement.reason || 'Movimentação de estoque'}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12.5, color: TXT2 }}>{formatDateTime(movement.date)}</div>
                        <div style={{ fontSize: 11, color: TXT3 }}>{movement.user}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {movements.length === 0 && (
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 30 }}>⏳</div>
                    <p style={{ color: TXT2, margin: '10px 0 0' }}>Nenhuma movimentação registrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Movimentação */}
      {isMovementModalOpen && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 448, width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
                  {movementType === 'IN' ? 'Entrada de Estoque' : 'Saída de Estoque'}
                </h3>
                <button
                  onClick={() => setIsMovementModalOpen(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, padding: 14, borderRadius: 12 }}>
                <div style={{ fontWeight: 500, color: TXT }}>{selectedProduct.name}</div>
                <div style={{ fontSize: 12.5, color: TXT3 }}>
                  Estoque atual: {selectedProduct.stock} unidades
                </div>
              </div>

              <div>
                <label style={lbl}>Quantidade</label>
                <input
                  type="number"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({...movementForm, quantity: parseInt(e.target.value) || 0})}
                  min="1"
                  max={movementType === 'OUT' ? selectedProduct.stock : undefined}
                  style={inp}
                />
              </div>

              <div>
                <label style={lbl}>Motivo</label>
                <input
                  type="text"
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({...movementForm, reason: e.target.value})}
                  placeholder={movementType === 'IN' ? 'Ex: Compra - NF 12345' : 'Ex: Consulta #456'}
                  style={inp}
                />
              </div>

              <div style={{ background: TINT, padding: 14, borderRadius: 12 }}>
                <div style={{ fontSize: 12.5, color: TEAL_DARK }}>Novo estoque após movimentação:</div>
                <div style={{ fontSize: 19, fontWeight: 500, color: TEAL_DARK }}>
                  {movementType === 'IN'
                    ? selectedProduct.stock + movementForm.quantity
                    : selectedProduct.stock - movementForm.quantity
                  } unidades
                </div>
              </div>
            </div>

            <div style={{ padding: '15px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                style={{ padding: '9px 16px', borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', color: TXT2, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleMovement}
                disabled={movementForm.quantity <= 0 || (movementType === 'OUT' && movementForm.quantity > selectedProduct.stock)}
                style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: movementType === 'IN' ? TEAL : ORANGE, opacity: (movementForm.quantity <= 0 || (movementType === 'OUT' && movementForm.quantity > selectedProduct.stock)) ? 0.5 : 1 }}
              >
                {movementType === 'IN' ? <span>📥</span> : <span>📤</span>}
                Confirmar {movementType === 'IN' ? 'Entrada' : 'Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {isHistoryModalOpen && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '80vh', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>Histórico de Movimentações</h3>
                  <p style={{ fontSize: 12.5, color: TXT3, margin: '2px 0 0' }}>{selectedProduct.name}</p>
                </div>
                <button
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    fetchMovements(); // Recarregar todas as movimentações
                  }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {productMovements.length > 0 ? (
                <div>
                  {productMovements.map((movement) => (
                    <div key={movement.id} style={{ padding: 16, borderBottom: `1px solid ${DIV}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ padding: 8, borderRadius: 10, display: 'inline-flex', ...(movement.type === 'IN' ? { background: '#e1f5ee', color: GREEN } : { background: '#fef0e8', color: ORANGE }) }}>
                            {movement.type === 'IN' ? <span style={{ fontSize: 15 }}>📥</span> : <span style={{ fontSize: 15 }}>📤</span>}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: TXT }}>
                              {movement.type === 'IN' ? '+' : '-'}{movement.quantity} unidades
                            </div>
                            <div style={{ fontSize: 12.5, color: TXT3 }}>{movement.reason || 'Movimentação de estoque'}</div>
                            <div style={{ fontSize: 11, color: TXT3 }}>
                              {movement.previousStock} → {movement.newStock} unidades
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12.5, color: TXT2 }}>{formatDateTime(movement.date)}</div>
                          <div style={{ fontSize: 11, color: TXT3 }}>{movement.user}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 30 }}>⏳</div>
                  <p style={{ color: TXT2, margin: '10px 0 0' }}>Nenhuma movimentação registrada</p>
                </div>
              )}
            </div>

            <div style={{ padding: '15px 20px', borderTop: `1px solid ${DIV}` }}>
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  fetchMovements(); // Recarregar todas as movimentações
                }}
                style={{ width: '100%', padding: '9px 16px', borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', color: TXT2, cursor: 'pointer' }}
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
