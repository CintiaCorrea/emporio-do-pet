'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LuArrowLeft, LuPawPrint, LuVenetianMask, LuCalendar, LuUser, LuPencil, LuTrash2, LuPhone, LuMail, LuMapPin } from 'react-icons/lu';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import Link from 'next/link';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  status: string;
  sex: string;
  sterilization: string;
  birthDate: string;
  coat: string;
  coatColor?: string;
  weight?: number;
  microchip?: string;
  avatar?: string;
  observations?: string;
  allergies: string[];
  medicalNotes?: string;
  owner: string;
  tutorId: string;
  createdAt: string;
  tutor?: {
    id: string;
    name: string;
    email?: string;
    contacts?: {
      number: string;
      type: string;
      isWhatsApp: boolean;
    }[];
    address?: string;
  };
  _count?: {
    appointments: number;
    treatments: number;
  };
}

export default function PetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar pet específico
  useEffect(() => {
    const fetchPet = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/pets/${petId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Pet não encontrado');
          }
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPet(data);
      } catch (error) {
        console.error('Erro ao buscar pet:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido ao carregar pet');
      } finally {
        setLoading(false);
      }
    };

    if (petId) {
      fetchPet();
    }
  }, [petId]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleDeletePet = async () => {
    if (confirm('Tem certeza que deseja excluir este pet? Esta ação não pode ser desfeita.')) {
      try {
        const response = await fetch(`/api/pets/${petId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          alert('Pet excluído com sucesso!');
          router.push('/dashboard/erp/pets');
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Erro ao excluir pet');
        }
      } catch (error) {
        console.error('Erro ao excluir pet:', error);
        alert('Erro ao excluir pet');
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Não informada';
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const calculateAge = (birthDate: string) => {
    try {
      if (!birthDate) return null;
      
      const birth = new Date(birthDate);
      const today = new Date();
      
      let years = today.getFullYear() - birth.getFullYear();
      let months = today.getMonth() - birth.getMonth();
      
      if (months < 0) {
        years--;
        months += 12;
      }
      
      if (years === 0) {
        return `${months} ${months === 1 ? 'mês' : 'meses'}`;
      } else if (months === 0) {
        return `${years} ${years === 1 ? 'ano' : 'anos'}`;
      } else {
        return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
      }
    } catch {
      return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DECEASED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'TRANSFERRED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativo';
      case 'DECEASED':
        return 'Óbito';
      case 'TRANSFERRED':
        return 'Transferido';
      case 'INACTIVE':
        return 'Inativo';
      default:
        return status;
    }
  };

  const getSexText = (sex: string) => {
    switch (sex) {
      case 'MALE':
        return 'Macho';
      case 'FEMALE':
        return 'Fêmea';
      case 'OTHER':
        return 'Indefinido';
      default:
        return sex || 'Indefinido';
    }
  };

  const getSterilizationText = (sterilization: string) => {
    switch (sterilization) {
      case 'STERILIZED':
        return 'Sim';
      case 'NOT_STERILIZED':
        return 'Não';
      case 'SCHEDULED':
        return 'Agendado';
      default:
        return sterilization || 'Não informado';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
        } overflow-hidden`}>
          <div className="p-4 sm:p-6 h-full overflow-hidden">
            <div className="max-w-6xl mx-auto h-full overflow-hidden">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Carregando informações do pet...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
        } overflow-hidden`}>
          <div className="p-4 sm:p-6 h-full overflow-hidden">
            <div className="max-w-6xl mx-auto h-full overflow-hidden">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Pet não encontrado</h2>
                <p className="text-gray-600 mb-6">{error || "O pet solicitado não existe ou foi removido."}</p>
                <Link 
                  href="/dashboard/erp/pets" 
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-xl sm:rounded-2xl hover:bg-green-700 transition-all duration-300 text-sm sm:text-base"
                >
                  <LuArrowLeft className="w-4 h-4" />
                  <span>Voltar para a lista</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } overflow-hidden`}>
        <div className="p-4 sm:p-6 h-full overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent break-words">
                    Detalhes do Pet
                  </h1>
                  <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base break-words">
                    Informações completas sobre {pet.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Link
                    href={`/dashboard/erp/pets/${pet.id}/editar`}
                    className="group flex items-center gap-2 px-3 sm:px-4 py-2 text-green-600 hover:text-green-700 text-xs sm:text-sm font-semibold bg-white/80 border border-green-200 rounded-xl sm:rounded-2xl hover:bg-white hover:border-green-300 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm flex-1 sm:flex-none justify-center min-w-[80px]"
                  >
                    <LuPencil className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Editar</span>
                  </Link>
                  <button
                    onClick={handleDeletePet}
                    className="group flex items-center gap-2 px-3 sm:px-4 py-2 text-red-600 hover:text-red-700 text-xs sm:text-sm font-semibold bg-white/80 border border-red-200 rounded-xl sm:rounded-2xl hover:bg-white hover:border-red-300 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm flex-1 sm:flex-none justify-center min-w-[80px]"
                  >
                    <LuTrash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Excluir</span>
                  </button>
                  <Link 
                    href="/dashboard/erp/pets" 
                    className="group flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 text-xs sm:text-sm font-semibold bg-white/80 border border-gray-300/50 rounded-xl sm:rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm flex-1 sm:flex-none justify-center min-w-[80px]"
                  >
                    <LuArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="hidden xs:inline">Voltar</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Coluna Principal */}
              <div className="xl:col-span-2 space-y-4 sm:space-y-6">
                {/* Card de Informações Básicas */}
                <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-green-500/10 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-4 mb-4 sm:mb-6">
                      <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl backdrop-blur-sm flex-shrink-0">
                        {pet.avatar ? (
                          <img 
                            src={pet.avatar} 
                            alt={pet.name}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <LuPawPrint className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{pet.name}</h2>
                        <p className="text-gray-600 text-sm sm:text-base mt-1 break-words">
                          {pet.breed} • {pet.species}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Nome</label>
                        <p className="text-gray-900 font-semibold text-sm sm:text-base break-words">{pet.name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Espécie</label>
                        <p className="text-gray-900 text-sm sm:text-base break-words">{pet.species}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Raça</label>
                        <p className="text-gray-900 text-sm sm:text-base break-words">{pet.breed || 'Não informada'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Sexo</label>
                        <p className="text-gray-900 text-sm sm:text-base">{getSexText(pet.sex)}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Data de Nascimento</label>
                        <p className="text-gray-900 text-sm sm:text-base">
                          {formatDate(pet.birthDate)}
                          {calculateAge(pet.birthDate) && (
                            <span className="text-gray-500 text-xs ml-1 sm:ml-2">
                              ({calculateAge(pet.birthDate)})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Idade</label>
                        <p className="text-gray-900 text-sm sm:text-base">
                          {calculateAge(pet.birthDate) || 'Não informada'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Pelagem</label>
                        <p className="text-gray-900 text-sm sm:text-base break-words">{pet.coat || 'Não informada'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Cor da Pelagem</label>
                        <p className="text-gray-900 text-sm sm:text-base break-words">{pet.coatColor || 'Não informada'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Peso</label>
                        <p className="text-gray-900 text-sm sm:text-base">
                          {pet.weight ? `${pet.weight} kg` : 'Não informado'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Microchip</label>
                        <p className="text-gray-900 text-sm sm:text-base break-words">{pet.microchip || 'Não informado'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Esterilização</label>
                        <p className="text-gray-900 text-sm sm:text-base">{getSterilizationText(pet.sterilization)}</p>
                      </div>
                    </div>

                    {pet.observations && (
                      <div className="mt-4 sm:mt-6 space-y-2">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Observações</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg p-3 text-xs sm:text-sm break-words">
                          {pet.observations}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card de Saúde */}
                <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-green-500/10 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4 sm:mb-6">
                      <LuVenetianMask className="w-5 h-5 text-purple-500" />
                      Informações de Saúde
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      {/* Alergias */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">Alergias</h4>
                        {pet.allergies && pet.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {pet.allergies.map((allergy, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 break-words"
                              >
                                {allergy}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Nenhuma alergia registrada</p>
                        )}
                      </div>

                      {/* Notas Médicas */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">Notas Médicas</h4>
                        {pet.medicalNotes ? (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-gray-900 whitespace-pre-wrap text-sm break-words">{pet.medicalNotes}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Nenhuma nota médica registrada</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Lateral */}
              <div className="space-y-4 sm:space-y-6">
                {/* Card de Status */}
                <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-green-500/10 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Status do Pet</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(pet.status)}`}>
                          {getStatusText(pet.status)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Cadastrado em</span>
                        <span className="text-sm text-gray-900">{formatDate(pet.createdAt)}</span>
                      </div>

                      {pet._count && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Consultas</span>
                            <span className="text-sm text-gray-900 font-semibold">{pet._count.appointments}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Tratamentos</span>
                            <span className="text-sm text-gray-900 font-semibold">{pet._count.treatments}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card do Tutor */}
                <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-green-500/10 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                      <LuUser className="w-5 h-5 text-blue-500" />
                      Tutor Responsável
                    </h3>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Nome</label>
                        <p className="text-gray-900 font-semibold text-sm break-words">{pet.owner || pet.tutor?.name}</p>
                      </div>

                      {pet.tutor?.email && (
                        <div className="flex items-center gap-2">
                          <LuMail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 text-sm break-words">{pet.tutor.email}</span>
                        </div>
                      )}

                      {pet.tutor?.contacts && pet.tutor.contacts.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700">Contatos</label>
                          {pet.tutor.contacts.map((contact, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <LuPhone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-700 text-sm break-words">
                                {contact.number}
                                {contact.isWhatsApp && (
                                  <span className="text-green-600 text-xs ml-2">(WhatsApp)</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {pet.tutor?.address && (
                        <div className="flex items-start gap-2">
                          <LuMapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm break-words">{pet.tutor.address}</span>
                        </div>
                      )}

                      <Link
                        href={`/dashboard/erp/tutors/${pet.tutorId}`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 text-xs font-semibold bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-all duration-300 w-full justify-center mt-2"
                      >
                        <LuUser className="w-4 h-4" />
                        <span>Ver perfil completo</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
