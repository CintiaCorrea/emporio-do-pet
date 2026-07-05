// Serviços no padrão Base44 (bege + emojis).
// Roupagem repaginada 04/07 — LÓGICA 100% preservada.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';
import { usePodeEditar } from "@/lib/permissions/context";

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const ORANGE = '#D85A30';
const GREEN = '#0f6e56';
const BG = '#F6F2EA';
const SOFT = '#FBF9F4';
const TINT = '#E0F4F6';
const LINE = '#E8E2D6';
const DIV = '#F0EBE0';
const TXT = '#1F2A2E';
const TXT2 = '#5C6B70';
const TXT3 = '#8A989D';

const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '12px 16px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: `1px solid ${DIV}`, color: TXT, fontSize: 13.5 };
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 13, color: TXT2, display: 'block', marginBottom: 6, fontWeight: 500 };

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
  treatments: Treatment[];
  _count: {
    treatments: number;
  };
  createdAt: string;
  updatedAt: string;
}

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
  const podeEditar = usePodeEditar();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Buscar services da API (apenas SERVICE)
  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('type', 'SERVICE');

      const response = await fetch(`/api/products?${params}`);

      if (!response.ok) {
        throw new Error('Erro ao carregar serviços');
      }

      const data: ApiResponse = await response.json();
      // Garantir que só temos serviços
      const filteredServices = data.products.filter(p => p.type === 'SERVICE');
      setServices(filteredServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar services:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar services inicial
  useEffect(() => {
    fetchServices();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchServices();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);


  // Filtrar serviços localmente (backup)
  const filteredServices = services.filter(service => {
    return service.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Estatísticas locais
  const localStats = {
    total: services.length,
    totalRevenue: services.reduce((acc, s) => acc + (s.price * s._count.treatments), 0),
    averagePrice: services.length > 0 ? services.reduce((acc, s) => acc + s.price, 0) / services.length : 0,
    totalTreatments: services.reduce((acc, s) => acc + s._count.treatments, 0)
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
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto', borderRadius: '50%', border: `3px solid ${LINE}`, borderBottomColor: TEAL, animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: 16, color: TXT2 }}>Carregando serviços...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total de Serviços', value: localStats.total, emoji: '🏷️', accent: TEAL, isFormatted: false },
    { label: 'Preço Médio', value: formatCurrency(localStats.averagePrice), emoji: '💲', accent: TEAL_DARK, isFormatted: true },
    { label: 'Atendimentos', value: localStats.totalTreatments, emoji: '⚡', accent: GREEN, isFormatted: false },
    { label: 'Receita Estimada', value: formatCurrency(localStats.totalRevenue), emoji: '📈', accent: ORANGE, isFormatted: true },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, width: '100%', overflow: 'hidden' }}>
      <ConfirmDeleteModal
        isOpen={Boolean(serviceToDelete)}
        entityLabel="Serviço"
        itemName={serviceToDelete?.name || '—'}
        consequenceText="Esta ação não pode ser desfeita. Os dados do serviço serão removidos."
        onClose={() => setServiceToDelete(null)}
        onConfirm={confirmDeleteService}
      />
      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                    <span style={{ fontSize: 26 }}>🏷️</span> Serviços
                  </h1>
                  <p style={{ color: TXT2, marginTop: 8 }}>
                    Gerencie os serviços oferecidos pela clínica veterinária
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Link
                    href="/dashboard/erp/servicos/relatorio"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, textDecoration: 'none' }}
                  >
                    <span style={{ fontSize: 15 }}>📈</span>
                    <span>Relatório</span>
                  </Link>
                  {!podeEditar && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: TXT3 }}>👁️ Somente leitura</span>
                  )}
                  {podeEditar && (
                    <button
                      onClick={openCreateModal}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 15 }}>➕</span>
                      <span>Novo Serviço</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ marginBottom: 24, padding: 16, background: '#fef0e8', border: `1px solid ${ORANGE}`, borderRadius: 12, color: '#993C1D' }}>
                {error}
                <button
                  onClick={() => setError(null)}
                  style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', color: '#993C1D' }}
                >
                  <span style={{ fontSize: 14 }}>✕</span>
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 32 }}>
              {stats.map((stat, index) => (
                <div key={index} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: SOFT, borderRadius: 11, fontSize: 20 }}>
                      <span>{stat.emoji}</span>
                    </div>
                    <div style={{ fontSize: stat.isFormatted ? 18 : 24, fontWeight: 500, color: TEAL_DARK }}>
                      {stat.value}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: TXT2, margin: 0 }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters and Search */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, flex: 1 }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none', fontSize: 15 }}>
                      <span>🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nome do serviço..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ ...inp, paddingLeft: 38 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={fetchServices}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 14 }}>🔍</span>
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Services Table */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, overflow: 'hidden' }}>
              {/* Table Header */}
              <div style={{ padding: '16px 18px', background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
                    Catálogo de Serviços
                  </h3>
                  <div style={{ fontSize: 13, color: TXT2 }}>
                    {filteredServices.length} serviços encontrados
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Serviço</th>
                      <th style={thStyle}>Preço</th>
                      <th style={thStyle}>Atendimentos</th>
                      <th style={thStyle}>Receita</th>
                      <th style={thStyle}>Última Atualização</th>
                      <th style={thStyle}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service) => (
                      <tr
                        key={service.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openServiceDetails(service)}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: TINT, fontSize: 16 }}>
                              <span>🏷️</span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: TEAL_DARK }}>{service.name}</div>
                              <div style={{ fontSize: 12, color: TXT3 }}>
                                ID: {service.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500, color: TXT, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 14 }}>💲</span>
                            {formatCurrency(service.price)}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: TINT, color: TEAL_DARK }}>
                              <span style={{ fontSize: 13 }}>⚡</span>
                              {service._count.treatments} atendimentos
                            </span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500, color: TXT }}>
                            {formatCurrency(service.price * service._count.treatments)}
                          </div>
                          <div style={{ fontSize: 12, color: TXT3 }}>
                            receita total
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: TXT2 }}>
                            <span style={{ fontSize: 13 }}>⏱</span>
                            {formatDate(service.updatedAt)}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            {podeEditar ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedService(service);
                                    setFormData({
                                      name: service.name,
                                      type: 'SERVICE',
                                      price: service.price,
                                      stock: 0
                                    });
                                    setIsEditMode(true);
                                    setIsModalOpen(true);
                                  }}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: 6, borderRadius: 8 }}
                                  title="Editar serviço"
                                >
                                  <span>✏️</span>
                                </button>
                                <button
                                  onClick={() => requestDeleteService(service)}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: 6, borderRadius: 8 }}
                                  title="Excluir serviço"
                                >
                                  <span>🗑️</span>
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: 12, color: TXT3 }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredServices.length === 0 && !loading && (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <div style={{ fontSize: 32 }}>🏷️</div>
                    <p style={{ color: TXT2, fontSize: 17, margin: '10px 0 0' }}>Nenhum serviço encontrado</p>
                    <p style={{ color: TXT3, marginTop: 8 }}>
                      {services.length === 0
                        ? 'Comece adicionando seu primeiro serviço'
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderTop: `1px solid ${LINE}`, background: SOFT }}>
                <div style={{ fontSize: 13, color: TXT2 }}>
                  Mostrando {filteredServices.length} de {services.length} serviços
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button style={{ padding: '8px 16px', fontSize: 13, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}>
                    Anterior
                  </button>
                  <span style={{ fontSize: 13, color: TXT2 }}>Página 1 de 1</span>
                  <button style={{ padding: '8px 16px', fontSize: 13, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}>
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalhes/Edição do Serviço */}
      {isModalOpen && selectedService && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 18, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
                  {isEditMode ? 'Editar Serviço' : 'Detalhes do Serviço'}
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

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {isEditMode ? (
                // Edit Form
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={lbl}>Nome do Serviço</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      style={inp}
                      placeholder="Nome do serviço"
                    />
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
                </div>
              ) : (
                // View Details
                <>
                  {/* Informações do Serviço */}
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>🏷️</span>
                      Informações do Serviço
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: TXT3 }}>Nome</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>{selectedService.name}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: TXT3 }}>Tipo</label>
                        <p style={{ margin: '2px 0 0' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: TINT, color: TEAL_DARK }}>
                            Serviço
                          </span>
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: TXT3 }}>Preço</label>
                        <p style={{ color: TXT, fontWeight: 500, margin: '2px 0 0' }}>{formatCurrency(selectedService.price)}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: TXT3 }}>Atendimentos</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>{selectedService._count.treatments} atendimentos</p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: TXT3 }}>Receita Total</label>
                        <p style={{ color: TXT, fontWeight: 500, margin: '2px 0 0' }}>
                          {formatCurrency(selectedService.price * selectedService._count.treatments)}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: TXT3 }}>Última Atualização</label>
                        <p style={{ color: TXT, margin: '2px 0 0' }}>{formatDate(selectedService.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tratamentos Recentes */}
                  {selectedService.treatments.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>📋</span>
                        Atendimentos Recentes
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedService.treatments.map((treatment) => (
                          <div key={treatment.id} style={{ background: '#fff', border: `1px solid ${LINE}`, padding: 16, borderRadius: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <p style={{ fontWeight: 500, color: TXT, margin: 0 }}>{treatment.description}</p>
                                <p style={{ fontSize: 13, color: TXT2, marginTop: 4 }}>
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

            <div style={{ padding: '16px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              {isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    style={{ padding: '9px 18px', color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateService}
                    style={{ padding: '9px 18px', color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <span>✅</span> Salvar Alterações
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '9px 18px', color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
                  >
                    Fechar
                  </button>
                  {podeEditar && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      style={{ padding: '9px 18px', color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <span>✏️</span> Editar Serviço
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Serviço */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 512, width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 18, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span>🏷️</span> Novo Serviço</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Nome do Serviço *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={inp}
                  placeholder="Ex: Consulta Geral, Banho e Tosa..."
                />
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
            </div>

            <div style={{ padding: '16px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '9px 18px', color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateService}
                disabled={!formData.name || formData.price < 0}
                style={{ padding: '9px 18px', color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: (!formData.name || formData.price < 0) ? 0.5 : 1 }}
              >
                <span>➕</span> Criar Serviço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
