'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash,
  LuDollarSign
} from 'react-icons/lu';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';

// Tipo SERVICE
type ServiceType = 'SERVICE';

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

interface Service {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  stock: number;
  custoPadrao?: number | null;
  category?: { id: string; nome: string } | null;
  fornecedor?: { id: string; nome: string } | null;
  treatments: Treatment[];
  _count: {
    treatments: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Opcao { id: string; nome: string }

interface ServiceStats {
  total: number;
  totalValue: number;
  averagePrice: number;
}

interface ApiResponse {
  products: Service[];
  stats: ServiceStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [categorias, setCategorias] = useState<Opcao[]>([]);
  const [fornecedores, setFornecedores] = useState<Opcao[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const LIMITE = 30;
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'SERVICE' as ServiceType,
    price: 0,
    stock: 0
  });

  // Buscar services da API (apenas SERVICE) — filtro por categoria/laboratório no servidor + paginação
  const fetchServices = async (pagina = page) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('type', 'SERVICE');
      if (filterCategoria) params.append('categoryId', filterCategoria);
      if (filterFornecedor) params.append('fornecedorId', filterFornecedor);
      params.append('page', String(pagina));
      params.append('limit', String(LIMITE));

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar serviços');

      const data: ApiResponse = await response.json();
      setServices(data.products.filter(p => p.type === 'SERVICE'));
      setTotalPages(data.pagination?.pages || 1);
      setTotalItens(data.pagination?.total || data.products.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar services:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega as opções dos filtros (categorias + laboratórios) uma vez
  useEffect(() => {
    (async () => {
      try {
        const [rc, rf] = await Promise.all([
          fetch('/api/servicos/categorias'),
          fetch('/api/fornecedores'),
        ]);
        const dc = await rc.json().catch(() => []);
        const df = await rf.json().catch(() => []);
        const cats = (Array.isArray(dc) ? dc : (dc.data || [])).map((c: any) => ({ id: c.id, nome: c.nome }));
        const forns = (Array.isArray(df) ? df : (df.data || [])).map((f: any) => ({ id: f.id, nome: f.nome }));
        // Categorias de exame primeiro (começam com "Exames ·"), depois o resto — tudo alfabético
        cats.sort((a: Opcao, b: Opcao) => a.nome.localeCompare(b.nome, 'pt-BR'));
        forns.sort((a: Opcao, b: Opcao) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setCategorias(cats);
        setFornecedores(forns);
      } catch { /* filtros ficam vazios */ }
    })();
  }, []);

  // Recarregar quando busca/filtros mudarem — volta pra página 1
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      fetchServices(1);
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterCategoria, filterFornecedor]);

  // Trocar de página
  const irParaPagina = (p: number) => {
    const alvo = Math.min(Math.max(1, p), totalPages);
    setPage(alvo);
    fetchServices(alvo);
  };

  const margemPct = (s: Service): number | null => {
    if (s.custoPadrao == null || s.custoPadrao <= 0 || !s.price) return null;
    return Math.round(((s.price - s.custoPadrao) / s.custoPadrao) * 100);
  };

  // Funções para manipular serviços
  const handleCreateService = async () => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...formData,
          type: 'SERVICE',
          stock: 0
        })});

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
          'Erro ao criar serviço';
        throw new Error(String(message));
      }

      toast.success('Serviço criado com sucesso!');
      fetchServices();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao criar service:', err);
      const message = err instanceof Error ? err.message : 'Erro ao criar serviço';
      setError(message);
      toast.error(message);
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;

    try {
      const response = await fetch(`/api/products/${selectedService.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: formData.name,
          price: formData.price,
          type: 'SERVICE'
        })});

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
          'Erro ao atualizar serviço';
        throw new Error(String(message));
      }

      toast.success('Serviço atualizado com sucesso!');
      fetchServices();
      setIsModalOpen(false);
      setIsEditMode(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao atualizar service:', err);
      const message = err instanceof Error ? err.message : 'Erro ao atualizar serviço';
      setError(message);
      toast.error(message);
    }
  };

  const requestDeleteService = (service: Service) => {
    setServiceToDelete(service);
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    const res = await fetch(`/api/products/${serviceToDelete.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
        'Erro ao excluir serviço';
      throw new Error(message);
    }

    await fetchServices();
    setIsModalOpen(false);
    toast.success('Serviço excluído com sucesso!');
    setServiceToDelete(null);
  };

  const openServiceDetails = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      type: 'SERVICE',
      price: service.price,
      stock: 0
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
      type: 'SERVICE',
      price: 0,
      stock: 0
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

  if (loading && services.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando serviços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden" style={{ background: "#FAF7F2" }}>
      <ConfirmDeleteModal
        isOpen={Boolean(serviceToDelete)}
        entityLabel="Serviço"
        itemName={serviceToDelete?.name || '—'}
        consequenceText="Esta ação não pode ser desfeita. Os dados do serviço serão removidos."
        onClose={() => setServiceToDelete(null)}
        onConfirm={confirmDeleteService}
      />
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: "#014D5E" }}>
                    Produtos e Serviços
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm">
                    Catálogo único — serviços, exames e produtos. Os exames trazem o custo do laboratório.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/dashboard/erp/servicos/relatorio"
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-xl hover:bg-gray-50 flex items-center gap-2"
                    style={{ borderColor: "#E8DFC8" }}
                  >
                    <span style={{fontSize:"14px"}}>📈</span>
                    <span>Relatório</span>
                  </Link>
                  <button
                    onClick={openCreateModal}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2"
                    style={{ background: "#009AAC" }}
                  >
                    <LuPlus className="w-4 h-4" />
                    <span>Novo item</span>
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

            {/* Chips de resumo */}
            <div className="flex flex-wrap gap-2.5 mb-4">
              {[
                { n: totalItens, l: filterCategoria || filterFornecedor || searchTerm ? "Itens no filtro" : "Itens no total" },
                { n: categorias.length, l: "Categorias" },
                { n: fornecedores.length, l: "Laboratórios" },
              ].map((c, i) => (
                <div key={i} className="bg-white border rounded-xl px-4 py-2 min-w-[120px]" style={{ borderColor: "#E8DFC8" }}>
                  <div className="text-lg font-bold" style={{ color: "#014D5E" }}>{c.n.toLocaleString('pt-BR')}</div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">{c.l}</div>
                </div>
              ))}
            </div>

            {/* Filtros e busca */}
            <div className="bg-white border rounded-2xl p-3 mb-4" style={{ borderColor: "#E8DFC8" }}>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LuSearch className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nome…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border rounded-xl focus:outline-none focus:ring-2 text-sm text-gray-900"
                    style={{ borderColor: "#E8DFC8" }}
                  />
                </div>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="px-3 py-2 border rounded-xl bg-white text-sm text-gray-900"
                  style={{ borderColor: "#E8DFC8" }}
                >
                  <option value="">Categoria: Todas</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <select
                  value={filterFornecedor}
                  onChange={(e) => setFilterFornecedor(e.target.value)}
                  className="px-3 py-2 border rounded-xl bg-white text-sm text-gray-900"
                  style={{ borderColor: "#E8DFC8" }}
                >
                  <option value="">Laboratório: Todos</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                {(searchTerm || filterCategoria || filterFornecedor) && (
                  <button
                    onClick={() => { setSearchTerm(''); setFilterCategoria(''); setFilterFornecedor(''); }}
                    className="px-3 py-2 text-sm text-gray-600 border rounded-xl hover:bg-gray-50 whitespace-nowrap"
                    style={{ borderColor: "#E8DFC8" }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Tabela */}
            <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 820 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #EFE9DC" }}>
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500">Item</th>
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500">Categoria</th>
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500">Laboratório</th>
                      <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500">Custo</th>
                      <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500">Preço venda</th>
                      <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500">Margem</th>
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => {
                      const m = margemPct(service);
                      const semPreco = !service.price || service.price <= 0;
                      return (
                      <tr
                        key={service.id}
                        className="hover:bg-[#F6FBFC] cursor-pointer"
                        style={{ borderBottom: "1px solid #EFE9DC" }}
                        onClick={() => openServiceDetails(service)}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-900">{service.name}</td>
                        <td className="px-4 py-2.5">
                          {service.category ? (
                            <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-full" style={{ background: "#EAF6F7", color: "#00798A", border: "1px solid #CDEAEE" }}>
                              {service.category.nome.replace(/^Exames · /, "")}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{service.fornecedor?.nome || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{service.custoPadrao != null ? formatCurrency(service.custoPadrao) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {semPreco ? (
                            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "#FEF3E2", color: "#B45309", border: "1px solid #F3D9AE" }}>definir</span>
                          ) : (
                            <span className="font-semibold text-gray-900">{formatCurrency(service.price)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: m != null ? "#0F6E56" : "#cbd5e1" }}>
                          {m != null ? `+${m}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedService(service);
                                setFormData({ name: service.name, type: 'SERVICE', price: service.price, stock: 0 });
                                setIsEditMode(true);
                                setIsModalOpen(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center border rounded-lg text-gray-500 hover:text-[#009AAC] hover:border-[#009AAC]"
                              style={{ borderColor: "#E8DFC8" }}
                              title="Editar / definir preço"
                            >
                              <LuPencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => requestDeleteService(service)}
                              className="w-8 h-8 flex items-center justify-center border rounded-lg text-gray-400 hover:text-red-600 hover:border-red-300"
                              style={{ borderColor: "#E8DFC8" }}
                              title="Excluir"
                            >
                              <LuTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>

                {services.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum item encontrado</p>
                    <p className="text-gray-400 mt-1 text-sm">Tente ajustar a busca ou os filtros</p>
                  </div>
                )}
                {loading && (
                  <div className="text-center py-8 text-gray-400 text-sm">Carregando…</div>
                )}
              </div>

              {/* Rodapé + paginação */}
              <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-2" style={{ borderTop: "1px solid #EFE9DC" }}>
                <div className="text-[12.5px] text-gray-500">
                  Página {page} de {totalPages} · {totalItens.toLocaleString('pt-BR')} {totalItens === 1 ? 'item' : 'itens'}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => irParaPagina(page - 1)} disabled={page <= 1}
                    className="min-w-[30px] h-[30px] px-2 border rounded-lg text-[12.5px] disabled:opacity-40 hover:bg-gray-50" style={{ borderColor: "#E8DFC8" }}>‹</button>
                  <span className="text-[12.5px] text-gray-600 px-2">{page} / {totalPages}</span>
                  <button onClick={() => irParaPagina(page + 1)} disabled={page >= totalPages}
                    className="min-w-[30px] h-[30px] px-2 border rounded-lg text-[12.5px] disabled:opacity-40 hover:bg-gray-50" style={{ borderColor: "#E8DFC8" }}>›</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalhes/Edição do Serviço */}
      {isModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Editar Serviço' : 'Detalhes do Serviço'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {isEditMode ? (
                // Edit Form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Serviço</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                      placeholder="Nome do serviço"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              ) : (
                // View Details
                <>
                  {/* Informações do Serviço */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span style={{fontSize:"14px"}}>🔧</span>
                      Informações do Serviço
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nome</label>
                        <p className="text-gray-900">{selectedService.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Tipo</label>
                        <p className="text-gray-900">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Serviço
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Preço</label>
                        <p className="text-gray-900 font-semibold">{formatCurrency(selectedService.price)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Atendimentos</label>
                        <p className="text-gray-900">{selectedService._count.treatments} atendimentos</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Receita Total</label>
                        <p className="text-gray-900 font-semibold">
                          {formatCurrency(selectedService.price * selectedService._count.treatments)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Última Atualização</label>
                        <p className="text-gray-900">{formatDate(selectedService.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tratamentos Recentes */}
                  {selectedService.treatments.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span style={{fontSize:"14px"}}>📋</span>
                        Atendimentos Recentes
                      </h4>
                      <div className="space-y-3">
                        {selectedService.treatments.map((treatment) => (
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
                    onClick={handleUpdateService}
                    className="px-6 py-3 text-white bg-purple-600 rounded-2xl hover:bg-purple-700 transition-colors flex items-center gap-2"
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
                    className="px-6 py-3 text-white bg-purple-600 rounded-2xl hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <LuPencil className="w-4 h-4" />
                    Editar Serviço
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Serviço */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Novo Serviço</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Serviço *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                  placeholder="Ex: Consulta Geral, Banho e Tosa..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
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
                onClick={handleCreateService}
                disabled={!formData.name || formData.price < 0}
                className="px-6 py-3 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuPlus className="w-4 h-4" />
                Criar Serviço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






