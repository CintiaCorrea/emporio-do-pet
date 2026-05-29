'use client';

import { useState, useEffect } from 'react';
import {
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash,
  LuUser,
  LuPawPrint,
  LuCalendar,
  LuDollarSign
  LuSave
  LuEye
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

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

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case 'MEDICINE':
        return 'bg-blue-100 text-blue-800';
      case 'VACCINE':
        return 'bg-green-100 text-green-800';
      case 'SERVICE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-indigo-100 text-indigo-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando tratamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
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

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Tratamentos
                </h1>
                <p className="text-gray-600 mt-2">
                  Gerencie tratamentos realizados nos atendimentos
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-cyan-600 rounded-2xl hover:from-cyan-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 flex items-center space-x-2 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <LuPlus className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Novo Tratamento</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                label: 'Total de Tratamentos',
                value: stats.total,
                color: 'gray',
                icon: () => <span style={{fontSize:"14px"}}>💉</span>},
              {
                label: 'Custo Total',
                value: formatCurrency(stats.totalCost),
                color: 'green',
                icon: LuDollarSign},
              {
                label: 'Custo Médio',
                value: formatCurrency(stats.avgCost),
                color: 'blue',
                icon: () => <span style={{fontSize:"14px"}}>📈</span>},
            ].map((stat) => {
              const colorMap: Record<string, string> = {
                gray: 'from-gray-500/10 to-gray-500/5 border-gray-200/80',
                green: 'from-green-500/10 to-green-500/5 border-green-200/80',
                blue: 'from-blue-500/10 to-blue-500/5 border-blue-200/80'};
              const iconColorMap: Record<string, string> = {
                gray: 'text-gray-600',
                green: 'text-green-600',
                blue: 'text-blue-600'};
              return (
                <div
                  key={stat.label}
                  className={`bg-gradient-to-br ${colorMap[stat.color]} border rounded-2xl p-5 transition-all duration-300 hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${iconColorMap[stat.color]}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por descrição, pet ou tutor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300 transition-all"
              />
            </div>
          </div>

          {/* Treatments List */}
          {loading && treatments.length > 0 && (
            <div className="flex items-center justify-center py-4 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600 mr-3"></div>
              <span className="text-gray-500 text-sm">Atualizando...</span>
            </div>
          )}
          {treatments.length === 0 && !loading ? (
            <div className="text-center py-20">
              <span style={{fontSize:"14px"}}>💉</span>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Nenhum tratamento encontrado
              </h3>
              <p className="text-gray-400 mb-6">
                {searchTerm
                  ? 'Tente ajustar sua busca'
                  : 'Comece registrando um novo tratamento'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3 bg-cyan-600 text-white rounded-2xl hover:bg-cyan-700 transition-colors"
                >
                  <LuPlus className="w-4 h-4 inline mr-2" />
                  Novo Tratamento
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {treatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:border-cyan-200/50"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-cyan-50 rounded-xl flex-shrink-0">
                            <span style={{fontSize:"14px"}}>💉</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {treatment.description}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <LuPawPrint className="w-3.5 h-3.5" />
                                {treatment.pet.name}
                                <span className="text-gray-400">
                                  ({treatment.pet.species}
                                  {treatment.pet.breed ? ` - ${treatment.pet.breed}` : ''})
                                </span>
                              </span>
                              {treatment.appointment?.tutor && (
                                <span className="flex items-center gap-1">
                                  <LuUser className="w-3.5 h-3.5" />
                                  {treatment.appointment.tutor.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <LuCalendar className="w-3.5 h-3.5" />
                                {formatDate(treatment.createdAt)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {treatment.product && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getProductTypeBadge(treatment.product.type)}`}
                                >
                                  <span style={{fontSize:"14px"}}>📦</span>
                                  {treatment.product.name}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(treatment.appointment.status)}`}
                              >
                                {getStatusLabel(treatment.appointment.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 lg:flex-shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(treatment.cost)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openDetails(treatment)}
                            className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors"
                            title="Ver detalhes"
                          >
                            <LuEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(treatment)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Editar"
                          >
                            <LuPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDelete(treatment)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Excluir"
                          >
                            <LuTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    Mostrando {treatments.length} de {totalItems} tratamentos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span style={{fontSize:"12px"}}>◀</span>
                    </button>
                    <span className="text-sm text-gray-600 px-3">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span style={{fontSize:"14px"}}>▶</span>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Tratamento</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Descrição</h3>
                <p className="text-gray-900 font-semibold text-lg">{selectedTreatment.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Custo</h3>
                  <p className="text-gray-900 font-bold text-xl text-cyan-700">
                    {formatCurrency(selectedTreatment.cost)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data</h3>
                  <p className="text-gray-900">{formatDateTime(selectedTreatment.createdAt)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <LuPawPrint className="w-4 h-4" /> Pet
                </h3>
                <p className="text-gray-900 font-medium">
                  {selectedTreatment.pet.name}{' '}
                  <span className="text-gray-500 font-normal">
                    ({selectedTreatment.pet.species}
                    {selectedTreatment.pet.breed ? ` - ${selectedTreatment.pet.breed}` : ''})
                  </span>
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <span style={{fontSize:"14px"}}>🩺</span> Consulta
                </h3>
                <p className="text-gray-900 font-medium">
                  {selectedTreatment.appointment.description || 'Sem descrição'}
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span>{formatDate(selectedTreatment.appointment.date)}</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedTreatment.appointment.status)}`}
                  >
                    {getStatusLabel(selectedTreatment.appointment.status)}
                  </span>
                </div>
                {selectedTreatment.appointment.tutor && (
                  <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                    <LuUser className="w-3.5 h-3.5" />
                    Tutor: {selectedTreatment.appointment.tutor.name}
                  </p>
                )}
              </div>

              {selectedTreatment.product && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <span style={{fontSize:"14px"}}>📦</span> Produto Utilizado
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 font-medium">{selectedTreatment.product.name}</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getProductTypeBadge(selectedTreatment.product.type)}`}
                      >
                        {getProductTypeLabel(selectedTreatment.product.type)}
                      </span>
                    </div>
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency(selectedTreatment.product.price)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => openEdit(selectedTreatment)}
                className="px-5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <LuPencil className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => {
                  requestDelete(selectedTreatment);
                  setIsModalOpen(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <LuTrash className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Novo Tratamento</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consulta *
                </label>
                <select
                  value={formData.appointmentId}
                  onChange={(e) => handleSelectAppointment(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300"
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
                  <p className="text-sm text-orange-600 mt-1">
                    Nenhuma consulta disponível. Crie uma consulta primeiro em Agendamentos.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Tratamento *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descreva o tratamento realizado..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto (opcional)
                </label>
                <select
                  value={formData.productId || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, productId: e.target.value || null }))
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300"
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
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTreatment}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <LuSave className="w-4 h-4" />
                {submitting ? 'Salvando...' : 'Salvar Tratamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedTreatment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Editar Tratamento</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-500">Consulta</p>
                <p className="text-gray-900 font-medium">
                  {selectedTreatment.appointment.description || 'Sem descrição'} -{' '}
                  {formatDate(selectedTreatment.appointment.date)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Pet: {selectedTreatment.pet.name}
                  {selectedTreatment.appointment.tutor
                    ? ` | Tutor: ${selectedTreatment.appointment.tutor.name}`
                    : ''}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Tratamento *
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto (opcional)
                </label>
                <select
                  value={editFormData.productId || ''}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, productId: e.target.value || null }))
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300"
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
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateTreatment}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <LuSave className="w-4 h-4" />
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
