// Tratamentos no padrão Base44 (bege + emojis).
// Roupagem repaginada 04/07 — LÓGICA 100% preservada.
'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

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

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 13, color: TXT2, display: 'block', marginBottom: 6, fontWeight: 500 };
const pillBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 };

interface Treatment {
  id: string;
  appointmentId: string;
  petId: string;
  description: string;
  cost: number;
  productId: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: {
    id: string;
    date: string;
    description: string | null;
    status: string;
    tutor?: {
      id: string;
      name: string;
    };
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
  };
  product?: {
    id: string;
    name: string;
    type: string;
    price: number;
    stock: number;
  } | null;
}

interface Appointment {
  id: string;
  date: string;
  description: string | null;
  status: string;
  tutor?: { id: string; name: string };
  pet?: { id: string; name: string; species: string };
}

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  stock: number;
}

export default function TratamentosPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [treatmentToDelete, setTreatmentToDelete] = useState<Treatment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  const [formData, setFormData] = useState({
    appointmentId: '',
    petId: '',
    description: '',
    cost: 0,
    productId: '' as string | null});

  const [editFormData, setEditFormData] = useState({
    description: '',
    cost: 0,
    productId: '' as string | null});

  useEffect(() => {
    fetchTreatments();
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchTreatments();
    }
  }, [page, searchTerm]);

  const fetchInitialData = async () => {
    try {
      const [appointmentsRes, productsRes] = await Promise.all([
        fetch('/api/appointments?limit=100'),
        fetch('/api/products?limit=200'),
      ]);

      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json();
        const allAppointments: Appointment[] = data.appointments || [];
        const active = allAppointments.filter(
          (a) => a.status !== 'CANCELED' && a.status !== 'COMPLETED'
        );
        setAppointments(active.length > 0 ? active : allAppointments);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    }
  };

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/treatments?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar tratamentos');

      const data = await response.json();
      setTreatments(data.treatments || []);
      setTotalCost(data.totals?.cost || 0);
      setTotalPages(data.pagination?.pages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch (err) {
      console.error('Erro ao carregar tratamentos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar tratamentos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'}).format(value);
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
      minute: '2-digit'});
  };

  const getProductTypeBadge = (type: string): React.CSSProperties => {
    switch (type) {
      case 'MEDICINE':
        return { background: TINT, color: TEAL_DARK };
      case 'VACCINE':
        return { background: '#e1f5ee', color: GREEN };
      case 'SERVICE':
        return { background: '#fef0e8', color: '#993C1D' };
      default:
        return { background: DIV, color: TXT2 };
    }
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'MEDICINE':
        return 'Medicamento';
      case 'VACCINE':
        return 'Vacina';
      case 'SERVICE':
        return 'Serviço';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string): React.CSSProperties => {
    switch (status) {
      case 'SCHEDULED':
        return { background: TINT, color: TEAL_DARK };
      case 'CONFIRMED':
        return { background: '#E0F4F6', color: TEAL_DARK };
      case 'IN_PROGRESS':
        return { background: '#fdf6e3', color: '#854F0B' };
      case 'COMPLETED':
        return { background: '#e1f5ee', color: GREEN };
      case 'CANCELED':
        return { background: '#fef0e8', color: '#993C1D' };
      default:
        return { background: DIV, color: TXT2 };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Agendado';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'COMPLETED':
        return 'Concluído';
      case 'CANCELED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const openDetails = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setIsModalOpen(true);
  };

  const openEdit = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setEditFormData({
      description: treatment.description,
      cost: treatment.cost,
      productId: treatment.productId || ''});
    setIsEditModalOpen(true);
  };

  const handleSelectAppointment = (appointmentId: string) => {
    const appointment = appointments.find((a) => a.id === appointmentId);
    setFormData((prev) => ({
      ...prev,
      appointmentId,
      petId: appointment?.pet?.id || ''}));
  };

  const handleCreateTreatment = async () => {
    if (!formData.appointmentId || !formData.petId || !formData.description) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: formData.appointmentId,
          petId: formData.petId,
          description: formData.description,
          cost: formData.cost,
          productId: formData.productId || null})});

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          (errorData &&
            (errorData.error ||
              (Array.isArray(errorData.message)
                ? errorData.message.join(', ')
                : errorData.message))) ||
          'Erro ao criar tratamento';
        throw new Error(String(message));
      }

      toast.success('Tratamento criado com sucesso!');
      setIsCreateModalOpen(false);
      setFormData({
        appointmentId: '',
        petId: '',
        description: '',
        cost: 0,
        productId: ''});
      fetchTreatments();
    } catch (err) {
      console.error('Erro ao criar tratamento:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar tratamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTreatment = async () => {
    if (!selectedTreatment) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/treatments/${selectedTreatment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editFormData.description,
          cost: editFormData.cost,
          productId: editFormData.productId || null})});

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          (errorData &&
            (errorData.error ||
              (Array.isArray(errorData.message)
                ? errorData.message.join(', ')
                : errorData.message))) ||
          'Erro ao atualizar tratamento';
        throw new Error(String(message));
      }

      toast.success('Tratamento atualizado com sucesso!');
      setIsEditModalOpen(false);
      setIsModalOpen(false);
      fetchTreatments();
    } catch (err) {
      console.error('Erro ao atualizar tratamento:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar tratamento');
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (treatment: Treatment) => {
    setTreatmentToDelete(treatment);
  };

  const confirmDelete = async () => {
    if (!treatmentToDelete) return;

    const response = await fetch(`/api/treatments/${treatmentToDelete.id}`, {
      method: 'DELETE'});

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message =
        (errorData &&
          (errorData.error ||
            (Array.isArray(errorData.message)
              ? errorData.message.join(', ')
              : errorData.message))) ||
        'Erro ao excluir tratamento';
      throw new Error(message);
    }

    toast.success('Tratamento excluído com sucesso!');
    setIsModalOpen(false);
    await fetchTreatments();
    setTreatmentToDelete(null);
  };

  const stats = {
    total: totalItems,
    totalCost,
    avgCost: totalItems > 0 ? totalCost / totalItems : 0};

  if (loading && treatments.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto', borderRadius: '50%', border: `3px solid ${LINE}`, borderBottomColor: TEAL, animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: 16, color: TXT2 }}>Carregando tratamentos...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total de Tratamentos', value: stats.total, emoji: '💉', accent: TEAL },
    { label: 'Custo Total', value: formatCurrency(stats.totalCost), emoji: '💲', accent: GREEN },
    { label: 'Custo Médio', value: formatCurrency(stats.avgCost), emoji: '📈', accent: TEAL_DARK },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, width: '100%', overflow: 'hidden' }}>
      <ConfirmDeleteModal
        isOpen={Boolean(treatmentToDelete)}
        entityLabel="Tratamento"
        itemName={
          treatmentToDelete
            ? `${treatmentToDelete.description} • ${treatmentToDelete.pet?.name || 'Pet'}`
            : '—'
        }
        consequenceText="Esta ação não pode ser desfeita. O registro de tratamento será removido."
        onClose={() => setTreatmentToDelete(null)}
        onConfirm={confirmDelete}
      />

      <div style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                  <span style={{ fontSize: 26 }}>💉</span> Tratamentos
                </h1>
                <p style={{ color: TXT2, marginTop: 8 }}>
                  Gerencie tratamentos realizados nos atendimentos
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 15 }}>➕</span>
                  <span>Novo Tratamento</span>
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
                style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', color: '#993C1D' }}
              >
                <span style={{ fontSize: 14 }}>✕</span>
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 32 }}>
            {statCards.map((stat) => (
              <div
                key={stat.label}
                style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 20 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: TXT3, fontWeight: 500, margin: 0 }}>{stat.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 500, color: TEAL_DARK, marginTop: 4 }}>{stat.value}</p>
                  </div>
                  <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: SOFT, borderRadius: 11, fontSize: 20 }}>
                    <span>{stat.emoji}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ position: 'relative', maxWidth: 420 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar por descrição, pet ou tutor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                style={{ ...inp, paddingLeft: 42 }}
              />
            </div>
          </div>

          {/* Treatments List */}
          {loading && treatments.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0', marginBottom: 16 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${LINE}`, borderBottomColor: TEAL, marginRight: 12, animation: 'spin 1s linear infinite' }}></div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ color: TXT2, fontSize: 13 }}>Atualizando...</span>
            </div>
          )}
          {treatments.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: 34 }}>💉</div>
              <h3 style={{ fontSize: 19, fontWeight: 500, color: TXT2, margin: '12px 0 8px' }}>
                Nenhum tratamento encontrado
              </h3>
              <p style={{ color: TXT3, marginBottom: 24 }}>
                {searchTerm
                  ? 'Tente ajustar sua busca'
                  : 'Comece registrando um novo tratamento'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 500 }}
                >
                  <span>➕</span>
                  Novo Tratamento
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 16 }}>
                {treatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 20 }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: TINT, borderRadius: 10, flexShrink: 0, fontSize: 16 }}>
                            <span>💉</span>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{ fontWeight: 500, color: TEAL_DARK, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {treatment.description}
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 13, color: TXT2 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 13 }}>🐾</span>
                                {treatment.pet.name}
                                <span style={{ color: TXT3 }}>
                                  ({treatment.pet.species}
                                  {treatment.pet.breed ? ` - ${treatment.pet.breed}` : ''})
                                </span>
                              </span>
                              {treatment.appointment?.tutor && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 13 }}>👤</span>
                                  {treatment.appointment.tutor.name}
                                </span>
                              )}
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 13 }}>📅</span>
                                {formatDate(treatment.createdAt)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
                              {treatment.product && (
                                <span style={{ ...pillBase, ...getProductTypeBadge(treatment.product.type) }}>
                                  <span style={{ fontSize: 13 }}>📦</span>
                                  {treatment.product.name}
                                </span>
                              )}
                              <span style={{ ...pillBase, ...getStatusBadge(treatment.appointment.status) }}>
                                {getStatusLabel(treatment.appointment.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 18, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
                            {formatCurrency(treatment.cost)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => openDetails(treatment)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: 6, borderRadius: 8 }}
                            title="Ver detalhes"
                          >
                            <span>👁️</span>
                          </button>
                          <button
                            onClick={() => openEdit(treatment)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: 6, borderRadius: 8 }}
                            title="Editar"
                          >
                            <span>✏️</span>
                          </button>
                          <button
                            onClick={() => requestDelete(treatment)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: 6, borderRadius: 8 }}
                            title="Excluir"
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
                  <p style={{ fontSize: 13, color: TXT2 }}>
                    Mostrando {treatments.length} de {totalItems} tratamentos
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      style={{ padding: 8, borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
                    >
                      <span style={{ fontSize: 12 }}>◀</span>
                    </button>
                    <span style={{ fontSize: 13, color: TXT2, padding: '0 12px' }}>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      style={{ padding: 8, borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
                    >
                      <span style={{ fontSize: 14 }}>▶</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedTreatment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span>💉</span> Detalhes do Tratamento</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 500, color: TXT3, marginBottom: 4 }}>Descrição</h3>
                <p style={{ color: TXT, fontWeight: 500, fontSize: 17, margin: 0 }}>{selectedTreatment.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 500, color: TXT3, marginBottom: 4 }}>Custo</h3>
                  <p style={{ fontWeight: 500, fontSize: 20, color: TEAL_DARK, margin: 0 }}>
                    {formatCurrency(selectedTreatment.cost)}
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 500, color: TXT3, marginBottom: 4 }}>Data</h3>
                  <p style={{ color: TXT, margin: 0 }}>{formatDateTime(selectedTreatment.createdAt)}</p>
                </div>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 500, color: TXT3, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>🐾</span> Pet
                </h3>
                <p style={{ color: TXT, fontWeight: 500, margin: 0 }}>
                  {selectedTreatment.pet.name}{' '}
                  <span style={{ color: TXT2, fontWeight: 400 }}>
                    ({selectedTreatment.pet.species}
                    {selectedTreatment.pet.breed ? ` - ${selectedTreatment.pet.breed}` : ''})
                  </span>
                </p>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 500, color: TXT3, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>🩺</span> Consulta
                </h3>
                <p style={{ color: TXT, fontWeight: 500, margin: 0 }}>
                  {selectedTreatment.appointment.description || 'Sem descrição'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 13, color: TXT2 }}>
                  <span>{formatDate(selectedTreatment.appointment.date)}</span>
                  <span style={{ ...pillBase, ...getStatusBadge(selectedTreatment.appointment.status) }}>
                    {getStatusLabel(selectedTreatment.appointment.status)}
                  </span>
                </div>
                {selectedTreatment.appointment.tutor && (
                  <p style={{ fontSize: 13, color: TXT2, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13 }}>👤</span>
                    Tutor: {selectedTreatment.appointment.tutor.name}
                  </p>
                )}
              </div>

              {selectedTreatment.product && (
                <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 500, color: TXT3, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>📦</span> Produto Utilizado
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ color: TXT, fontWeight: 500, margin: 0 }}>{selectedTreatment.product.name}</p>
                      <span style={{ ...pillBase, marginTop: 4, ...getProductTypeBadge(selectedTreatment.product.type) }}>
                        {getProductTypeLabel(selectedTreatment.product.type)}
                      </span>
                    </div>
                    <p style={{ color: TXT, fontWeight: 500, margin: 0 }}>
                      {formatCurrency(selectedTreatment.product.price)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => openEdit(selectedTreatment)}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500, color: TEAL_DARK, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>✏️</span> Editar
              </button>
              <button
                onClick={() => {
                  requestDelete(selectedTreatment);
                  setIsModalOpen(false);
                }}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500, color: '#993C1D', background: '#fef0e8', border: `1px solid ${ORANGE}`, borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>🗑️</span> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span>💉</span> Novo Tratamento</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={lbl}>
                  Consulta *
                </label>
                <select
                  value={formData.appointmentId}
                  onChange={(e) => handleSelectAppointment(e.target.value)}
                  style={inp}
                >
                  <option value="">Selecione uma consulta</option>
                  {appointments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {formatDate(apt.date)} - {apt.pet?.name || 'Pet'}
                      {apt.tutor ? ` (${apt.tutor.name})` : ''}
                      {apt.description ? ` - ${apt.description}` : ''}
                      {` [${getStatusLabel(apt.status)}]`}
                    </option>
                  ))}
                </select>
                {appointments.length === 0 && (
                  <p style={{ fontSize: 13, color: ORANGE, marginTop: 4 }}>
                    Nenhuma consulta disponível. Crie uma consulta primeiro em Agendamentos.
                  </p>
                )}
              </div>

              <div>
                <label style={lbl}>
                  Descrição do Tratamento *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descreva o tratamento realizado..."
                  rows={3}
                  style={{ ...inp, resize: 'none' }}
                />
              </div>

              <div>
                <label style={lbl}>
                  Custo (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))
                  }
                  style={inp}
                />
              </div>

              <div>
                <label style={lbl}>
                  Produto (opcional)
                </label>
                <select
                  value={formData.productId || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, productId: e.target.value || null }))
                  }
                  style={inp}
                >
                  <option value="">Nenhum produto</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({getProductTypeLabel(prod.type)}) -{' '}
                      {formatCurrency(prod.price)} | Estoque: {prod.stock}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTreatment}
                disabled={submitting}
                style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer', opacity: submitting ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span>✅</span>
                {submitting ? 'Salvando...' : 'Salvar Tratamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedTreatment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span>✏️</span> Editar Tratamento</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: TXT3, margin: 0 }}>Consulta</p>
                <p style={{ color: TXT, fontWeight: 500, margin: '2px 0 0' }}>
                  {selectedTreatment.appointment.description || 'Sem descrição'} -{' '}
                  {formatDate(selectedTreatment.appointment.date)}
                </p>
                <p style={{ fontSize: 13, color: TXT2, marginTop: 4 }}>
                  Pet: {selectedTreatment.pet.name}
                  {selectedTreatment.appointment.tutor
                    ? ` | Tutor: ${selectedTreatment.appointment.tutor.name}`
                    : ''}
                </p>
              </div>

              <div>
                <label style={lbl}>
                  Descrição do Tratamento *
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  style={{ ...inp, resize: 'none' }}
                />
              </div>

              <div>
                <label style={lbl}>
                  Custo (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editFormData.cost}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      cost: parseFloat(e.target.value) || 0}))
                  }
                  style={inp}
                />
              </div>

              <div>
                <label style={lbl}>
                  Produto (opcional)
                </label>
                <select
                  value={editFormData.productId || ''}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, productId: e.target.value || null }))
                  }
                  style={inp}
                >
                  <option value="">Nenhum produto</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({getProductTypeLabel(prod.type)}) -{' '}
                      {formatCurrency(prod.price)} | Estoque: {prod.stock}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${DIV}`, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateTreatment}
                disabled={submitting}
                style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, color: '#fff', background: TEAL, border: 'none', borderRadius: 9, cursor: 'pointer', opacity: submitting ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span>✅</span>
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
