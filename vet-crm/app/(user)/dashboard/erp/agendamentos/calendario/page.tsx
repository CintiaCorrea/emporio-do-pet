'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuArrowLeft, 
  LuCalendar,
  LuClock,
  LuUser,
  LuPawPrint,
  LuStethoscope,
  LuChevronLeft,
  LuChevronRight,
  LuX,
  LuCheck,
  LuTriangle
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

  // Obter cor do status
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMED': return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELED': return 'bg-red-100 text-red-800 border-red-200';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Calendário de Agendamentos
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Visualize todos os agendamentos em formato de calendário
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link 
                    href="/dashboard/erp/agendamentos" 
                    className="group flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-semibold bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    <LuArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span>Voltar</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Controles do Calendário */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <LuChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {monthNames[currentMonth]} {currentYear}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <LuChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  Hoje
                </button>
              </div>
            </div>

            {/* Calendário */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="p-4 text-center text-sm font-semibold text-gray-700 bg-gray-50"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do calendário */}
              <div className="grid grid-cols-7">
                {calendarDays.map(({ day, isCurrentMonth, date }, index) => {
                  const dayAppointments = isCurrentMonth ? getAppointmentsForDay(day) : [];
                  const isToday = 
                    date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                        !isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'
                      } ${isToday ? 'bg-blue-50/50' : ''}`}
                    >
                      <div
                        className={`text-sm font-semibold mb-1 ${
                          !isCurrentMonth
                            ? 'text-gray-400'
                            : isToday
                            ? 'text-blue-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1 max-h-[80px] overflow-y-auto">
                        {dayAppointments.slice(0, 3).map((appointment) => (
                          <div
                            key={appointment.id}
                            onClick={() => openAppointmentDetails(appointment)}
                            className={`text-xs p-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity border ${getStatusColor(
                              appointment.status
                            )}`}
                            title={`${appointment.tutor.name} - ${appointment.pet.name} - ${formatTime(appointment.date)}`}
                          >
                            <div className="font-medium truncate">
                              {formatTime(appointment.date)}
                            </div>
                            <div className="truncate">
                              {appointment.pet.name}
                            </div>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium p-1">
                            +{dayAppointments.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda */}
            <div className="mt-6 bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Legenda</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                  <span className="text-sm text-gray-700">Agendada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                  <span className="text-sm text-gray-700">Confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div>
                  <span className="text-sm text-gray-700">Em Andamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                  <span className="text-sm text-gray-700">Concluída</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
                  <span className="text-sm text-gray-700">Cancelada</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Detalhes do Agendamento</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Informações do Tutor e Pet */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LuUser className="w-5 h-5 text-blue-600" />
                  Tutor e Pet
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
                      <LuStethoscope className="w-4 h-4" />
                      {selectedAppointment.user?.name || 'Não atribuído'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data</label>
                    <p className="text-gray-900">{formatDate(selectedAppointment.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Horário</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <LuClock className="w-4 h-4" />
                      {formatTime(selectedAppointment.date)}
                    </p>
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
                </div>
              </div>

              {/* Descrição */}
              {selectedAppointment.description && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-2xl">
                    {selectedAppointment.description}
                  </p>
                </div>
              )}

              {/* Observações */}
              {selectedAppointment.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Observações</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-2xl">
                    {selectedAppointment.notes}
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
                href={`/dashboard/erp/agendamentos`}
                className="px-6 py-3 text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors"
              >
                Ver na Lista
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


