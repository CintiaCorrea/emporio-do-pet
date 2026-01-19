'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuArrowLeft, 
  LuCalendar, 
  LuClock, 
  LuUser, 
  LuPawPrint, 
  LuStethoscope,
  LuDollarSign,
  LuFileText,
  LuSave,
  LuX,
  LuPlus
} from 'react-icons/lu';
import toast, { Toaster } from 'react-hot-toast';

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
  role: string;
}

interface AppointmentFormData {
  tutorId: string;
  petId: string;
  userId: string;
  date: string;
  time: string;
  duration: number;
  description: string;
  notes: string;
  value: number;
  status: string;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState<AppointmentFormData>({
    tutorId: '',
    petId: '',
    userId: '',
    date: '',
    time: '',
    duration: 30,
    description: '',
    notes: '',
    value: 0,
    status: 'SCHEDULED',
    paymentStatus: 'PENDING',
  });

  // Carregar dados iniciais
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar tutores
        const tutorsResponse = await fetch('/api/tutors?limit=100');
        if (!tutorsResponse.ok) throw new Error('Erro ao carregar tutores');
        const tutorsData = await tutorsResponse.json();
        setTutors(tutorsData.tutors || []);

        // Buscar usuários (veterinários)
        const usersResponse = await fetch('/api/users');
        if (!usersResponse.ok) throw new Error('Erro ao carregar veterinários');
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);

      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        toast.error('Erro ao carregar dados iniciais');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Carregar pets quando tutor for selecionado
  useEffect(() => {
    const fetchPets = async () => {
      if (!formData.tutorId) {
        setPets([]);
        setFormData(prev => {
          if (prev.petId) {
            return { ...prev, petId: '' };
          }
          return prev;
        });
        return;
      }

      try {
        const response = await fetch(`/api/tutors/${formData.tutorId}/pets`);
        if (response.ok) {
          const petsData = await response.json();
          const petsArray = Array.isArray(petsData) ? petsData : [];
          setPets(petsArray);
          
          // Se houver apenas um pet, selecionar automaticamente
          if (petsArray.length === 1) {
            setFormData(prev => {
              if (prev.petId !== petsArray[0].id) {
                return { ...prev, petId: petsArray[0].id };
              }
              return prev;
            });
          } else {
            setFormData(prev => {
              if (prev.petId) {
                return { ...prev, petId: '' };
              }
              return prev;
            });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'value' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validações
      if (!formData.tutorId) {
        throw new Error('Selecione um tutor');
      }
      if (!formData.petId) {
        throw new Error('Selecione um pet');
      }
      if (!formData.userId) {
        throw new Error('Selecione um veterinário');
      }
      if (!formData.date || !formData.time) {
        throw new Error('Data e horário são obrigatórios');
      }

      // Combinar data e hora
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      if (isNaN(dateTime.getTime())) {
        throw new Error('Data ou horário inválidos');
      }

      // Preparar dados para envio
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
        paymentStatus: formData.paymentStatus,
      };

      // Enviar para API
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar agendamento');
      }

      toast.success('Agendamento criado com sucesso!');
      
      // Redirecionar após sucesso
      setTimeout(() => {
        router.push('/dashboard/erp/agendamentos');
      }, 1000);

    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao criar agendamento';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Obter data mínima (hoje) - memoizado para evitar recriações
  const minDate = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <Toaster position="top-right" />
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Novo Agendamento
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Crie um novo agendamento para consulta veterinária
                  </p>
                </div>
                <Link 
                  href="/dashboard/erp/agendamentos" 
                  className="group flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-semibold bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  <LuArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  <span>Voltar</span>
                </Link>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-red-600 text-sm font-medium flex items-center gap-2">
                    <LuX className="w-4 h-4" />
                    {error}
                  </p>
                  <button 
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <LuX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Informações do Tutor e Pet */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <LuUser className="w-5 h-5 text-blue-600" />
                    Tutor e Pet
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuUser className="w-4 h-4 mr-2 text-blue-500" />
                        Tutor *
                      </label>
                      <select
                        name="tutorId"
                        value={formData.tutorId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      >
                        <option value="">Selecione um tutor</option>
                        {tutors.map((tutor) => (
                          <option key={tutor.id} value={tutor.id}>
                            {tutor.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Pet *
                      </label>
                      <div className="flex gap-2">
                        <select
                          name="petId"
                          value={formData.petId}
                          onChange={handleChange}
                          className="flex-1 px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          required
                          disabled={!formData.tutorId || pets.length === 0}
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
                              {pet.name} {pet.breed ? `(${pet.breed})` : ''} - {pet.species}
                            </option>
                          ))}
                        </select>
                        {formData.tutorId && (
                          <Link
                            href={`/dashboard/erp/pets/novo?tutorId=${formData.tutorId}`}
                            className="px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all duration-300 flex items-center gap-2"
                            title="Criar novo pet"
                          >
                            <LuPlus className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações da Consulta */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <LuCalendar className="w-5 h-5 text-purple-600" />
                    Informações da Consulta
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuStethoscope className="w-4 h-4 mr-2 text-purple-500" />
                        Veterinário *
                      </label>
                      <select
                        name="userId"
                        value={formData.userId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      >
                        <option value="">Selecione um veterinário</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuClock className="w-4 h-4 mr-2 text-orange-500" />
                        Duração (minutos) *
                      </label>
                      <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        min="15"
                        max="480"
                        step="15"
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuCalendar className="w-4 h-4 mr-2 text-blue-500" />
                        Data *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        min={minDate}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuClock className="w-4 h-4 mr-2 text-blue-500" />
                        Horário *
                      </label>
                      <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Descrição e Observações */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <LuFileText className="w-5 h-5 text-indigo-600" />
                    Detalhes
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuFileText className="w-4 h-4 mr-2 text-indigo-500" />
                        Descrição
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
                        placeholder="Descreva o motivo da consulta..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuFileText className="w-4 h-4 mr-2 text-indigo-500" />
                        Observações
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
                        placeholder="Observações adicionais..."
                      />
                    </div>
                  </div>
                </div>

                {/* Valor e Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <LuDollarSign className="w-5 h-5 text-green-600" />
                    Valor e Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuDollarSign className="w-4 h-4 mr-2 text-green-500" />
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        name="value"
                        value={formData.value}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="SCHEDULED">Agendada</option>
                        <option value="CONFIRMED">Confirmada</option>
                        <option value="IN_PROGRESS">Em Andamento</option>
                        <option value="COMPLETED">Concluída</option>
                        <option value="CANCELED">Cancelada</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Status de Pagamento
                      </label>
                      <select
                        name="paymentStatus"
                        value={formData.paymentStatus}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                        <option value="OVERDUE">Atrasado</option>
                        <option value="CANCELLED">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-4 pt-8 border-t border-white/20">
                  <Link
                    href="/dashboard/erp/agendamentos"
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <LuX className="w-4 h-4" />
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex-1 px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center space-x-2 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="relative z-10">Criando...</span>
                      </>
                    ) : (
                      <>
                        <LuSave className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Criar Agendamento</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
        </div>
      </div>
    </div>
  );
}

