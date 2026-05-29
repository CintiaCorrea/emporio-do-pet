'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LuBedDouble,
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuUser,
  LuPawPrint,
  LuCalendar,
  LuClock,
  LuTriangleAlert,
  LuDollarSign,
  LuTrendingUp,
  LuHeart,
  LuActivity,
  LuThermometer,
  LuClipboardList,
  LuCircleCheck,
  LuArrowUpRight,
  LuPhone,
  LuStethoscope,
  LuSave
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

// Tipos para Internação
type HospitalizationStatus = 'ADMITTED' | 'IN_TREATMENT' | 'STABLE' | 'CRITICAL' | 'DISCHARGE_PENDING' | 'DISCHARGED' | 'DECEASED';

interface Hospitalization {
  id: string;
  tutor: {
    id: string;
    name: string;
    phone?: string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    age?: string;
  };
  veterinarian?: {
    id: string;
    name: string;
  };
  admissionDate: string;
  estimatedDischargeDate?: string;
  actualDischargeDate?: string;
  reason: string;
  diagnosis?: string;
  notes?: string;
  roomNumber?: string;
  dailyRate: number;
  totalCost: number;
  status: HospitalizationStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vitalSigns?: {
    temperature?: number;
    heartRate?: number;
    weight?: number;
  };
  treatments: Array<{
    id: string;
    description: string;
    date: string;
    cost: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Tutor {
  id: string;
  name: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function HospitalizationsPage() {
  const [hospitalizations, setHospitalizations] = useState<Hospitalization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<HospitalizationStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('all');
  const [selectedHospitalization, setSelectedHospitalization] = useState<Hospitalization | null>(null);
  const [hospitalizationToDelete, setHospitalizationToDelete] = useState<Hospitalization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dados para selects
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Form state for create
  const [formData, setFormData] = useState({
    tutorId: '',
    petId: '',
    userId: '',
    reason: '',
    roomNumber: '',
    dailyRate: 200,
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    estimatedDischargeDate: '',
    diagnosis: '',
    notes: '',
    vitalSigns: {
      temperature: undefined as number | undefined,
      heartRate: undefined as number | undefined,
      weight: undefined as number | undefined
    }
  });

  // Form state for edit
  const [editFormData, setEditFormData] = useState({
    reason: '',
    roomNumber: '',
    dailyRate: 0,
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    status: 'ADMITTED' as HospitalizationStatus,
    estimatedDischargeDate: '',
    actualDischargeDate: '',
    diagnosis: '',
    notes: '',
    vitalSigns: {
      temperature: undefined as number | undefined,
      heartRate: undefined as number | undefined,
      weight: undefined as number | undefined
    }
  });

  // Carregar dados iniciais
  useEffect(() => {
    fetchHospitalizations();
    fetchInitialData();
  }, []);

  // Carregar pets quando tutor for selecionado
  useEffect(() => {
    const fetchPets = async () => {
      if (!formData.tutorId) {
        setPets([]);
        setFormData(prev => ({ ...prev, petId: '' }));
        return;
      }

      try {
        const response = await fetch(`/api/tutors/${formData.tutorId}/pets`);
        if (response.ok) {
          const petsData = await response.json();
          setPets(Array.isArray(petsData) ? petsData : []);

          // Se houver apenas um pet, selecionar automaticamente
          if (Array.isArray(petsData) && petsData.length === 1) {
            setFormData(prev => ({ ...prev, petId: petsData[0].id }));
          } else {
            setFormData(prev => ({ ...prev, petId: '' }));
          }
        } else {
          setPets([]);
        }
      } catch (err) {
        console.error('Erro ao carregar pets:', err);
        setPets([]);
      }
    };

    fetchPets();
  }, [formData.tutorId]);

  const fetchInitialData = async () => {
    try {
      // Buscar tutores
      const tutorsResponse = await fetch('/api/tutors?limit=100');
      if (tutorsResponse.ok) {
        const tutorsData = await tutorsResponse.json();
        setTutors(tutorsData.tutors || []);
      }

      // Buscar usuários (veterinários)
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    }
  };

  const fetchHospitalizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/hospitalizations?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar internações');

      const data = await response.json();
      setHospitalizations(data.hospitalizations || []);
    } catch (err) {
      console.error('Erro ao carregar internações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar internações');
    } finally {
      setLoading(false);
    }
  };

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      fetchHospitalizations();
    }
  }, [statusFilter, priorityFilter, searchTerm]);


  // Filtrar internações (filtro local adicional)
  const filteredHospitalizations = hospitalizations.filter(hosp => {
    const matchesSearch = 
      hosp.tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hosp.pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hosp.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hosp.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || hosp.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || hosp.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Estatísticas
  const stats = {
    total: hospitalizations.length,
    active: hospitalizations.filter(h => !['DISCHARGED', 'DECEASED'].includes(h.status)).length,
    critical: hospitalizations.filter(h => h.status === 'CRITICAL' || h.priority === 'CRITICAL').length,
    dischargePending: hospitalizations.filter(h => h.status === 'DISCHARGE_PENDING').length,
    discharged: hospitalizations.filter(h => h.status === 'DISCHARGED').length,
    totalRevenue: hospitalizations.reduce((acc, h) => acc + h.totalCost, 0)
  };

  // Funções auxiliares
  const getStatusColor = (status: HospitalizationStatus) => {
    switch (status) {
      case 'ADMITTED': return 'bg-blue-100 text-blue-800';
      case 'IN_TREATMENT': return 'bg-yellow-100 text-yellow-800';
      case 'STABLE': return 'bg-green-100 text-green-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'DISCHARGE_PENDING': return 'bg-purple-100 text-purple-800';
      case 'DISCHARGED': return 'bg-gray-100 text-gray-800';
      case 'DECEASED': return 'bg-gray-300 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: HospitalizationStatus) => {
    switch (status) {
      case 'ADMITTED': return 'Admitido';
      case 'IN_TREATMENT': return 'Em Tratamento';
      case 'STABLE': return 'Estável';
      case 'CRITICAL': return 'Crítico';
      case 'DISCHARGE_PENDING': return 'Alta Pendente';
      case 'DISCHARGED': return 'Alta';
      case 'DECEASED': return 'Óbito';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'Baixa';
      case 'MEDIUM': return 'Média';
      case 'HIGH': return 'Alta';
      case 'CRITICAL': return 'Crítica';
      default: return priority;
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
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDaysHospitalized = (admissionDate: string) => {
    const admission = new Date(admissionDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const openDetails = (hosp: Hospitalization) => {
    setSelectedHospitalization(hosp);
    setIsModalOpen(true);
  };

  const openEdit = (hosp: Hospitalization) => {
    setSelectedHospitalization(hosp);
    setEditFormData({
      reason: hosp.reason,
      roomNumber: hosp.roomNumber || '',
      dailyRate: hosp.dailyRate,
      priority: hosp.priority,
      status: hosp.status,
      estimatedDischargeDate: hosp.estimatedDischargeDate ? hosp.estimatedDischargeDate.split('T')[0] : '',
      actualDischargeDate: hosp.actualDischargeDate ? hosp.actualDischargeDate.split('T')[0] : '',
      diagnosis: hosp.diagnosis || '',
      notes: hosp.notes || '',
      vitalSigns: hosp.vitalSigns || {
        temperature: undefined,
        heartRate: undefined,
        weight: undefined
      }
    });
    setIsEditModalOpen(true);
  };

  const handleCreateHospitalization = async () => {
    if (!formData.tutorId || !formData.petId || !formData.userId || !formData.reason || !formData.dailyRate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/hospitalizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          tutorId: formData.tutorId,
          petId: formData.petId,
          userId: formData.userId,
          reason: formData.reason,
          roomNumber: formData.roomNumber || undefined,
          dailyRate: formData.dailyRate,
          priority: formData.priority,
          estimatedDischargeDate: formData.estimatedDischargeDate || undefined,
          diagnosis: formData.diagnosis || undefined,
          notes: formData.notes || undefined,
          vitalSigns: Object.values(formData.vitalSigns).some(v => v !== undefined) ? formData.vitalSigns : undefined
        })});

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          (errorData &&
            (errorData.error ||
              (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message))) ||
          'Erro ao criar internação';
        throw new Error(String(message));
      }

      toast.success('Internação criada com sucesso!');
      setIsCreateModalOpen(false);
      setFormData({
        tutorId: '',
        petId: '',
        userId: '',
        reason: '',
        roomNumber: '',
        dailyRate: 200,
        priority: 'MEDIUM',
        estimatedDischargeDate: '',
        diagnosis: '',
        notes: '',
        vitalSigns: {
          temperature: undefined,
          heartRate: undefined,
          weight: undefined
        }
      });
      fetchHospitalizations();
    } catch (err) {
      console.error('Erro ao criar internação:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar internação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateHospitalization = async () => {
    if (!selectedHospitalization) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/hospitalizations/${selectedHospitalization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          reason: editFormData.reason,
          roomNumber: editFormData.roomNumber || undefined,
          dailyRate: editFormData.dailyRate,
          priority: editFormData.priority,
          status: editFormData.status,
          estimatedDischargeDate: editFormData.estimatedDischargeDate || undefined,
          actualDischargeDate: editFormData.actualDischargeDate || undefined,
          diagnosis: editFormData.diagnosis || undefined,
          notes: editFormData.notes || undefined,
          vitalSigns: Object.values(editFormData.vitalSigns).some(v => v !== undefined) ? editFormData.vitalSigns : undefined
        })});

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          (errorData &&
            (errorData.error ||
              (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message))) ||
          'Erro ao atualizar internação';
        throw new Error(String(message));
      }

      toast.success('Internação atualizada com sucesso!');
      setIsEditModalOpen(false);
      setIsModalOpen(false);
      fetchHospitalizations();
    } catch (err) {
      console.error('Erro ao atualizar internação:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar internação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async (id: string) => {
    if (!confirm('Confirmar alta do paciente?')) return;

    try {
      const response = await fetch(`/api/hospitalizations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          status: 'DISCHARGED',
          actualDischargeDate: new Date().toISOString()
        })});

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          (errorData &&
            (errorData.error ||
              (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message))) ||
          'Erro ao dar alta';
        throw new Error(String(message));
      }

      toast.success('Alta registrada com sucesso!');
      setIsModalOpen(false);
      fetchHospitalizations();
    } catch (err) {
      console.error('Erro ao dar alta:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao dar alta');
    }
  };

  const requestDelete = (hosp: Hospitalization) => {
    setHospitalizationToDelete(hosp);
  };

  const confirmDelete = async () => {
    if (!hospitalizationToDelete) return;

    const response = await fetch(`/api/hospitalizations/${hospitalizationToDelete.id}`, {
      method: 'DELETE'});

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message =
        (errorData &&
          (errorData.error ||
            (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message))) ||
        'Erro ao excluir internação';
      throw new Error(message);
    }

    toast.success('Internação excluída com sucesso!');
    setIsModalOpen(false);
    await fetchHospitalizations();
    setHospitalizationToDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando internações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <ConfirmDeleteModal
        isOpen={Boolean(hospitalizationToDelete)}
        entityLabel="Internação"
        itemName={
          hospitalizationToDelete
            ? `${hospitalizationToDelete.pet?.name || 'Pet'} • ${hospitalizationToDelete.tutor?.name || 'Tutor'}`
            : '—'
        }
        consequenceText="Esta ação não pode ser desfeita. O registro de internação será removido."
        onClose={() => setHospitalizationToDelete(null)}
        onConfirm={confirmDelete}
      />
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Internações
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie pacientes internados na clínica veterinária
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/erp/internacoes/relatorio"
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuTrendingUp className="w-4 h-4" />
                    <span>Relatório</span>
                  </Link>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25 flex items-center space-x-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Nova Internação</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
              {[
                { 
                  label: "Total", 
                  value: stats.total, 
                  color: "gray", 
                  icon: LuBedDouble
                },
                { 
                  label: "Ativos", 
                  value: stats.active, 
                  color: "blue", 
                  icon: LuActivity
                },
                { 
                  label: "Críticos", 
                  value: stats.critical, 
                  color: "red", 
                  icon: LuTriangleAlert
                },
                { 
                  label: "Alta Pendente", 
                  value: stats.dischargePending, 
                  color: "purple", 
                  icon: LuArrowUpRight
                },
                { 
                  label: "Altas", 
                  value: stats.discharged, 
                  color: "green", 
                  icon: LuCircleCheck
                },
                { 
                  label: "Receita Total", 
                  value: formatCurrency(stats.totalRevenue), 
                  color: "teal", 
                  icon: LuDollarSign,
                  isFormatted: true
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-red-500/5 p-6 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 hover:scale-105">
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

            {/* Filters and Search */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-red-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por tutor, pet, motivo ou quarto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as HospitalizationStatus | 'all')}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="ADMITTED">Admitido</option>
                    <option value="IN_TREATMENT">Em Tratamento</option>
                    <option value="STABLE">Estável</option>
                    <option value="CRITICAL">Crítico</option>
                    <option value="DISCHARGE_PENDING">Alta Pendente</option>
                    <option value="DISCHARGED">Alta</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todas Prioridades</option>
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => {
                      setStatusFilter('CRITICAL');
                      setPriorityFilter('all');
                    }}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 hover:scale-105 ${
                      statusFilter === 'CRITICAL'
                        ? 'text-white bg-red-500 hover:bg-red-600' 
                        : 'text-gray-600 bg-white/50 border border-gray-300/50 hover:bg-white hover:border-gray-400'
                    }`}
                  >
                    <LuTriangleAlert className="w-4 h-4" />
                    <span>Críticos</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hospitalizations Table */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-red-500/5 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Pacientes Internados
                  </h3>
                  <div className="text-sm text-gray-600">
                    {filteredHospitalizations.length} internações encontradas
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Paciente/Tutor</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Quarto</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Motivo</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Entrada</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Dias</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Custo</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHospitalizations.map((hosp) => (
                      <tr 
                        key={hosp.id} 
                        className={`border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 group cursor-pointer ${
                          hosp.status === 'CRITICAL' ? 'bg-red-50/30' : ''
                        }`}
                        onClick={() => openDetails(hosp)}
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${getPriorityColor(hosp.priority)}`}>
                              <LuPawPrint className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                {hosp.pet.name}
                                {hosp.status === 'CRITICAL' && (
                                  <LuTriangleAlert className="w-4 h-4 text-red-500 animate-pulse" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {hosp.pet.species} • {hosp.tutor.name}
                              </div>
                              {hosp.tutor.phone && (
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                  <LuPhone className="w-3 h-3" />
                                  {hosp.tutor.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <LuBedDouble className="w-3 h-3 mr-1" />
                            {hosp.roomNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="text-gray-700 max-w-[200px] truncate" title={hosp.reason}>
                            {hosp.reason}
                          </div>
                          {hosp.veterinarian && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <LuStethoscope className="w-3 h-3" />
                              {hosp.veterinarian.name}
                            </div>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-1 text-gray-700">
                            <LuCalendar className="w-4 h-4" />
                            {formatDate(hosp.admissionDate)}
                          </div>
                          {hosp.estimatedDischargeDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              Prev. alta: {formatDate(hosp.estimatedDischargeDate)}
                            </div>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <LuClock className="w-3 h-3 mr-1" />
                              {calculateDaysHospitalized(hosp.admissionDate)} dias
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(hosp.status)}`}>
                            {getStatusLabel(hosp.status)}
                          </span>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(hosp.priority)}`}>
                              {getPriorityLabel(hosp.priority)}
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(hosp.totalCost)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(hosp.dailyRate)}/dia
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {hosp.status !== 'DISCHARGED' && hosp.status !== 'DECEASED' && (
                              <button
                                onClick={() => handleDischarge(hosp.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-2xl transition-colors"
                                title="Dar alta"
                              >
                                <LuArrowUpRight className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(hosp)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"
                              title="Editar"
                            >
                              <LuPencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => requestDelete(hosp)}
                              className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 rounded-2xl transition-colors"
                              title="Excluir"
                            >
                              <LuTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredHospitalizations.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <LuBedDouble className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhuma internação encontrada</p>
                    <p className="text-gray-400 mt-2">
                      {hospitalizations.length === 0 
                        ? 'Não há pacientes internados no momento' 
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Mostrando {filteredHospitalizations.length} de {hospitalizations.length} internações
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedHospitalization && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Detalhes da Internação</h3>
                  <p className="text-sm text-gray-500">
                    Quarto {selectedHospitalization.roomNumber || 'N/A'} • {calculateDaysHospitalized(selectedHospitalization.admissionDate)} dias internado
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status e Prioridade */}
              <div className="flex gap-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedHospitalization.status)}`}>
                  {getStatusLabel(selectedHospitalization.status)}
                </span>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getPriorityColor(selectedHospitalization.priority)}`}>
                  Prioridade: {getPriorityLabel(selectedHospitalization.priority)}
                </span>
              </div>

              {/* Informações do Paciente */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuPawPrint className="w-5 h-5 text-red-600" />
                  Informações do Paciente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pet</label>
                    <p className="text-gray-900">{selectedHospitalization.pet.name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedHospitalization.pet.species} {selectedHospitalization.pet.breed && `• ${selectedHospitalization.pet.breed}`}
                      {selectedHospitalization.pet.age && ` • ${selectedHospitalization.pet.age}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tutor</label>
                    <p className="text-gray-900">{selectedHospitalization.tutor.name}</p>
                    {selectedHospitalization.tutor.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <LuPhone className="w-3 h-3" />
                        {selectedHospitalization.tutor.phone}
                      </p>
                    )}
                  </div>
                  {selectedHospitalization.veterinarian && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Veterinário</label>
                      <p className="text-gray-900 flex items-center gap-1">
                        <LuStethoscope className="w-4 h-4" />
                        {selectedHospitalization.veterinarian.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações da Internação */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuClipboardList className="w-5 h-5 text-red-600" />
                  Informações da Internação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Motivo</label>
                    <p className="text-gray-900">{selectedHospitalization.reason}</p>
                  </div>
                  {selectedHospitalization.diagnosis && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Diagnóstico</label>
                      <p className="text-gray-900">{selectedHospitalization.diagnosis}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data de Entrada</label>
                    <p className="text-gray-900">{formatDateTime(selectedHospitalization.admissionDate)}</p>
                  </div>
                  {selectedHospitalization.estimatedDischargeDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Previsão de Alta</label>
                      <p className="text-gray-900">{formatDate(selectedHospitalization.estimatedDischargeDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sinais Vitais */}
              {selectedHospitalization.vitalSigns && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <LuHeart className="w-5 h-5 text-red-600" />
                    Sinais Vitais
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedHospitalization.vitalSigns.temperature && (
                      <div className="bg-gray-50 p-4 rounded-2xl text-center">
                        <LuThermometer className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{selectedHospitalization.vitalSigns.temperature}°C</p>
                        <p className="text-xs text-gray-500">Temperatura</p>
                      </div>
                    )}
                    {selectedHospitalization.vitalSigns.heartRate && (
                      <div className="bg-gray-50 p-4 rounded-2xl text-center">
                        <LuHeart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{selectedHospitalization.vitalSigns.heartRate}</p>
                        <p className="text-xs text-gray-500">Freq. Cardíaca (bpm)</p>
                      </div>
                    )}
                    {selectedHospitalization.vitalSigns.weight && (
                      <div className="bg-gray-50 p-4 rounded-2xl text-center">
                        <LuActivity className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{selectedHospitalization.vitalSigns.weight}kg</p>
                        <p className="text-xs text-gray-500">Peso</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custos */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuDollarSign className="w-5 h-5 text-green-600" />
                  Custos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-sm text-gray-500">Diária</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedHospitalization.dailyRate)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-sm text-gray-500">Dias</p>
                    <p className="text-xl font-bold text-gray-900">{calculateDaysHospitalized(selectedHospitalization.admissionDate)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl">
                    <p className="text-sm text-green-600">Total</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(selectedHospitalization.totalCost)}</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedHospitalization.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Observações</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-2xl">
                    {selectedHospitalization.notes}
                  </p>
                </div>
              )}

              {/* Tratamentos */}
              {selectedHospitalization.treatments.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Tratamentos Realizados</h4>
                  <div className="space-y-3">
                    {selectedHospitalization.treatments.map((treatment) => (
                      <div key={treatment.id} className="bg-gray-50 p-4 rounded-2xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{treatment.description}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatDateTime(treatment.date)}
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
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  openEdit(selectedHospitalization);
                }}
                className="px-6 py-3 text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <LuPencil className="w-4 h-4" />
                Editar
              </button>
              {selectedHospitalization.status !== 'DISCHARGED' && selectedHospitalization.status !== 'DECEASED' && (
                <button
                  onClick={() => handleDischarge(selectedHospitalization.id)}
                  className="px-6 py-3 text-white bg-green-600 rounded-2xl hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <LuArrowUpRight className="w-4 h-4" />
                  Dar Alta
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Internação */}
      {isEditModalOpen && selectedHospitalization && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Editar Internação</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da Internação *</label>
                <textarea
                  value={editFormData.reason}
                  onChange={(e) => setEditFormData({...editFormData, reason: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 resize-none"
                  rows={3}
                  placeholder="Descreva o motivo da internação"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quarto</label>
                  <input
                    type="text"
                    value={editFormData.roomNumber}
                    onChange={(e) => setEditFormData({...editFormData, roomNumber: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                    placeholder="Ex: Q-01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diária (R$) *</label>
                  <input
                    type="number"
                    value={editFormData.dailyRate}
                    onChange={(e) => setEditFormData({...editFormData, dailyRate: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value as HospitalizationStatus})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="ADMITTED">Admitido</option>
                    <option value="IN_TREATMENT">Em Tratamento</option>
                    <option value="STABLE">Estável</option>
                    <option value="CRITICAL">Crítico</option>
                    <option value="DISCHARGE_PENDING">Alta Pendente</option>
                    <option value="DISCHARGED">Alta</option>
                    <option value="DECEASED">Óbito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade *</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({...editFormData, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previsão de Alta</label>
                  <input
                    type="date"
                    value={editFormData.estimatedDischargeDate}
                    onChange={(e) => setEditFormData({...editFormData, estimatedDischargeDate: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data de Alta</label>
                  <input
                    type="date"
                    value={editFormData.actualDischargeDate}
                    onChange={(e) => setEditFormData({...editFormData, actualDischargeDate: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                <input
                  type="text"
                  value={editFormData.diagnosis}
                  onChange={(e) => setEditFormData({...editFormData, diagnosis: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  placeholder="Diagnóstico"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sinais Vitais</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Temperatura (°C)</label>
                    <input
                      type="number"
                      value={editFormData.vitalSigns.temperature || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        vitalSigns: {...editFormData.vitalSigns, temperature: e.target.value ? parseFloat(e.target.value) : undefined}
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Freq. Cardíaca (bpm)</label>
                    <input
                      type="number"
                      value={editFormData.vitalSigns.heartRate || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        vitalSigns: {...editFormData.vitalSigns, heartRate: e.target.value ? parseFloat(e.target.value) : undefined}
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      value={editFormData.vitalSigns.weight || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        vitalSigns: {...editFormData.vitalSigns, weight: e.target.value ? parseFloat(e.target.value) : undefined}
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 resize-none"
                  rows={3}
                  placeholder="Observações adicionais"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateHospitalization}
                disabled={submitting || !editFormData.reason || !editFormData.dailyRate}
                className="px-6 py-3 text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuSave className="w-4 h-4" />
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Internação */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Nova Internação</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Tutor *</label>
                <select
                  value={formData.tutorId}
                  onChange={(e) => setFormData({...formData, tutorId: e.target.value, petId: ''})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                >
                  <option value="">Selecione um tutor</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>{tutor.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pet *</label>
                <select
                  value={formData.petId}
                  onChange={(e) => setFormData({...formData, petId: e.target.value})}
                  disabled={!formData.tutorId || pets.length === 0}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{!formData.tutorId ? 'Selecione um tutor primeiro' : pets.length === 0 ? 'Nenhum pet encontrado' : 'Selecione um pet'}</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>{pet.name} - {pet.species}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Veterinário Responsável *</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({...formData, userId: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                >
                  <option value="">Selecione um veterinário</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da Internação *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 resize-none"
                  rows={3}
                  placeholder="Descreva o motivo da internação"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quarto</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                    placeholder="Ex: Q-01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diária (R$) *</label>
                  <input
                    type="number"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({...formData, dailyRate: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previsão de Alta</label>
                  <input
                    type="date"
                    value={formData.estimatedDischargeDate}
                    onChange={(e) => setFormData({...formData, estimatedDischargeDate: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  placeholder="Diagnóstico"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sinais Vitais</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Temperatura (°C)</label>
                    <input
                      type="number"
                      value={formData.vitalSigns.temperature || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        vitalSigns: {...formData.vitalSigns, temperature: e.target.value ? parseFloat(e.target.value) : undefined}
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Freq. Cardíaca (bpm)</label>
                    <input
                      type="number"
                      value={formData.vitalSigns.heartRate || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        vitalSigns: {...formData.vitalSigns, heartRate: e.target.value ? parseFloat(e.target.value) : undefined}
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      value={formData.vitalSigns.weight || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        vitalSigns: {...formData.vitalSigns, weight: e.target.value ? parseFloat(e.target.value) : undefined}
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900 resize-none"
                  rows={3}
                  placeholder="Observações adicionais"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateHospitalization}
                disabled={submitting || !formData.tutorId || !formData.petId || !formData.userId || !formData.reason || !formData.dailyRate}
                className="px-6 py-3 text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuPlus className="w-4 h-4" />
                {submitting ? 'Registrando...' : 'Registrar Internação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
