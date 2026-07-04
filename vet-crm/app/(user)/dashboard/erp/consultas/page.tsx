'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    phone?: string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    age?: string;
  };
  veterinarian: {
    id: string;
    name: string;
    email?: string;
  };
  date: string;
  time: string;
  duration: number;
  type?: ConsultationType;
  status: ConsultationStatus;
  reason: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  vitalSigns?: {
    temperature?: number;
    heartRate?: number;
    weight?: number;
  };
  value: number;
  paid: boolean;
  followUpDate?: string;
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
  description?: string;
  notes?: string;
  value: number;
  status: string;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  tutor: {
    id: string;
    name: string;
    contacts?: Array<{
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
    breed?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  treatments?: Array<{
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
  breed?: string;
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
  let vitalSigns: { temperature?: number; heartRate?: number; weight?: number } | undefined;
  
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
      case 'SCHEDULED': return 'bg-[#E0F4F6] text-[#014D5E]';
      case 'CONFIRMED': return 'bg-[#e1f5ee] text-[#0f6e56]';
      case 'IN_PROGRESS': return 'bg-[#fdf6e3] text-[#854F0B]';
      case 'COMPLETED': return 'bg-[#e1f5ee] text-[#0f6e56]';
      case 'CANCELED': return 'bg-[#fef0e8] text-[#993C1D]';
      case 'NO_SHOW': return 'bg-[#F0EBE0] text-[#5C6B70]';
      default: return 'bg-[#F0EBE0] text-[#5C6B70]';
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

  const getTypeColor = (type?: ConsultationType) => {
    if (!type) return 'bg-[#F0EBE0] text-[#5C6B70]';
    switch (type) {
      case 'ROUTINE': return 'bg-[#E0F4F6] text-[#014D5E]';
      case 'EMERGENCY': return 'bg-[#fef0e8] text-[#993C1D]';
      case 'FOLLOW_UP': return 'bg-[#E0F4F6] text-[#014D5E]';
      case 'VACCINATION': return 'bg-[#e1f5ee] text-[#0f6e56]';
      case 'SURGERY_PREP': return 'bg-[#fdf6e3] text-[#854F0B]';
      case 'SPECIALIST': return 'bg-[#E0F4F6] text-[#014D5E]';
      default: return 'bg-[#F0EBE0] text-[#5C6B70]';
    }
  };

  const getTypeLabel = (type?: ConsultationType) => {
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

  const getTypeIcon = (type?: ConsultationType) => {
    if (!type) return;
    switch (type) {
      case 'ROUTINE': return;
      case 'EMERGENCY': return;
      case 'FOLLOW_UP': return;
      case 'VACCINATION': return;
      case 'SURGERY_PREP': return;
      case 'SPECIALIST': return;
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
      <div className="min-h-screen bg-[#F6F2EA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009AAC] mx-auto"></div>
          <p className="mt-4 text-[#5C6B70]">Carregando consultas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] w-full overflow-hidden">
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
                  <h1 className="text-3xl font-medium text-[#014D5E] flex items-center gap-2">
                    <span style={{fontSize:"26px"}}>🩺</span>
                    Consultas
                  </h1>
                  <p className="text-[#5C6B70] mt-2">
                    Gerencie consultas veterinárias e atendimentos
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/erp/consultas/relatorio"
                    className="px-6 py-3 text-sm font-medium text-[#5C6B70] bg-white border border-[#E8E2D6] rounded-[9px] hover:bg-[#FBF9F4] transition-all flex items-center space-x-2"
                  >
                    <span style={{fontSize:"14px"}}>📊</span>
                    <span>Relatório</span>
                  </Link>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsCreateModalOpen(true);
                    }}
                    className="px-6 py-3 text-sm font-medium text-white bg-[#009AAC] rounded-[9px] hover:bg-[#014D5E] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 transition-all flex items-center space-x-2"
                  >
                    <span style={{fontSize:"14px"}}>➕</span>
                    <span>Nova Consulta</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-[#fef0e8] border border-[#E8E2D6] rounded-[13px] text-[#993C1D]">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="float-right text-[#993C1D] hover:opacity-70"
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
                  icon: () => <span style={{fontSize:"14px"}}>📅</span>
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
                  icon: () => <span style={{fontSize:"14px"}}>💰</span>,
                  isFormatted: true
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white border border-[#E8E2D6] rounded-[13px] p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-[#E0F4F6] rounded-[9px] flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-[#014D5E]" />
                    </div>
                    <div className={`font-medium text-[#014D5E] ${stat.isFormatted ? 'text-lg' : 'text-2xl'}`}>
                      {stat.value}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5C6B70]">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters and Search */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px] p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span style={{fontSize:"15px"}}>🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por tutor, pet, veterinário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E] placeholder-[#8A989D]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ConsultationStatus | 'all')}
                    className="px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
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
                    className="px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                  />
                  <button
                    onClick={() => setDateFilter(todayStr)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-[9px] transition-all ${
                      dateFilter === todayStr
                        ? 'text-white bg-[#009AAC] hover:bg-[#014D5E]'
                        : 'text-[#5C6B70] bg-white border border-[#E8E2D6] hover:bg-[#FBF9F4]'
                    }`}
                  >
                    <span style={{fontSize:"14px"}}>📅</span>
                    <span>Hoje</span>
                  </button>
                  <button
                    onClick={fetchConsultations}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#5C6B70] bg-white border border-[#E8E2D6] rounded-[9px] hover:bg-[#FBF9F4] transition-all"
                  >
                    <span style={{fontSize:"14px"}}>🔍</span>
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Consultations Table */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px] overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-[#FBF9F4] border-b border-[#E8E2D6]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#014D5E]">
                    Lista de Consultas
                  </h3>
                  <div className="text-sm text-[#5C6B70]">
                    {filteredConsultations.length} consultas encontradas
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FBF9F4] border-b border-[#E8E2D6]">
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Paciente/Tutor</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Veterinário</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Data/Hora</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Status</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Valor</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsultations.map((cons) => {
                      const TypeIcon = getTypeIcon(cons.type);

                      return (
                        <tr
                          key={cons.id}
                          className="border-b border-[#F0EBE0] hover:bg-[#FBF9F4] transition-all group cursor-pointer"
                          onClick={() => openDetails(cons)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 flex items-center justify-center rounded-full ${getTypeColor(cons.type)}`}>
                                <span style={{fontSize:"16px"}}>🐾</span>
                              </div>
                              <div>
                                <div className="font-medium text-[#1F2A2E]">
                                  {cons.pet.name}
                                </div>
                                <div className="text-sm text-[#5C6B70]">
                                  {cons.pet.species} {cons.pet.breed && `• ${cons.pet.breed}`} • {cons.tutor.name}
                                </div>
                                {cons.tutor.phone && (
                                  <div className="text-xs text-[#8A989D] flex items-center gap-1">
                                    <span style={{fontSize:"11px"}}>📞</span>
                                    {cons.tutor.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span style={{fontSize:"14px"}}>🩺</span>
                              <span className="text-[#1F2A2E]">{cons.veterinarian.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-[#1F2A2E]">
                              <span style={{fontSize:"14px"}}>📅</span>
                              {formatDate(cons.date)}
                            </div>
                            <div className="text-sm text-[#5C6B70] flex items-center gap-1 mt-1">
                              <span style={{fontSize:"14px"}}>⏱</span>
                              {cons.time} • {cons.duration}min
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cons.status)}`}>
                              {getStatusLabel(cons.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-[#1F2A2E]">
                              {formatCurrency(cons.value)}
                            </div>
                            <div className={`text-xs mt-1 ${cons.paid ? 'text-[#0f6e56]' : 'text-[#D85A30]'}`}>
                              {cons.paid ? '✓ Pago' : '○ Pendente'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {cons.status === 'SCHEDULED' || cons.status === 'CONFIRMED' ? (
                                <button
                                  onClick={() => handleStartConsultation(cons.id)}
                                  className="p-2 text-[#009AAC] hover:bg-[#E0F4F6] rounded-[9px] transition-colors"
                                  title="Iniciar consulta"
                                >
                                  <span style={{fontSize:"14px"}}>⚡</span>
                                </button>
                              ) : null}
                              {cons.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleCompleteConsultation(cons.id)}
                                  className="p-2 text-[#0f6e56] hover:bg-[#e1f5ee] rounded-[9px] transition-colors"
                                  title="Finalizar consulta"
                                >
                                  <span style={{fontSize:"14px"}}>✓</span>
                                </button>
                              )}
                              {(cons.status === 'SCHEDULED' || cons.status === 'CONFIRMED' || cons.status === 'IN_PROGRESS') && (
                                <button
                                  onClick={() => handleCancelConsultation(cons.id)}
                                  className="p-2 text-[#D85A30] hover:bg-[#fef0e8] rounded-[9px] transition-colors"
                                  title="Cancelar consulta"
                                >
                                  <span style={{fontSize:"14px"}}>✕</span>
                                </button>
                              )}
                              <Link
                                href={`/dashboard/erp/consultas/${cons.id}/gravar`}
                                className="p-2 text-[#014D5E] hover:bg-[#E0F4F6] rounded-[9px] transition-colors"
                                title="Gravar consulta & Gerar documentos"
                              >
                                <span style={{fontSize:"14px"}}>🎤</span>
                              </Link>
                              <Link
                                href={`/dashboard/erp/consultas/${cons.id}/documentos`}
                                className="p-2 text-[#009AAC] hover:bg-[#E0F4F6] rounded-[9px] transition-colors"
                                title="Ver documentos clínicos"
                              >
                                <span style={{fontSize:"14px"}}>📄</span>
                              </Link>
                              <button
                                onClick={() => openEditModal(cons)}
                                className="p-2 text-[#014D5E] hover:bg-[#E0F4F6] rounded-[9px] transition-colors"
                                title="Editar consulta"
                              >
                                <span style={{fontSize:"14px"}}>✏️</span>
                              </button>
                              <button
                                onClick={() => requestDeleteConsultation(cons)}
                                className="p-2 text-[#8A989D] hover:bg-[#fef0e8] hover:text-[#D85A30] rounded-[9px] transition-colors"
                                title="Excluir"
                              >
                                <span style={{fontSize:"14px"}}>🗑️</span>
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
                    <span style={{fontSize:"30px"}}>🩺</span>
                    <p className="text-[#5C6B70] text-lg">Nenhuma consulta encontrada</p>
                    <p className="text-[#8A989D] mt-2">
                      {consultations.length === 0
                        ? 'Agende a primeira consulta'
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-[#E8E2D6] bg-[#FBF9F4]">
                <div className="text-sm text-[#5C6B70] mb-4 sm:mb-0">
                  Mostrando {filteredConsultations.length} de {consultations.length} consultas
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedConsultation && (
        <div className="fixed inset-0 bg-[#012B2E]/45 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FBF9F4] border border-[#E8E2D6] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F0EBE0]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-[#014D5E]">Detalhes da Consulta</h3>
                  <p className="text-sm text-[#5C6B70]">
                    {formatDate(selectedConsultation.date)} às {selectedConsultation.time}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-[#F0EBE0] rounded-[9px] transition-colors text-[#8A989D]"
                >
                  <span style={{fontSize:"16px"}}>✕</span>
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
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${selectedConsultation.paid ? 'bg-[#e1f5ee] text-[#0f6e56]' : 'bg-[#fef0e8] text-[#993C1D]'}`}>
                  {selectedConsultation.paid ? '✓ Pago' : '○ Pendente'}
                </span>
              </div>

              {/* Informações do Paciente */}
              <div>
                <h4 className="text-lg font-medium text-[#014D5E] mb-4 flex items-center gap-2">
                  <span style={{fontSize:"16px"}}>🐾</span>
                  Informações do Paciente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#5C6B70]">Pet</label>
                    <p className="text-[#1F2A2E]">{selectedConsultation.pet.name}</p>
                    <p className="text-sm text-[#5C6B70]">
                      {selectedConsultation.pet.species} {selectedConsultation.pet.breed && `• ${selectedConsultation.pet.breed}`}
                      {selectedConsultation.pet.age && ` • ${selectedConsultation.pet.age}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C6B70]">Tutor</label>
                    <p className="text-[#1F2A2E]">{selectedConsultation.tutor.name}</p>
                    {selectedConsultation.tutor.phone && (
                      <p className="text-sm text-[#5C6B70] flex items-center gap-1">
                        <span style={{fontSize:"11px"}}>📞</span>
                        {selectedConsultation.tutor.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C6B70]">Veterinário</label>
                    <p className="text-[#1F2A2E] flex items-center gap-1">
                      <span style={{fontSize:"14px"}}>🩺</span>
                      {selectedConsultation.veterinarian.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C6B70]">Duração</label>
                    <p className="text-[#1F2A2E]">{selectedConsultation.duration} minutos</p>
                  </div>
                </div>
              </div>

              {/* Motivo e Diagnóstico */}
              <div>
                <h4 className="text-lg font-medium text-[#014D5E] mb-4 flex items-center gap-2">
                  <span style={{fontSize:"14px"}}>📝</span>
                  Informações Clínicas
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#5C6B70]">Motivo da Consulta</label>
                    <p className="text-[#1F2A2E] bg-white border border-[#F0EBE0] p-3 rounded-[9px]">{selectedConsultation.reason}</p>
                  </div>
                  {selectedConsultation.diagnosis && (
                    <div>
                      <label className="text-sm font-medium text-[#5C6B70]">Diagnóstico</label>
                      <p className="text-[#1F2A2E] bg-white border border-[#F0EBE0] p-3 rounded-[9px]">{selectedConsultation.diagnosis}</p>
                    </div>
                  )}
                  {selectedConsultation.prescription && (
                    <div>
                      <label className="text-sm font-medium text-[#5C6B70] flex items-center gap-1">
                        <span style={{fontSize:"14px"}}>💊</span>
                        Prescrição
                      </label>
                      <p className="text-[#1F2A2E] bg-white border border-[#F0EBE0] p-3 rounded-[9px]">{selectedConsultation.prescription}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div>
                <h4 className="text-lg font-medium text-[#014D5E] mb-4 flex items-center gap-2">
                  <span style={{fontSize:"16px"}}>💰</span>
                  Valor
                </h4>
                <div className="bg-white border border-[#F0EBE0] p-4 rounded-[13px]">
                  <p className="text-2xl font-medium text-[#014D5E]">{formatCurrency(selectedConsultation.value)}</p>
                  <p className={`text-sm ${selectedConsultation.paid ? 'text-[#0f6e56]' : 'text-[#D85A30]'}`}>
                    {selectedConsultation.paid ? '✓ Pagamento confirmado' : '○ Pagamento pendente'}
                  </p>
                </div>
              </div>

              {/* Observações */}
              {selectedConsultation.notes && (
                <div>
                  <h4 className="text-lg font-medium text-[#014D5E] mb-4">Observações</h4>
                  <p className="text-[#1F2A2E] bg-white border border-[#F0EBE0] p-4 rounded-[13px]">
                    {selectedConsultation.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#F0EBE0] flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-[#5C6B70] bg-white border border-[#E8E2D6] rounded-[9px] hover:bg-[#F0EBE0] transition-colors"
              >
                Fechar
              </button>
              <Link
                href={`/dashboard/erp/consultas/${selectedConsultation.id}/gravar`}
                className="px-6 py-3 text-white bg-[#014D5E] rounded-[9px] hover:opacity-90 transition-colors flex items-center gap-2"
              >
                <span style={{fontSize:"14px"}}>🎤</span>
                Gravar & Documentos
              </Link>
              <Link
                href={`/dashboard/erp/consultas/${selectedConsultation.id}/documentos`}
                className="px-6 py-3 text-white bg-[#009AAC] rounded-[9px] hover:bg-[#014D5E] transition-colors flex items-center gap-2"
              >
                <span style={{fontSize:"14px"}}>📄</span>
                Documentos
              </Link>
              <button
                onClick={() => openEditModal(selectedConsultation)}
                className="px-6 py-3 text-white bg-[#009AAC] rounded-[9px] hover:bg-[#014D5E] transition-colors flex items-center gap-2"
              >
                <span style={{fontSize:"14px"}}>✏️</span>
                Editar
              </button>
              {selectedConsultation.status === 'SCHEDULED' || selectedConsultation.status === 'CONFIRMED' ? (
                <button
                  onClick={() => handleStartConsultation(selectedConsultation.id)}
                  className="px-6 py-3 text-white bg-[#009AAC] rounded-[9px] hover:bg-[#014D5E] transition-colors flex items-center gap-2"
                >
                  <span style={{fontSize:"14px"}}>⚡</span>
                  Iniciar Consulta
                </button>
              ) : null}
              {selectedConsultation.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleCompleteConsultation(selectedConsultation.id)}
                  className="px-6 py-3 text-white bg-[#0f6e56] rounded-[9px] hover:opacity-90 transition-colors flex items-center gap-2"
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
        <div className="fixed inset-0 bg-[#012B2E]/45 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FBF9F4] border border-[#E8E2D6] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F0EBE0]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-[#014D5E]">
                  {isEditModalOpen ? 'Editar Consulta' : 'Nova Consulta'}
                </h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-[#F0EBE0] rounded-[9px] transition-colors text-[#8A989D]"
                >
                  <span style={{fontSize:"16px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5C6B70] mb-2">Tutor *</label>
                <select
                  value={formData.tutorId}
                  onChange={(e) => setFormData({...formData, tutorId: e.target.value, petId: ''})}
                  className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
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
                <label className="block text-sm font-medium text-[#5C6B70] mb-2">Pet *</label>
                <select
                  value={formData.petId}
                  onChange={(e) => setFormData({...formData, petId: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
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
                <label className="block text-sm font-medium text-[#5C6B70] mb-2">Veterinário *</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({...formData, userId: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
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
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Data *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Horário *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Duração (min) *</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30min</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as ConsultationStatus})}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
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
                <label className="block text-sm font-medium text-[#5C6B70] mb-2">Motivo da Consulta *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E] resize-none"
                  rows={3}
                  placeholder="Descreva o motivo da consulta"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C6B70] mb-2">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E] resize-none"
                  rows={3}
                  placeholder="Observações, diagnóstico, prescrição..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Status de Pagamento</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({...formData, paymentStatus: e.target.value as 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'})}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="OVERDUE">Atrasado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#F0EBE0] flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="px-6 py-3 text-[#5C6B70] bg-white border border-[#E8E2D6] rounded-[9px] hover:bg-[#F0EBE0] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={isEditModalOpen ? handleUpdateConsultation : handleCreateConsultation}
                disabled={submitting || !formData.tutorId || !formData.petId || !formData.userId || !formData.description}
                className="px-6 py-3 text-white bg-[#009AAC] rounded-[9px] hover:bg-[#014D5E] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span style={{fontSize:"14px"}}>✅</span>
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
