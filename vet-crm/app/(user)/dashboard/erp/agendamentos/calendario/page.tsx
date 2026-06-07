'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuCalendar,
  LuUser,
  LuChevronLeft,
  LuChevronRight,
  LuPlus
} from 'react-icons/lu';
import toast from 'react-hot-toast';

type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'IN_PROGRESS';
type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

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
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  date: string;
  duration: number;
  description?: string;
  notes?: string;
  value: number;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
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

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Navegação do calendário
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Buscar agendamentos
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar agendamentos do mês atual
        const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

        const response = await fetch(
          `/api/appointments?startDate=${startDate}&endDate=${endDate}&limit=1000`
        );

        if (!response.ok) {
          throw new Error('Erro ao carregar agendamentos');
        }

        const data: ApiResponse = await response.json();
        setAppointments(data.appointments || []);
      } catch (err) {
        console.error('Erro ao buscar agendamentos:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        toast.error('Erro ao carregar agendamentos');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [currentYear, currentMonth]);

  // Agrupar agendamentos por data
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    
    appointments.forEach(appointment => {
      const dateKey = new Date(appointment.date).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(appointment);
    });

    return grouped;
  }, [appointments]);

  // Navegação do calendário
  const goToPreviousMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Obter agendamentos de um dia específico
  const getAppointmentsForDay = (day: number) => {
    const dateKey = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
    return appointmentsByDate[dateKey] || [];
  };

  // Verificar se um dia tem agendamentos
  const hasAppointments = (day: number) => {
    return getAppointmentsForDay(day).length > 0;
  };

  // Estilo do status (paleta turquesa/delicada)
  const statusStyle = (status: AppointmentStatus): { bg: string; fg: string; label: string } => {
    switch (status) {
      case 'SCHEDULED': return { bg: '#E6F6F8', fg: '#00798A', label: 'Agendada' };
      case 'CONFIRMED': return { bg: '#E1F5EE', fg: '#0F6E56', label: 'Confirmada' };
      case 'IN_PROGRESS': return { bg: '#FBEFE0', fg: '#B45309', label: 'Em andamento' };
      case 'COMPLETED': return { bg: '#EEF2F4', fg: '#5b6470', label: 'Concluída' };
      case 'CANCELED': return { bg: '#FCE9EF', fg: '#CC3366', label: 'Cancelada' };
      default: return { bg: '#EEF2F4', fg: '#5b6470', label: status };
    }
  };

  // Formatação
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

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Gerar dias do calendário
  const calendarDays = [];
  
  // Dias do mês anterior (para preencher a primeira semana)
  const prevMonthDays = firstDayOfWeek;
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  
  for (let i = prevMonthLastDay - prevMonthDays + 1; i <= prevMonthLastDay; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, date: new Date(currentYear, currentMonth - 1, i) });
  }

  // Dias do mês atual
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, isCurrentMonth: true, date: new Date(currentYear, currentMonth, i) });
  }

  // Dias do próximo mês (para completar a última semana)
  const remainingDays = 42 - calendarDays.length; // 6 semanas * 7 dias
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, date: new Date(currentYear, currentMonth + 1, i) });
  }

  const openAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="px-6 py-16 text-center text-sm text-[#94a3b8]">Carregando agenda...</div>
      </div>
    );
  }

  const LEGENDA: { s: AppointmentStatus }[] = [{ s: 'SCHEDULED' }, { s: 'CONFIRMED' }, { s: 'IN_PROGRESS' }, { s: 'COMPLETED' }, { s: 'CANCELED' }];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/erp/agendamentos/clinico" className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white border text-[#4d5a66]" style={{ borderColor: "#cfd8e0" }}>Clínico (FU)</Link>
          <Link href="/dashboard/erp/agendamentos/calendario" className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "#009AAC" }}>Agenda</Link>
          <Link href="/dashboard/erp/agendamentos" className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white border text-[#4d5a66]" style={{ borderColor: "#cfd8e0" }}>Lista</Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white border rounded-lg px-1.5 py-1" style={{ borderColor: "#d8d0bc" }}>
            <button onClick={goToPreviousMonth} className="p-1 rounded hover:bg-[#fdfaee]" aria-label="Mês anterior"><LuChevronLeft className="w-4 h-4 text-[#5b6470]" /></button>
            <span className="text-[12.5px] font-medium text-[#014D5E] min-w-[100px] text-center">{monthNames[currentMonth]} {currentYear}</span>
            <button onClick={goToNextMonth} className="p-1 rounded hover:bg-[#fdfaee]" aria-label="Próximo mês"><LuChevronRight className="w-4 h-4 text-[#5b6470]" /></button>
          </div>
          <button onClick={goToToday} className="text-[11px] font-medium text-[#009AAC] bg-[#e6f6f8] px-3 py-1.5 rounded-lg">Hoje</button>
          <Link href="/dashboard/erp/agendamentos/novo" className="text-[11px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><LuPlus className="w-3 h-3" />Novo</Link>
        </div>
      </div>

      {error && (<div className="mb-4 p-3 rounded-lg text-xs font-medium" style={{ background: "#FCE9EF", border: "1px solid #f3c9d6", color: "#CC3366" }}>{error}</div>)}

      <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#d8d0bc" }}>
        <div className="grid grid-cols-7" style={{ background: "#F8F3E4", borderBottom: "1px solid #e8dfc8" }}>
          {weekDays.map((d) => (<div key={d} className="py-2 text-center text-[10.5px] font-medium uppercase tracking-wide text-[#6b7280]">{d}</div>))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map(({ day, isCurrentMonth, date }, index) => {
            const dayAppointments = isCurrentMonth ? getAppointmentsForDay(day) : [];
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div key={index} className="min-h-[92px] p-1.5" style={{ borderRight: "1px solid #f4eede", borderBottom: "1px solid #f4eede", background: isToday ? "#f4fbfc" : (isCurrentMonth ? "#fff" : "#fbfaf6") }}>
                <div className="mb-1">
                  {isToday ? (
                    <span className="inline-flex items-center justify-center w-[19px] h-[19px] rounded-full text-[11px] font-semibold text-white" style={{ background: "#009AAC" }}>{day}</span>
                  ) : (
                    <span className="text-[11px]" style={{ color: isCurrentMonth ? "#5b6470" : "#c4bdaf" }}>{day}</span>
                  )}
                </div>
                <div className="space-y-1 max-h-[60px] overflow-y-auto">
                  {dayAppointments.slice(0, 3).map((appointment) => { const st = statusStyle(appointment.status); return (
                    <div key={appointment.id} onClick={() => openAppointmentDetails(appointment)} title={`${appointment.tutor.name} - ${appointment.pet.name} - ${formatTime(appointment.date)}`}
                      className="text-[9.5px] px-1.5 py-0.5 rounded-md cursor-pointer hover:brightness-95 truncate" style={{ background: st.bg, color: st.fg }}>
                      {formatTime(appointment.date)} {appointment.pet.name}
                    </div>
                  ); })}
                  {dayAppointments.length > 3 && (<div className="text-[9.5px] text-[#94a3b8] px-1">+{dayAppointments.length - 3} mais</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-3.5 flex-wrap text-[11px] text-[#6b7280]">
        {LEGENDA.map(({ s }) => { const st = statusStyle(s); return (
          <span key={s} className="inline-flex items-center gap-1.5"><span className="w-[10px] h-[10px] rounded" style={{ background: st.bg, border: `1px solid ${st.fg}` }} />{st.label}</span>
        ); })}
      </div>

      {isModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}>
              <h3 className="text-base font-semibold text-[#014D5E]">Detalhes do agendamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94a3b8] hover:text-[#5b6470] text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-[11px] text-[#94a3b8]">Tutor</div><div className="text-[#0E2244] font-medium">{selectedAppointment.tutor.name}</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Pet</div><div className="text-[#0E2244] font-medium">{selectedAppointment.pet.name} <span className="text-[#94a3b8] font-normal">({selectedAppointment.pet.species}{selectedAppointment.pet.breed ? ` · ${selectedAppointment.pet.breed}` : ''})</span></div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Veterinário</div><div className="text-[#0E2244]">{selectedAppointment.user?.name || 'Não atribuído'}</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Data</div><div className="text-[#0E2244]">{formatDate(selectedAppointment.date)} · {formatTime(selectedAppointment.date)}</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Duração</div><div className="text-[#0E2244]">{selectedAppointment.duration} min</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Valor</div><div className="text-[#0E2244] font-semibold">{formatCurrency(selectedAppointment.value)}</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Status</div><span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: statusStyle(selectedAppointment.status).bg, color: statusStyle(selectedAppointment.status).fg }}>{statusStyle(selectedAppointment.status).label}</span></div>
              </div>
              {selectedAppointment.description && (<div><div className="text-[11px] text-[#94a3b8] mb-1">Descrição</div><p className="text-[#475569] bg-[#fbfaf6] border rounded-lg p-3" style={{ borderColor: "#eef0e6" }}>{selectedAppointment.description}</p></div>)}
              {selectedAppointment.notes && (<div><div className="text-[11px] text-[#94a3b8] mb-1">Observações</div><p className="text-[#475569] bg-[#fbfaf6] border rounded-lg p-3" style={{ borderColor: "#eef0e6" }}>{selectedAppointment.notes}</p></div>)}
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#eef0e6" }}>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg hover:bg-[#ece8dd]">Fechar</button>
              <Link href="/dashboard/erp/agendamentos" className="px-4 py-2 text-[13px] text-white rounded-lg" style={{ background: "#009AAC" }}>Ver na lista</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
