'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash,
  LuUser,
  LuPawPrint,
  LuCalendar,
  LuDollarSign,
  LuPhone,
  LuFileText,
  LuSave
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

// Tipos para Consulta (UI)
type ConsultationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW' | 'CONFIRMED';
type ConsultationType = 'ROUTINE' | 'EMERGENCY' | 'FOLLOW_UP' | 'VACCINATION' | 'SURGERY_PREP' | 'SPECIALIST';

interface Consultation {
  id: string;
  tutor: {
    id: string;
    name: string;
    phone? (() => null) : string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed? (() => null) : string;
    age? (() => null) : string;
  };
  veterinarian: {
    id: string;
    name: string;
    email? (() => null) : string;
  };
  date: string;
  time: string;
  duration: number;
  type? (() => null) : ConsultationType;
  status: ConsultationStatus;
  reason: string;
  diagnosis? (() => null) : string;
  prescription? (() => null) : string;
  notes? (() => null) : string;
  vitalSigns?: {
    temperature? (() => null) : number;
    heartRate? (() => null) : number;
    weight? (() => null) : number;
  };
  value: number;
  paid: boolean;
  followUpDate? (() => null) : string;
  createdAt: string;
  updatedAt: string;
}

// Tipos da API (Appointment)
interface Appointment {
  id: string;
  tutorId: string;
  petId: string;
  userId: string;
  date: string;
  duration: number;
  description? (() => null) : string;
  notes? (() => null) : string;
  value: number;
  status: string;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  tutor: {
    id: string;
    name: string;
    contacts? (() => null) : Array<{
      id: string;
      number: string;
      type: string;
      isPrimary: boolean;
    }>;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed? (() => null) : string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  treatments? (() => null) : Array<{
    id: string;
    description: string;
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
  breed? (() => null) : string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse {
  appointments: Appointment[];
  totals: {
    value: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Função para converter Appointment (API) para Consultation (UI)
const appointmentToConsultation = (appointment: Appointment): Consultation => {
  const appointmentDate = new Date(appointment.date);
  const dateStr = appointmentDate.toISOString().split('T')[0];
  const timeStr = appointmentDate.toTimeString().slice(0, 5);
  
  // Extrair informações adicionais das notes se existirem
  let diagnosis: string | undefined;
  let prescription: string | undefined;
  let vitalSigns: { temperature? (() => null) : number; heartRate? (() => null) : number; weight? (() => null) : number } | undefined;
  
  if (appointment.notes) {
    // Tentar extrair informações estruturadas das notes
    const notesLower = appointment.notes.toLowerCase();
    if (notesLower.includes('diagnóstico:')) {
      const diagnosisMatch = appointment.notes.match(/diagnóstico:\s*(.+?)(?:\n|prescrição:|$)/i);
      if (diagnosisMatch) diagnosis = diagnosisMatch[1].trim();
    }
    if (notesLower.includes('prescrição:')) {
      const prescriptionMatch = appointment.notes.match(/prescrição:\s*(.+?)(?:\n|$)/i);
      if (prescriptionMatch) prescription = prescriptionMatch[1].trim();
    }
  }
  
  // Mapear status
  let status: ConsultationStatus = 'SCHEDULED';
  if (appointment.status === 'IN_PROGRESS') status = 'IN_PROGRESS';
  else if (appointment.status === 'COMPLETED') status = 'COMPLETED';
  else if (appointment.status === 'CANCELED') status = 'CANCELED';
  else if (appointment.status === 'CONFIRMED') status = 'CONFIRMED';
  else if (appointment.status === 'NO_SHOW') status = 'NO_SHOW';
  
  const primaryContact = appointment.tutor.contacts?.find(c => c.isPrimary);
  
  return {
    id: appointment.id,
    tutor: {
      id: appointment.tutor.id,
      name: appointment.tutor.name,
      phone: primaryContact?.number
    },
    pet: {
      id: appointment.pet.id,
      name: appointment.pet.name,
      species: appointment.pet.species,
      breed: appointment.pet.breed
    },
    veterinarian: {
      id: appointment.userId,
      name: appointment.user?.name || 'Não atribuído',
      email: appointment.user?.email
    },
    date: dateStr,
    time: timeStr,
    duration: appointment.duration,
    status,
    reason: appointment.description || 'Consulta veterinária',
    diagnosis,
    prescription,
    notes: appointment.notes,
    vitalSigns,
    value: appointment.value,
    paid: appointment.paymentStatus === 'PAID',
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  };
};

export default function ConsultationsPage() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ConsultationType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dados para formulários
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    tutorId: '',
    petId: '',
    userId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 30,
    description: '',
    notes: '',
    value: 0,
    status: 'SCHEDULED' as ConsultationStatus,
    paymentStatus: 'PENDING' as 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'
  });

  // Carregar dados iniciais
  useEffect(() => {
    fetchConsultations();
    fetchInitialData();
  }, []);

  // Carregar pets quando tutor for selecionado
  useEffect(() => {
    if (formData.tutorId) {
      fetchPetsByTutor(formData.tutorId);
    } else {
      setPets([]);
    }
  }, [formData.tutorId]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) {
        params.append('startDate', dateFilter);
        params.append('endDate', dateFilter);
      }
      params.append('limit', '1000'); // Buscar todas as consultas

      const response = await fetch(`/api/appointments?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar consultas');
      }

      const data: ApiResponse = await response.json();
      const consultationsList = (data.appointments || []).map(appointmentToConsultation);
      setConsultations(consultationsList);
    } catch (err) {
      console.error('Erro ao buscar consultas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar consultas');
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);

      // Buscar tutores
      const tutorsResponse = await fetch('/api/tutors?limit=100');
      if (tutorsResponse.ok) {
        const tutorsData = await tutorsResponse.json();
        setTutors(tutorsData.tutors || []);
      }

      // Buscar veterinários
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPetsByTutor = async (tutorId: string) => {
    try {
      const response = await fetch(`/api/tutors/${tutorId}/pets`);
      if (response.ok) {
        const petsData = await response.json();
        setPets(Array.isArray(petsData) ? petsData : []);
        
        // Se houver apenas um pet, selecionar automaticamente
        if (Array.isArray(petsData) && petsData.length === 1) {
          setFormData(prev => ({ ...prev, petId: petsData[0].id }));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar pets:', err);
      setPets([]);
    }
  };


  // Filtrar consultas
  const filteredConsultations = consultations.filter(cons => {
    const matchesSearch = 
      cons.tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cons.pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cons.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cons.veterinarian.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cons.status === statusFilter;
    const matchesType = typeFilter === 'all' || (cons.type && cons.type === typeFilter);
    const matchesDate = !dateFilter || cons.date === dateFilter;

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  // Estatísticas
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = {
    total: consultations.length,
    today: consultations.filter(c => c.date === todayStr).length,
    scheduled: consultations.filter(c => c.status === 'SCHEDULED' || c.status === 'CONFIRMED').length,
    inProgress: consultations.filter(c => c.status === 'IN_PROGRESS').length,
    completed: consultations.filter(c => c.status === 'COMPLETED').length,
    totalRevenue: consultations.filter(c => c.paid).reduce((acc, c) => acc + c.value, 0)
  };

  // Funções auxiliares
  const getStatusColor = (status: ConsultationStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ConsultationStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'Agendada';
      case 'CONFIRMED': return 'Confirmada';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'COMPLETED': return 'Concluída';
      case 'CANCELED': return 'Cancelada';
      case 'NO_SHOW': return 'Não Compareceu';
      default: return status;
    }
  };

  const getTypeColor = (type? (() => null) : ConsultationType) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    switch (type) {
      case 'ROUTINE': return 'bg-blue-100 text-blue-800';
      case 'EMERGENCY': return 'bg-red-100 text-red-800';
      case 'FOLLOW_UP': return 'bg-purple-100 text-purple-800';
      case 'VACCINATION': return 'bg-green-100 text-green-800';
      case 'SURGERY_PREP': return 'bg-orange-100 text-orange-800';
      case 'SPECIALIST': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type? (() => null) : ConsultationType) => {
    if (!type) return 'Consulta';
    switch (type) {
      case 'ROUTINE': return 'Rotina';
      case 'EMERGENCY': return 'Emergência';
      case 'FOLLOW_UP': return 'Retorno';
      case 'VACCINATION': return 'Vacinação';
      case 'SURGERY_PREP': return 'Pré-Cirúrgico';
      case 'SPECIALIST': return 'Especialista';
      default: return type;
    }
  };

  const getTypeIcon = (type? (() => null) : ConsultationType) => {
    if (!type) return;
    switch (type) {
      case 'ROUTINE': return;
      case 'EMERGENCY': return;
      case 'FOLLOW_UP': return;
      case 'VACCINATION': return;
      case 'SURGERY_PREP': return;
      case 'SPECIALIST': return LuFileText;
      default: return;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const openDetails = (cons: Consultation) => {
    setSelectedConsultation(cons);
    setIsModalOpen(true);
  };

  const openEditModal = (cons: Consultation) => {
    const appointmentDate = new Date(`${cons.date}T${cons.time}`);
    setFormData({
      tutorId: cons.tutor.id,
      petId: cons.pet.id,
      userId: cons.veterinarian.id,
      date: cons.date,
      time: cons.time,
      duration: cons.duration,
      description: cons.reason,
      notes: cons.notes || '',
      value: cons.value,
      status: cons.status,
      paymentStatus: cons.paid ? 'PAID' : 'PENDING'
    });
    setSelectedConsultation(cons);
    setIsEditModalOpen(true);
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setFormData({
      tutorId: '',
      petId: '',
      userId: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      duration: 30,
      description: '',
      notes: '',
      value: 0,
      status: 'SCHEDULED',
      paymentStatus: 'PENDING'
    });
    setPets([]);
  };

  const handleCreateConsultation = async () => {
    if (!formData.tutorId || !formData.petId || !formData.userId || !formData.date || !formData.time) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dateTime = new Date(`${formData.date}T${formData.time}`);

      const appointmentData = {
        tutorId: formData.tutorId,
        petId: formData.petId,
        userId: formData.userId,
        date: dateTime.toISOString(),
        duration: formData.duration,
        description: formData.description || null,
        notes: formData.notes || null,
        value: formData.value || 0,
        status: formData.status,
        paymentStatus: formData.paymentStatus
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(appointmentData)});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar consulta');
      }

      toast.success('Consulta criada com sucesso!');
      setIsCreateModalOpen(false);
      resetForm();
      fetchConsultations();
    } catch (err) {
      console.error('Erro ao criar consulta:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao criar consulta';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateConsultation = async () => {
    if (!selectedConsultation || !formData.tutorId || !formData.petId || !formData.userId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dateTime = new Date(`${formData.date}T${formData.time}`);

      const appointmentData = {
        tutorId: formData.tutorId,
        petId: formData.petId,
        userId: formData.userId,
        date: dateTime.toISOString(),
        duration: formData.duration,
        description: formData.description || null,
        notes: formData.notes || null,
        value: formData.value || 0,
        status: formData.status,
        paymentStatus: formData.paymentStatus
      };

      const response = await fetch(`/api/appointments/${selectedConsultation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(appointmentData)});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar consulta');
      }

      toast.success('Consulta atualizada com sucesso!');
      setIsEditModalOpen(false);
      resetForm();
      fetchConsultations();
    } catch (err) {
      console.error('Erro ao atualizar consulta:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar consulta';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartConsultation = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({ status: 'IN_PROGRESS' })});

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
          'Erro ao iniciar consulta';
        throw new Error(String(message));
      }

      toast.success('Consulta iniciada com sucesso!');
      fetchConsultations();
    } catch (err) {
      console.error('Erro ao iniciar consulta:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar consulta');
    }
  };

  const handleCompleteConsultation = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({ status: 'COMPLETED' })});

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
          'Erro ao finalizar consulta';
        throw new Error(String(message));
      }

      toast.success('Consulta finalizada com sucesso!');
      setIsModalOpen(false);
      fetchConsultations();
    } catch (err) {
      console.error('Erro ao finalizar consulta:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao finalizar consulta');
    }
  };

  const handleCancelConsultation = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta consulta?')) return;

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({ status: 'CANCELED' })});

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
          'Erro ao cancelar consulta';
        throw new Error(String(message));
      }

      toast.success('Consulta cancelada com sucesso!');
      fetchConsultations();
    } catch (err) {
      console.error('Erro ao cancelar consulta:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar consulta');
    }
  };

  const requestDeleteConsultation = (consultation: Consultation) => {
    setConsultationToDelete(consultation);
  };

  const confirmDeleteConsultation = async () => {
    if (!consultationToDelete) return;

    const response = await fetch(`/api/appointments/${consultationToDelete.id}`, {
      method: 'DELETE'});

    if (response.ok) {
      toast.success('Consulta excluída com sucesso!');
      setIsModalOpen(false);
      await fetchConsultations();
      setConsultationToDelete(null);
      return;
    }

    const data = await response.json().catch(() => null);
    const message =
      (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
      'Erro ao excluir consulta';
    throw new Error(message);
  };

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchConsultations();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, dateFilter]);

  if (loading && consultations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando consultas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <ConfirmDeleteModal
        isOpen={Boolean(consultationToDelete)}
        entityLabel="Consulta"
        itemName={
          consultationToDelete
            ? `${consultationToDelete.pet?.name || 'Pet'} • ${consultationToDelete.tutor?.name || 'Tutor'}`
            : '—'
        }
        consequenceText="Esta ação não pode ser desfeita. A consulta será removida."
        onClose={() => setConsultationToDelete(null)}
        onConfirm={confirmDeleteConsultation}
      />
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Consultas
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie consultas veterinárias e atendimentos
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/erp/consultas/relatorio"
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <span style={{fontSize:"14px"}}>📈</span>
                    <span>Relatório</span>
                  </Link>
                  <button 
                    onClick={() => {
                      resetForm();
                      setIsCreateModalOpen(true);
                    }}
                    className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-cyan-600 rounded-2xl hover:from-cyan-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 flex items-center space-x-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Nova Consulta</span>
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
                  icon: () => <span style={{fontSize:"14px"}}>🩺</span>
                },
                { 
                  label: "Hoje", 
                  value: stats.today, 
                  color: "blue", 
                  icon: LuCalendar
                },
                { 
                  label: "Agendadas", 
                  value: stats.scheduled, 
                  color: "purple", 
                  icon: () => <span style={{fontSize:"14px"}}>⏱</span>
                },
                { 
                  label: "Em Andamento", 
                  value: stats.inProgress, 
                  color: "yellow", 
                  icon: () => <span style={{fontSize:"14px"}}>⚡</span>
                },
                { 
                  label: "Concluídas", 
                  value: stats.completed, 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>✓</span>
                },
                { 
                  label: "Receita", 
                  value: formatCurrency(stats.totalRevenue), 
                  color: "teal", 
                  icon: LuDollarSign,
                  isFormatted: true
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-cyan-500/5 p-6 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-105">
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
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-cyan-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por tutor, pet, veterinário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ConsultationStatus | 'all')}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="SCHEDULED">Agendadas</option>
                    <option value="CONFIRMED">Confirmadas</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="COMPLETED">Concluídas</option>
                    <option value="CANCELED">Canceladas</option>
                    <option value="NO_SHOW">Não Compareceu</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  />
                  <button
                    onClick={() => setDateFilter(todayStr)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 hover:scale-105 ${
                      dateFilter === todayStr
                        ? 'text-white bg-cyan-500 hover:bg-cyan-600' 
                        : 'text-gray-600 bg-white/50 border border-gray-300/50 hover:bg-white hover:border-gray-400'
                    }`}
                  >
                    <LuCalendar className="w-4 h-4" />
                    <span>Hoje</span>
                  </button>
                  <button
                    onClick={fetchConsultations}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    <LuSearch className="w-4 h-4" />
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Consultations Table */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-cyan-500/5 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Lista de Consultas
                  </h3>
                  <div className="text-sm text-gray-600">
                    {filteredConsultations.length} consultas encontradas
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Paciente/Tutor</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Veterinário</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Data/Hora</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Valor</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsultations.map((cons) => {
                      const TypeIcon = getTypeIcon(cons.type);
                      
                      return (
                        <tr 
                          key={cons.id} 
                          className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 group cursor-pointer"
                          onClick={() => openDetails(cons)}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${getTypeColor(cons.type)}`}>
                                <LuPawPrint className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {cons.pet.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {cons.pet.species} {cons.pet.breed && `• ${cons.pet.breed}`} • {cons.tutor.name}
                                </div>
                                {cons.tutor.phone && (
                                  <div className="text-xs text-gray-400 flex items-center gap-1">
                                    <LuPhone className="w-3 h-3" />
                                    {cons.tutor.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <span style={{fontSize:"14px"}}>🩺</span>
                              <span className="text-gray-700">{cons.veterinarian.name}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1 text-gray-700">
                              <LuCalendar className="w-4 h-4" />
                              {formatDate(cons.date)}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <span style={{fontSize:"14px"}}>⏱</span>
                              {cons.time} • {cons.duration}min
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cons.status)}`}>
                              {getStatusLabel(cons.status)}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(cons.value)}
                            </div>
                            <div className={`text-xs mt-1 ${cons.paid ? 'text-green-600' : 'text-orange-600'}`}>
                              {cons.paid ? '✓ Pago' : '○ Pendente'}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {cons.status === 'SCHEDULED' || cons.status === 'CONFIRMED' ? (
                                <button
                                  onClick={() => handleStartConsultation(cons.id)}
                                  className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-2xl transition-colors"
                                  title="Iniciar consulta"
                                >
                                  <span style={{fontSize:"14px"}}>⚡</span>
                                </button>
                              ) : null}
                              {cons.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleCompleteConsultation(cons.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-2xl transition-colors"
                                  title="Finalizar consulta"
                                >
                                  <span style={{fontSize:"14px"}}>✓</span>
                                </button>
                              )}
                              {(cons.status === 'SCHEDULED' || cons.status === 'CONFIRMED' || cons.status === 'IN_PROGRESS') && (
                                <button
                                  onClick={() => handleCancelConsultation(cons.id)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-2xl transition-colors"
                                  title="Cancelar consulta"
                                >
                                  <span style={{fontSize:"14px"}}>✕</span>
                                </button>
                              )}
                              <Link
                                href={`/dashboard/erp/consultas/${cons.id}/gravar`}
                                className="p-2 text-violet-600 hover:bg-violet-50 rounded-2xl transition-colors"
                                title="Gravar consulta & Gerar documentos"
                              >
                                <span style={{fontSize:"14px"}}>🎤</span>
                              </Link>
                              <Link
                                href={`/dashboard/erp/consultas/${cons.id}/documentos`}
                                className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-2xl transition-colors"
                                title="Ver documentos clínicos"
                              >
                                <LuFileText className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => openEditModal(cons)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"
                                title="Editar consulta"
                              >
                                <LuPencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => requestDeleteConsultation(cons)}
                                className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 rounded-2xl transition-colors"
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

                {filteredConsultations.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <span style={{fontSize:"14px"}}>🩺</span>
                    <p className="text-gray-500 text-lg">Nenhuma consulta encontrada</p>
                    <p className="text-gray-400 mt-2">
                      {consultations.length === 0 
                        ? 'Agende a primeira consulta' 
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Mostrando {filteredConsultations.length} de {consultations.length} consultas
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Detalhes da Consulta</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedConsultation.date)} às {selectedConsultation.time}
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
              {/* Status e Tipo */}
              <div className="flex gap-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedConsultation.status)}`}>
                  {getStatusLabel(selectedConsultation.status)}
                </span>
                {selectedConsultation.type && (
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getTypeColor(selectedConsultation.type)}`}>
                    {getTypeLabel(selectedConsultation.type)}
                  </span>
                )}
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${selectedConsultation.paid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {selectedConsultation.paid ? '✓ Pago' : '○ Pendente'}
                </span>
              </div>

              {/* Informações do Paciente */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuPawPrint className="w-5 h-5 text-cyan-600" />
                  Informações do Paciente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pet</label>
                    <p className="text-gray-900">{selectedConsultation.pet.name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedConsultation.pet.species} {selectedConsultation.pet.breed && `• ${selectedConsultation.pet.breed}`}
                      {selectedConsultation.pet.age && ` • ${selectedConsultation.pet.age}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tutor</label>
                    <p className="text-gray-900">{selectedConsultation.tutor.name}</p>
                    {selectedConsultation.tutor.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <LuPhone className="w-3 h-3" />
                        {selectedConsultation.tutor.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Veterinário</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <span style={{fontSize:"14px"}}>🩺</span>
                      {selectedConsultation.veterinarian.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Duração</label>
                    <p className="text-gray-900">{selectedConsultation.duration} minutos</p>
                  </div>
                </div>
              </div>

              {/* Motivo e Diagnóstico */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span style={{fontSize:"14px"}}>📋</span>
                  Informações Clínicas
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Motivo da Consulta</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-xl">{selectedConsultation.reason}</p>
                  </div>
                  {selectedConsultation.diagnosis && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Diagnóstico</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-xl">{selectedConsultation.diagnosis}</p>
                    </div>
                  )}
                  {selectedConsultation.prescription && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <span style={{fontSize:"14px"}}>💊</span>
                        Prescrição
                      </label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-xl">{selectedConsultation.prescription}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuDollarSign className="w-5 h-5 text-green-600" />
                  Valor
                </h4>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedConsultation.value)}</p>
                  <p className={`text-sm ${selectedConsultation.paid ? 'text-green-600' : 'text-orange-600'}`}>
                    {selectedConsultation.paid ? '✓ Pagamento confirmado' : '○ Pagamento pendente'}
                  </p>
                </div>
              </div>

              {/* Observações */}
              {selectedConsultation.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Observações</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-2xl">
                    {selectedConsultation.notes}
                  </p>
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
              <Link
                href={`/dashboard/erp/consultas/${selectedConsultation.id}/gravar`}
                className="px-6 py-3 text-white bg-violet-600 rounded-2xl hover:bg-violet-700 transition-colors flex items-center gap-2"
              >
                <span style={{fontSize:"14px"}}>🎤</span>
                Gravar & Documentos
              </Link>
              <Link
                href={`/dashboard/erp/consultas/${selectedConsultation.id}/documentos`}
                className="px-6 py-3 text-white bg-cyan-600 rounded-2xl hover:bg-cyan-700 transition-colors flex items-center gap-2"
              >
                <LuFileText className="w-4 h-4" />
                Documentos
              </Link>
              <button
                onClick={() => openEditModal(selectedConsultation)}
                className="px-6 py-3 text-white bg-cyan-600 rounded-2xl hover:bg-cyan-700 transition-colors flex items-center gap-2"
              >
                <LuPencil className="w-4 h-4" />
                Editar
              </button>
              {selectedConsultation.status === 'SCHEDULED' || selectedConsultation.status === 'CONFIRMED' ? (
                <button
                  onClick={() => handleStartConsultation(selectedConsultation.id)}
                  className="px-6 py-3 text-white bg-cyan-600 rounded-2xl hover:bg-cyan-700 transition-colors flex items-center gap-2"
                >
                  <span style={{fontSize:"14px"}}>⚡</span>
                  Iniciar Consulta
                </button>
              ) : null}
              {selectedConsultation.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleCompleteConsultation(selectedConsultation.id)}
                  className="px-6 py-3 text-white bg-green-600 rounded-2xl hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <span style={{fontSize:"14px"}}>✓</span>
                  Finalizar Consulta
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Consulta */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditModalOpen ? 'Editar Consulta' : 'Nova Consulta'}
                </h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                  required
                  disabled={loadingData}
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                  required
                  disabled={!formData.tutorId || loadingData || pets.length === 0}
                >
                  <option value="">
                    {!formData.tutorId 
                      ? 'Selecione um tutor primeiro' 
                      : pets.length === 0 
                      ? 'Nenhum pet encontrado' 
                      : 'Selecione um pet'}
                  </option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.species}) {pet.breed && `- ${pet.breed}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Veterinário *</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({...formData, userId: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                  required
                  disabled={loadingData}
                >
                  <option value="">Selecione um veterinário</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horário *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duração (min) *</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30min</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as ConsultationStatus})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="SCHEDULED">Agendada</option>
                    <option value="CONFIRMED">Confirmada</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="COMPLETED">Concluída</option>
                    <option value="CANCELED">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da Consulta *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900 resize-none"
                  rows={3}
                  placeholder="Descreva o motivo da consulta"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900 resize-none"
                  rows={3}
                  placeholder="Observações, diagnóstico, prescrição..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status de Pagamento</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({...formData, paymentStatus: e.target.value as 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="OVERDUE">Atrasado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={isEditModalOpen ? handleUpdateConsultation : handleCreateConsultation}
                disabled={submitting || !formData.tutorId || !formData.petId || !formData.userId || !formData.description}
                className="px-6 py-3 text-white bg-gradient-to-r from-cyan-600 to-cyan-600 rounded-2xl hover:from-cyan-700 hover:to-cyan-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <LuSave className="w-4 h-4" />
                    <span>{isEditModalOpen ? 'Salvar Alterações' : 'Agendar Consulta'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
