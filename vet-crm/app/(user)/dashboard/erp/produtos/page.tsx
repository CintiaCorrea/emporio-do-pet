// Produtos no padrao Base44 (bege + emojis). Roupagem repaginada 04/07 — LOGICA 100% preservada.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';

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

const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '8px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '12px 8px', borderBottom: `1px solid ${DIV}` };
const inp: React.CSSProperties = { width: '100%', padding: '9px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff' };
const lbl: React.CSSProperties = { fontSize: 13, color: TXT2, display: 'block', marginBottom: 6 };

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
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
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
      params.append('excludeService', '1'); // tela de Produtos = só itens estocáveis (catálogo unificado)
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
          'Content-Type': 'application/json'},
        body: JSON.stringify(formData)});

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
          'Erro ao criar produto';
        throw new Error(String(message));
      }

      toast.success('Produto cadastrado com sucesso!');
      fetchProducts();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao criar product:', err);
      const message = err instanceof Error ? err.message : 'Erro ao criar produto';
      setError(message);
      toast.error(message);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(formData)});

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
          'Erro ao atualizar produto';
        throw new Error(String(message));
      }

      toast.success('Produto atualizado com sucesso!');
      fetchProducts();
      setIsModalOpen(false);
      setIsEditMode(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao atualizar product:', err);
      const message = err instanceof Error ? err.message : 'Erro ao atualizar produto';
      setError(message);
      toast.error(message);
    }
  };

  const requestDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    const res = await fetch(`/api/products/${productToDelete.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
        'Erro ao excluir produto';
      throw new Error(message);
    }

    await fetchProducts();
    setIsModalOpen(false);
    toast.success('Produto excluído com sucesso!');
    setProductToDelete(null);
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
  const getTypeColor = (type: ProductType): React.CSSProperties => {
    switch (type) {
      case 'MEDICINE': return { background: TINT, color: TEAL_DARK };
      case 'VACCINE': return { background: '#e1f5ee', color: GREEN };
      default: return { background: DIV, color: TXT2 };
    }
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

  const getStockColor = (stock: number): React.CSSProperties => {
    if (stock === 0) return { background: '#fef0e8', color: ORANGE };
    if (stock < 10) return { background: '#fdf6e3', color: '#854F0B' };
    return { background: '#e1f5ee', color: GREEN };
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
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>📦</div>
          <p style={{ marginTop: 12, color: TXT2 }}>Carregando produtos...</p>
        </div>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: '14px 15px' };

  return (
    <div style={{ minHeight: '100vh', background: BG, width: '100%', overflow: 'hidden' }}>
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        entityLabel="Produto"
        itemName={productToDelete?.name || '—'}
        consequenceText="Esta ação não pode ser desfeita. Os dados do produto serão removidos."
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
      />
      {/* Main Content */}
      <div style={{ padding: 24 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📦</span> Produtos
                  </h1>
                  <p style={{ color: TXT2, marginTop: 6, fontSize: 13.5 }}>
                    Gerencie medicamentos e vacinas da clínica veterinária
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link
                    href="/dashboard/erp/produtos/relatorio"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 12.5, fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, textDecoration: 'none' }}
                  >
                    <span>📈</span>
                    <span>Relatório</span>
                  </Link>
                  <button
                    onClick={openCreateModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 12.5, fontWeight: 500, color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer' }}
                  >
                    <span>➕</span>
                    <span>Novo Produto</span>
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
                { label: "Total", value: localStats.total, emoji: "📦" },
                { label: "Medicamentos", value: localStats.medicines, emoji: "💊" },
                { label: "Vacinas", value: localStats.vaccines, emoji: "💉" },
                { label: "Estoque Baixo", value: localStats.lowStock, emoji: "⚠️" },
                { label: "Itens em Estoque", value: localStats.totalStock, emoji: "📦" }
              ].map((stat, index) => (
                <div key={index} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{stat.emoji}</span>
                    <div style={{ fontSize: 26, fontWeight: 500, color: TEAL_DARK }}>
                      {stat.value}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: TXT3, textTransform: 'uppercase', letterSpacing: '.03em', margin: 0 }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters and Search */}
            <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 15 }}>🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nome do produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ ...inp, paddingLeft: 36 }}
                    />
                  </div>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as ProductType | 'all')}
                    style={{ ...inp, width: 'auto' }}
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="MEDICINE">Medicamentos</option>
                    <option value="VACCINE">Vacinas</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setLowStockFilter(!lowStockFilter)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', fontSize: 12.5, fontWeight: 500, borderRadius: 9, cursor: 'pointer', ...(lowStockFilter ? { color: '#fff', background: ORANGE, border: 'none' } : { color: TXT2, background: '#fff', border: `1px solid ${LINE}` }) }}
                  >
                    <span>⚠️</span>
                    <span>Estoque Baixo</span>
                  </button>

                  <button
                    onClick={fetchProducts}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', fontSize: 12.5, fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
                  >
                    <span>🔍</span>
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, overflow: 'hidden' }}>
              {/* Table Header */}
              <div style={{ padding: '14px 18px', background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
                    Catálogo de Produtos
                  </h3>
                  <div style={{ fontSize: 12.5, color: TXT2 }}>
                    {filteredProducts.length} produtos encontrados
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, padding: '12px 18px' }}>Produto</th>
                      <th style={{ ...thStyle, padding: '12px 18px' }}>Tipo</th>
                      <th style={{ ...thStyle, padding: '12px 18px' }}>Preço</th>
                      <th style={{ ...thStyle, padding: '12px 18px' }}>Estoque</th>
                      <th style={{ ...thStyle, padding: '12px 18px' }}>Uso em Tratamentos</th>
                      <th style={{ ...thStyle, padding: '12px 18px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const typeIcon = getTypeIcon(product.type);

                      return (
                        <tr
                          key={product.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openProductDetails(product)}
                        >
                          <td style={{ ...tdStyle, padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ padding: 8, borderRadius: 10, display: 'inline-flex', ...getTypeColor(product.type) }}>
                                <span style={{ fontSize: 16 }}>{typeIcon}</span>
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, color: TXT }}>{product.name}</div>
                                <div style={{ fontSize: 12, color: TXT3 }}>
                                  ID: {product.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, padding: '12px 18px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, ...getTypeColor(product.type) }}>
                              <span style={{ fontSize: 12 }}>{typeIcon}</span>
                              {getTypeLabel(product.type)}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, padding: '12px 18px' }}>
                            <div style={{ fontWeight: 500, color: TXT, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 13 }}>🏷️</span>
                              {formatCurrency(product.price)}
                            </div>
                          </td>
                          <td style={{ ...tdStyle, padding: '12px 18px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, ...getStockColor(product.stock) }}>
                              <span style={{ fontSize: 12 }}>📦</span>
                              {product.stock} unidades
                            </span>
                            {product.stock < 10 && product.stock > 0 && (
                              <div style={{ fontSize: 11, color: ORANGE, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>⚠️</span>
                                Estoque baixo
                              </div>
                            )}
                            {product.stock === 0 && (
                              <div style={{ fontSize: 11, color: ORANGE, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>⚠️</span>
                                Sem estoque
                              </div>
                            )}
                          </td>
                          <td style={{ ...tdStyle, padding: '12px 18px' }}>
                            <div style={{ color: TXT2 }}>
                              {product._count.treatments} tratamentos
                            </div>
                          </td>
                          <td style={{ ...tdStyle, padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
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
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, fontSize: 15, lineHeight: 1 }}
                                title="Editar produto"
                              >
                                <span>✏️</span>
                              </button>
                              <button
                                onClick={() => requestDeleteProduct(product)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, fontSize: 15, lineHeight: 1 }}
                                title="Excluir produto"
                              >
                                <span>🗑️</span>
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
                    <div style={{ fontSize: 30 }}>📦</div>
                    <p style={{ color: TXT2, fontSize: 16, margin: '10px 0 0' }}>Nenhum produto encontrado</p>
                    <p style={{ color: TXT3, marginTop: 6 }}>
                      {products.length === 0
                        ? 'Comece adicionando seu primeiro produto'
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderTop: `1px solid ${LINE}`, background: SOFT, gap: 12 }}>
                <div style={{ fontSize: 12.5, color: TXT2 }}>
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button style={{ padding: '7px 14px', fontSize: 12.5, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}>
                    Anterior
                  </button>
                  <span style={{ fontSize: 12.5, color: TXT2 }}>Página 1 de 1</span>
                  <button style={{ padding: '7px 14px', fontSize: 12.5, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}>
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalhes/Edição do Produto */}
      {isModalOpen && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
                  {isEditMode ? 'Editar Produto' : 'Detalhes do Produto'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                  }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {isEditMode ? (
                // Edit Form
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={lbl}>Nome do Produto</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      style={inp}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <label style={lbl}>Tipo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as ProductType})}
                      style={inp}
                    >
                      <option value="MEDICINE">Medicamento</option>
                      <option value="VACCINE">Vacina</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Preço (R$)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      style={inp}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label style={lbl}>Estoque</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                      style={inp}
                      min="0"
                    />
                  </div>
                </div>
              ) : (
                // View Details
                <>
                  {/* Informações do Produto */}
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span>📦</span>
                      Informações do Produto
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12.5, color: TXT3 }}>Nome</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>{selectedProduct.name}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12.5, color: TXT3 }}>Tipo</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, ...getTypeColor(selectedProduct.type) }}>
                            {getTypeLabel(selectedProduct.type)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12.5, color: TXT3 }}>Preço</label>
                        <p style={{ color: TXT, fontWeight: 500, margin: '2px 0 0' }}>{formatCurrency(selectedProduct.price)}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12.5, color: TXT3 }}>Estoque</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>{selectedProduct.stock} unidades</p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12.5, color: TXT3 }}>Uso em Tratamentos</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>{selectedProduct._count.treatments} tratamentos</p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12.5, color: TXT3 }}>Última Atualização</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>{formatDate(selectedProduct.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tratamentos Recentes */}
                  {selectedProduct.treatments.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, marginBottom: 14 }}>Tratamentos Recentes</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedProduct.treatments.map((treatment) => (
                          <div key={treatment.id} style={{ background: '#fff', border: `1px solid ${LINE}`, padding: 14, borderRadius: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <p style={{ fontWeight: 500, color: TXT, margin: 0 }}>{treatment.description}</p>
                                <p style={{ fontSize: 12.5, color: TXT2, marginTop: 4 }}>
                                  Pet: {treatment.appointment.pet.name} • {formatDate(treatment.appointment.date)}
                                </p>
                              </div>
                              <p style={{ fontWeight: 500, color: TXT, margin: 0 }}>
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

            <div style={{ padding: '15px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    style={{ padding: '9px 16px', borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', color: TXT2, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateProduct}
                    style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, background: TEAL, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>✅</span> Salvar Alterações
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '9px 16px', borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', color: TXT2, cursor: 'pointer' }}
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, background: TEAL, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>✏️</span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 512, width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>Novo Produto</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nome do Produto *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={inp}
                  placeholder="Ex: Vacina V10"
                />
              </div>
              <div>
                <label style={lbl}>Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as ProductType})}
                  style={inp}
                >
                  <option value="MEDICINE">Medicamento</option>
                  <option value="VACCINE">Vacina</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Preço (R$) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  style={inp}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={lbl}>Estoque Inicial</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                  style={inp}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div style={{ padding: '15px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '9px 16px', borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', color: TXT2, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={!formData.name || formData.price < 0}
                style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, background: TEAL, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: (!formData.name || formData.price < 0) ? 0.5 : 1 }}
              >
                <span>➕</span>
                Criar Produto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
