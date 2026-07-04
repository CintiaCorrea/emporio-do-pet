'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';
import NovoAgendamentoModal from '@/components/agendamentos/NovoAgendamentoModal';

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
  const [novoOpen, setNovoOpen] = useState(false);

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
      case 'CONFIRMED': return '✅';
      case 'COMPLETED': return '✅';
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

  const stStyle = (s: AppointmentStatus): { bg: string; fg: string; label: string } => {
    switch (s) {
      case 'SCHEDULED': return { bg: '#E0F4F6', fg: '#00798A', label: 'Agendada' };
      case 'CONFIRMED': return { bg: '#E1F5EE', fg: '#0F6E56', label: 'Confirmada' };
      case 'IN_PROGRESS': return { bg: '#FBEFE0', fg: '#B45309', label: 'Em andamento' };
      case 'COMPLETED': return { bg: '#F0EBE0', fg: '#5C6B70', label: 'Concluída' };
      case 'CANCELED': return { bg: '#FCE9EF', fg: '#CC3366', label: 'Cancelada' };
      default: return { bg: '#F0EBE0', fg: '#5C6B70', label: String(s) };
    }
  };
  const payStyle = (s: PaymentStatus): { bg: string; fg: string; label: string } => {
    switch (s) {
      case 'PAID': return { bg: '#E1F5EE', fg: '#0F6E56', label: 'Pago' };
      case 'PENDING': return { bg: '#FBEFE0', fg: '#B45309', label: 'Pendente' };
      case 'OVERDUE': return { bg: '#FCE9EF', fg: '#CC3366', label: 'Atrasado' };
      case 'CANCELLED': return { bg: '#F0EBE0', fg: '#5C6B70', label: 'Cancelado' };
      default: return { bg: '#F0EBE0', fg: '#5C6B70', label: String(s) };
    }
  };
  const ini = (n?: string) => ((n || '?').trim().slice(0, 2).toUpperCase());

  // Lista única de tutores para filtro
  const uniqueTutors = Array.from(new Map(
    appointments.map(apt => [apt.tutor.id, apt.tutor])
  ).values());

  if (loading && appointments.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="px-6 py-16 text-center text-sm text-[#8A989D]">Carregando agendamentos...</div>
      </div>
    );
  }

  const STAT_CARDS = [
    { l: 'Total', v: stats.total, c: '#5C6B70', bg: '#F0EBE0' },
    { l: 'Agendadas', v: stats.scheduled, c: '#00798A', bg: '#E0F4F6' },
    { l: 'Confirmadas', v: stats.confirmed, c: '#0F6E56', bg: '#E1F5EE' },
    { l: 'Em andamento', v: stats.inProgress, c: '#B45309', bg: '#FBEFE0' },
    { l: 'Concluídas', v: stats.completed, c: '#5C6B70', bg: '#F0EBE0' },
    { l: 'Canceladas', v: stats.cancelled, c: '#CC3366', bg: '#FCE9EF' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ConfirmDeleteModal
        isOpen={Boolean(appointmentToDelete)}
        entityLabel="Agendamento"
        itemName={appointmentToDelete ? `${appointmentToDelete.pet?.name || 'Pet'} • ${appointmentToDelete.tutor?.name || 'Tutor'}` : '—'}
        consequenceText="Esta ação não pode ser desfeita. O agendamento será removido."
        onClose={() => setAppointmentToDelete(null)}
        onConfirm={confirmDeleteAppointment}
      />

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/erp/agendamentos/clinico" className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white border text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>Clínico (FU)</Link>
          <Link href="/dashboard/erp/agendamentos/calendario" className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white border text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>Agenda</Link>
          <Link href="/dashboard/erp/agendamentos" className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white" style={{ background: "#009AAC" }}>Lista</Link>
        </div>
        <button onClick={() => setNovoOpen(true)} className="text-[11px] font-medium text-white bg-[#009AAC] px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5"><span>➕</span>Novo agendamento</button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between" style={{ background: "#FCE9EF", border: "1px solid #f3c9d6", color: "#CC3366" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#CC3366]">✕</button>
        </div>
      )}

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {STAT_CARDS.map((st) => (
          <div key={st.l} className="rounded-lg p-2.5 text-center" style={{ background: st.bg }}>
            <div className="text-[19px] font-medium leading-tight" style={{ color: st.c }}>{st.v}</div>
            <div className="text-[10.5px]" style={{ color: st.c }}>{st.l}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A989D] text-xs">🔍</span>
          <input type="text" placeholder="Buscar por tutor, pet ou descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#E8E2D6] rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-[#009AAC]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'all')} className="bg-white border border-[#E8E2D6] rounded-lg px-2 py-1.5 text-[11px] text-[#5C6B70] focus:outline-none focus:border-[#009AAC]">
          <option value="all">Todos os status</option>
          <option value="SCHEDULED">Agendadas</option>
          <option value="CONFIRMED">Confirmadas</option>
          <option value="IN_PROGRESS">Em andamento</option>
          <option value="COMPLETED">Concluídas</option>
          <option value="CANCELED">Canceladas</option>
        </select>
        <select value={tutorFilter} onChange={(e) => setTutorFilter(e.target.value)} className="bg-white border border-[#E8E2D6] rounded-lg px-2 py-1.5 text-[11px] text-[#5C6B70] focus:outline-none focus:border-[#009AAC]">
          <option value="all">Todos os tutores</option>
          {uniqueTutors.map((tutor) => (<option key={tutor.id} value={tutor.id}>{tutor.name}</option>))}
        </select>
        <input type="date" value={dateFilter === 'all' ? '' : dateFilter} onChange={(e) => setDateFilter(e.target.value || 'all')} className="bg-white border border-[#E8E2D6] rounded-lg px-2 py-1.5 text-[11px] text-[#5C6B70] focus:outline-none focus:border-[#009AAC]" />
        <button onClick={fetchAppointments} className="bg-white border border-[#E8E2D6] rounded-lg px-2.5 py-1.5 text-[11px] text-[#5C6B70] hover:bg-[#FBF9F4] inline-flex items-center gap-1.5"><span>🔄</span>Recarregar</button>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E2D6] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="bg-[#F6F2EA] text-[10.5px] uppercase tracking-wide text-[#8A989D]">
                <th className="text-left font-medium px-3.5 py-2">Cliente / Pet</th>
                <th className="text-left font-medium px-2 py-2">Profissional</th>
                <th className="text-left font-medium px-2 py-2">Data / hora</th>
                <th className="text-left font-medium px-2 py-2">Status</th>
                <th className="text-right font-medium px-2 py-2">Valor</th>
                <th className="text-right font-medium px-3.5 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="text-[12.5px] text-[#1F2A2E]">
              {filteredAppointments.map((appointment) => {
                const st = stStyle(appointment.status); const pay = payStyle(appointment.paymentStatus);
                return (
                  <tr key={appointment.id} onClick={() => openAppointmentDetails(appointment)} className="border-t border-[#F0EBE0] hover:bg-[#FBF9F4] transition cursor-pointer">
                    <td className="px-3.5 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0" style={{ background: "#E0F4F6", color: "#014D5E" }}>{ini(appointment.tutor.name)}</div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#1F2A2E] truncate">{appointment.tutor.name}</div>
                          <div className="text-[11px] text-[#8A989D] truncate">{appointment.pet.name} · {appointment.pet.species}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-[#8A989D]">{appointment.user?.name || '—'}</td>
                    <td className="px-2 py-2 text-[#8A989D] whitespace-nowrap">{formatDate(appointment.date)}<span className="text-[#8A989D]"> · </span>{formatTime(appointment.date)}</td>
                    <td className="px-2 py-2"><span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                    <td className="px-2 py-2 text-right whitespace-nowrap"><div className="font-medium text-[#1F2A2E]">{formatCurrency(appointment.value)}</div><div className="text-[10px]" style={{ color: pay.fg }}>{pay.label}</div></td>
                    <td className="px-3.5 py-2">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {appointment.status === 'SCHEDULED' && (<>
                          <button onClick={() => handleConfirmAppointment(appointment.id)} title="Confirmar" className="p-1.5 rounded-lg text-[#0F6E56] hover:bg-[#E1F5EE]">✅</button>
                          <button onClick={() => handleCancelAppointment(appointment.id)} title="Cancelar" className="p-1.5 rounded-lg text-[#CC3366] hover:bg-[#FCE9EF]">✕</button>
                        </>)}
                        {appointment.status === 'CONFIRMED' && (
                          <button onClick={() => handleCompleteAppointment(appointment.id)} title="Concluir" className="p-1.5 rounded-lg text-[#009AAC] hover:bg-[#E0F4F6]">✅</button>
                        )}
                        <button onClick={() => requestDeleteAppointment(appointment)} title="Excluir" className="p-1.5 rounded-lg text-[#8A989D] hover:bg-[#FCE9EF] hover:text-[#CC3366]">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAppointments.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="text-4xl mx-auto mb-2">📅</div><p className="text-sm text-[#8A989D]">{appointments.length === 0 ? 'Nenhum agendamento ainda.' : 'Nenhum resultado para os filtros.'}</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-[#F0EBE0] text-[11px] text-[#8A989D]">Mostrando {filteredAppointments.length} de {appointments.length} agendamentos</div>
      </div>

      {isModalOpen && selectedAppointment && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(1,43,46,.45)" }} onClick={() => setIsModalOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border" style={{ background: "#FBF9F4", borderColor: "#E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#F0EBE0" }}>
              <h3 className="text-base font-medium text-[#014D5E]">Detalhes do agendamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8A989D] hover:text-[#5C6B70] text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-[11px] text-[#8A989D]">Tutor</div><div className="text-[#1F2A2E] font-medium">{selectedAppointment.tutor.name}</div></div>
                <div><div className="text-[11px] text-[#8A989D]">Pet</div><div className="text-[#1F2A2E] font-medium">{selectedAppointment.pet.name} <span className="text-[#8A989D] font-normal">({selectedAppointment.pet.species}{selectedAppointment.pet.breed ? ` · ${selectedAppointment.pet.breed}` : ''})</span></div></div>
                <div><div className="text-[11px] text-[#8A989D]">Contato</div><div className="text-[#1F2A2E]">{selectedAppointment.tutor.contacts.find((c) => c.isPrimary)?.number || '—'}</div></div>
                <div><div className="text-[11px] text-[#8A989D]">Profissional</div><div className="text-[#1F2A2E]">{selectedAppointment.user?.name || 'Não atribuído'}</div></div>
                <div><div className="text-[11px] text-[#8A989D]">Data</div><div className="text-[#1F2A2E]">{formatDate(selectedAppointment.date)} · {formatTime(selectedAppointment.date)}</div></div>
                <div><div className="text-[11px] text-[#8A989D]">Duração</div><div className="text-[#1F2A2E]">{selectedAppointment.duration} min</div></div>
                <div><div className="text-[11px] text-[#8A989D]">Valor</div><div className="text-[#1F2A2E] font-medium">{formatCurrency(selectedAppointment.value)}</div></div>
                <div><div className="text-[11px] text-[#8A989D]">Status</div><span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: stStyle(selectedAppointment.status).bg, color: stStyle(selectedAppointment.status).fg }}>{stStyle(selectedAppointment.status).label}</span></div>
                <div><div className="text-[11px] text-[#8A989D]">Pagamento</div><span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: payStyle(selectedAppointment.paymentStatus).bg, color: payStyle(selectedAppointment.paymentStatus).fg }}>{payStyle(selectedAppointment.paymentStatus).label}</span></div>
              </div>
              {selectedAppointment.description && (<div><div className="text-[11px] text-[#8A989D] mb-1">Descrição</div><p className="text-[#5C6B70] bg-[#FBF9F4] border rounded-lg p-3" style={{ borderColor: "#F0EBE0" }}>{selectedAppointment.description}</p></div>)}
              {selectedAppointment.notes && (<div><div className="text-[11px] text-[#8A989D] mb-1">Observações</div><p className="text-[#5C6B70] bg-[#FBF9F4] border rounded-lg p-3" style={{ borderColor: "#F0EBE0" }}>{selectedAppointment.notes}</p></div>)}
              {selectedAppointment.treatments.length > 0 && (
                <div><div className="text-[11px] text-[#8A989D] mb-1">Tratamentos</div><div className="space-y-2">
                  {selectedAppointment.treatments.map((treatment) => (
                    <div key={treatment.id} className="bg-[#FBF9F4] border rounded-lg p-2.5 flex justify-between items-start" style={{ borderColor: "#F0EBE0" }}>
                      <div><p className="font-medium text-[#1F2A2E] text-[12.5px]">{treatment.description}</p>{treatment.product && (<p className="text-[11px] text-[#8A989D]">Produto: {treatment.product.name}</p>)}</div>
                      <p className="font-medium text-[#1F2A2E] text-[12.5px]">{formatCurrency(treatment.cost)}</p>
                    </div>
                  ))}
                </div></div>
              )}
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#F0EBE0" }}>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-[#F0EBE0] rounded-lg hover:bg-[#E8E2D6]">Fechar</button>
            </div>
          </div>
        </div>
      )}
      <NovoAgendamentoModal open={novoOpen} onClose={() => setNovoOpen(false)} onCreated={fetchAppointments} />
    </div>
  );
}
