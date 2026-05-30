'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuCalendar,
  LuUser,
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash,
  LuCheck,
  LuPhone
} from 'react-icons/lu';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';

// Tipos baseados no schema Prisma
type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'IN_PROGRESS';
type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

interface Treatment {
  id: string;
  description: string;
  cost: number;
  product?: {
    id: string;
    name: string;
    type: string;
    price: number;
  };
}

interface Appointment {
  id: string;
  tutor: {
    id: string;
    name: string;
    contacts: Array<{
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
    gender?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  date: string;
  duration: number;
  description?: string;
  notes?: string;
  value: number;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  treatments: Treatment[];
  _count: {
    treatments: number;
  };
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

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [tutorFilter, setTutorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Buscar appointments da API
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (tutorFilter !== 'all') params.append('tutorId', tutorFilter);
      if (dateFilter !== 'all') params.append('startDate', dateFilter);
      
      const response = await fetch(`/api/appointments?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar agendamentos');
      }
      
      const data: ApiResponse = await response.json();
      setAppointments(data.appointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar appointments inicial
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAppointments();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, tutorFilter, dateFilter]);

  // Filtrar consultas localmente (backup)
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    const matchesTutor = tutorFilter === 'all' || appointment.tutor.id === tutorFilter;
    const matchesDate = dateFilter === 'all' || appointment.date.startsWith(dateFilter);

    return matchesSearch && matchesStatus && matchesTutor && matchesDate;
  });

  // Estatísticas
  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'SCHEDULED').length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELED').length,
    inProgress: appointments.filter(a => a.status === 'IN_PROGRESS').length
  };

  // Funções para manipular consultas
  const handleConfirmAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          status: 'CONFIRMED'
        })});

      if (response.ok) {
        fetchAppointments(); // Recarregar lista
        toast.success('Agendamento confirmado com sucesso!');
      } else {
        throw new Error('Erro ao confirmar agendamento');
      }
    } catch (err) {
      console.error('Erro ao confirmar appointment:', err);
      const message = err instanceof Error ? err.message : 'Erro ao confirmar agendamento';
      setError(message);
      toast.error(message);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          status: 'CANCELED'
        })});

      if (response.ok) {
        fetchAppointments(); // Recarregar lista
        toast.success('Agendamento cancelado com sucesso!');
      } else {
        throw new Error('Erro ao cancelar agendamento');
      }
    } catch (err) {
      console.error('Erro ao cancelar appointment:', err);
      const message = err instanceof Error ? err.message : 'Erro ao cancelar agendamento';
      setError(message);
      toast.error(message);
    }
  };

  const handleCompleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          status: 'COMPLETED'
        })});

      if (response.ok) {
        fetchAppointments(); // Recarregar lista
        toast.success('Agendamento concluído com sucesso!');
      } else {
        throw new Error('Erro ao completar agendamento');
      }
    } catch (err) {
      console.error('Erro ao completar appointment:', err);
      const message = err instanceof Error ? err.message : 'Erro ao completar agendamento';
      setError(message);
      toast.error(message);
    }
  };

  const requestDeleteAppointment = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
  };

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;

    const response = await fetch(`/api/appointments/${appointmentToDelete.id}`, {
      method: 'DELETE'});

    if (response.ok) {
      await fetchAppointments(); // Recarregar lista
      toast.success('Agendamento excluído com sucesso!');
      setAppointmentToDelete(null);
      return;
    }

    const data = await response.json().catch(() => null);
    const message =
      (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
      'Erro ao excluir agendamento';
    throw new Error(message);
  };

  const openAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  // Funções para obter cores e ícones baseados no status
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELED': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case 'SCHEDULED': return;
      case 'CONFIRMED': return LuCheck;
      case 'COMPLETED': return LuCheck;
      case 'CANCELED': return ;
      case 'IN_PROGRESS': return;
      default: return;
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Lista única de tutores para filtro
  const uniqueTutors = Array.from(new Map(
    appointments.map(apt => [apt.tutor.id, apt.tutor])
  ).values());

  if (loading && appointments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <ConfirmDeleteModal
        isOpen={Boolean(appointmentToDelete)}
        entityLabel="Agendamento"
        itemName={
          appointmentToDelete
            ? `${appointmentToDelete.pet?.name || 'Pet'} • ${appointmentToDelete.tutor?.name || 'Tutor'}`
            : '—'
        }
        consequenceText="Esta ação não pode ser desfeita. O agendamento será removido."
        onClose={() => setAppointmentToDelete(null)}
        onConfirm={confirmDeleteAppointment}
      />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Agendamentos
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie consultas e agendamentos da clínica veterinária
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link 
                    href="/dashboard/erp/agendamentos/calendario"
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuCalendar className="w-4 h-4" />
                    <span>Calendário</span>
                  </Link>
                  <Link 
                    href="/dashboard/erp/agendamentos/novo"
                    className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Novo Agendamento</span>
                  </Link>
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
                  icon: LuCalendar
                },
                { 
                  label: "Agendadas", 
                  value: stats.scheduled, 
                  color: "blue", 
                  icon: () => <span style={{fontSize:"14px"}}>⏱</span>
                },
                { 
                  label: "Confirmadas", 
                  value: stats.confirmed, 
                  color: "green", 
                  icon: LuCheck
                },
                { 
                  label: "Em Andamento", 
                  value: stats.inProgress, 
                  color: "orange", 
                  icon: () => <span style={{fontSize:"14px"}}>△</span>
                },
                { 
                  label: "Concluídas", 
                  value: stats.completed, 
                  color: "gray", 
                  icon: LuCheck
                },
                { 
                  label: "Canceladas", 
                  value: stats.cancelled, 
                  color: "red", 
                  icon: }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
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
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por tutor, pet ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'all')}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="SCHEDULED">Agendadas</option>
                    <option value="CONFIRMED">Confirmadas</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="COMPLETED">Concluídas</option>
                    <option value="CANCELED">Canceladas</option>
                  </select>

                  <select
                    value={tutorFilter}
                    onChange={(e) => setTutorFilter(e.target.value)}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos os Tutores</option>
                    {uniqueTutors.map(tutor => (
                      <option key={tutor.id} value={tutor.id}>{tutor.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <input
                    type="date"
                    value={dateFilter === 'all' ? '' : dateFilter}
                    onChange={(e) => setDateFilter(e.target.value || 'all')}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm flex-1 lg:flex-none"
                  />
                  
                  <button 
                    onClick={fetchAppointments}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    <LuSearch className="w-4 h-4" />
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Próximas Consultas
                  </h3>
                  <div className="text-sm text-gray-600">
                    {filteredAppointments.length} consultas encontradas
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Tutor/Pet</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Veterinário</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Descrição</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Data/Hora</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Pagamento</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((appointment) => {
                      const StatusIcon = getStatusIcon(appointment.status);
                      const primaryContact = appointment.tutor.contacts.find(contact => contact.isPrimary);
                      
                      return (
                        <tr 
                          key={appointment.id} 
                          className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 group cursor-pointer"
                          onClick={() => openAppointmentDetails(appointment)}
                        >
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">{appointment.tutor.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <LuUser className="w-3 h-3" />
                              {appointment.pet.name} ({appointment.pet.species})
                            </div>
                            {primaryContact && (
                              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <LuPhone className="w-3 h-3" />
                                {primaryContact.number}
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <span style={{fontSize:"14px"}}>🩺</span>
                              <span className="text-gray-700">
                                {appointment.user?.name || 'Não atribuído'}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-gray-700">
                              {appointment.description || 'Consulta veterinária'}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {appointment._count.treatments} tratamentos
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatDate(appointment.date)}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <span style={{fontSize:"14px"}}>⏱</span>
                              {formatTime(appointment.date)} • {appointment.duration} min
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {appointment.status === 'SCHEDULED' && 'Agendada'}
                              {appointment.status === 'CONFIRMED' && 'Confirmada'}
                              {appointment.status === 'IN_PROGRESS' && 'Em Andamento'}
                              {appointment.status === 'COMPLETED' && 'Concluída'}
                              {appointment.status === 'CANCELED' && 'Cancelada'}
                            </span>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(appointment.paymentStatus)}`}>
                              {appointment.paymentStatus === 'PAID' && 'Pago'}
                              {appointment.paymentStatus === 'PENDING' && 'Pendente'}
                              {appointment.paymentStatus === 'OVERDUE' && 'Atrasado'}
                              {appointment.paymentStatus === 'CANCELLED' && 'Cancelado'}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatCurrency(appointment.value)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {appointment.status === 'SCHEDULED' && (
                                <>
                                  <button
                                    onClick={() => handleConfirmAppointment(appointment.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-2xl transition-colors"
                                    title="Confirmar consulta"
                                  >
                                    <LuCheck className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleCancelAppointment(appointment.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                                    title="Cancelar consulta"
                                  >
                                    <span style={{fontSize:"14px"}}>✕</span>
                                  </button>
                                </>
                              )}
                              {appointment.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleCompleteAppointment(appointment.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"
                                  title="Marcar como concluída"
                                >
                                  <LuCheck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => requestDeleteAppointment(appointment)}
                                className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 rounded-2xl transition-colors"
                                title="Excluir consulta"
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

                {filteredAppointments.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <LuCalendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhum agendamento encontrado</p>
                    <p className="text-gray-400 mt-2">
                      {appointments.length === 0 
                        ? 'Comece criando seu primeiro agendamento' 
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Mostrando {filteredAppointments.length} de {appointments.length} consultas
                </div>
                
                <div className="flex items-center space-x-4">
                  <button className="px-4 py-2 text-sm text-gray-600 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 transition-all duration-300">
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">Página 1 de 1</span>
                  <button className="px-4 py-2 text-sm text-gray-600 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 transition-all duration-300">
                    Próxima
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
      {/* Modal de Detalhes da Consulta */}
      {isModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Detalhes da Consulta</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Informações do Tutor e Pet */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuUser className="w-5 h-5 text-blue-600" />
                  Informações do Tutor e Pet
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tutor</label>
                    <p className="text-gray-900">{selectedAppointment.tutor.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pet</label>
                    <p className="text-gray-900">
                      {selectedAppointment.pet.name} ({selectedAppointment.pet.species})
                      {selectedAppointment.pet.breed && ` - ${selectedAppointment.pet.breed}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contato</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <LuPhone className="w-4 h-4" />
                      {selectedAppointment.tutor.contacts.find(c => c.isPrimary)?.number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações da Consulta */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuCalendar className="w-5 h-5 text-green-600" />
                  Informações da Consulta
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Veterinário</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <span style={{fontSize:"14px"}}>🩺</span>
                      {selectedAppointment.user?.name || 'Não atribuído'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Descrição</label>
                    <p className="text-gray-900">{selectedAppointment.description || 'Consulta veterinária'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data</label>
                    <p className="text-gray-900">{formatDate(selectedAppointment.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Horário</label>
                    <p className="text-gray-900">{formatTime(selectedAppointment.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Duração</label>
                    <p className="text-gray-900">{selectedAppointment.duration} minutos</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor</label>
                    <p className="text-gray-900 font-semibold">{formatCurrency(selectedAppointment.value)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status === 'SCHEDULED' && 'Agendada'}
                      {selectedAppointment.status === 'CONFIRMED' && 'Confirmada'}
                      {selectedAppointment.status === 'IN_PROGRESS' && 'Em Andamento'}
                      {selectedAppointment.status === 'COMPLETED' && 'Concluída'}
                      {selectedAppointment.status === 'CANCELED' && 'Cancelada'}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pagamento</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedAppointment.paymentStatus)}`}>
                      {selectedAppointment.paymentStatus === 'PAID' && 'Pago'}
                      {selectedAppointment.paymentStatus === 'PENDING' && 'Pendente'}
                      {selectedAppointment.paymentStatus === 'OVERDUE' && 'Atrasado'}
                      {selectedAppointment.paymentStatus === 'CANCELLED' && 'Cancelado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedAppointment.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Observações</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-2xl">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Tratamentos */}
              {selectedAppointment.treatments.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Tratamentos</h4>
                  <div className="space-y-3">
                    {selectedAppointment.treatments.map((treatment) => (
                      <div key={treatment.id} className="bg-gray-50 p-4 rounded-2xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{treatment.description}</p>
                            {treatment.product && (
                              <p className="text-sm text-gray-600 mt-1">
                                Produto: {treatment.product.name}
                              </p>
                            )}
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
              <button className="px-6 py-3 text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                <LuPencil className="w-4 h-4" />
                Editar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
