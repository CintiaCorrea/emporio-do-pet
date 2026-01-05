"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/protected/dashboard/Sidebar";
import Link from "next/link";
import { LuArrowLeft, LuPawPrint, LuVenetianMask, LuCalendar, LuUser, LuSave, LuX } from "react-icons/lu";

interface Tutor {
  id: string;
  name: string;
}

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
  owner: string;
  tutorId?: string;
}

interface ApiResponse {
  tutors: Tutor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Funções de mapeamento
const mapSpeciesToBackend = (species: string): 'CANINE' | 'FELINE' | 'BIRD' | 'RODENT' | 'REPTILE' | 'OTHER' => {
  const mapping: { [key: string]: any } = {
    'Canina': 'CANINE',
    'Felina': 'FELINE', 
    'Ave': 'BIRD',
    'Roedor': 'RODENT',
    'Réptil': 'REPTILE'
  };
  return mapping[species] || 'OTHER';
};

const mapSpeciesToFrontend = (species: string): string => {
  const mapping: { [key: string]: string } = {
    'CANINE': 'Canina',
    'FELINE': 'Felina',
    'BIRD': 'Ave',
    'RODENT': 'Roedor',
    'REPTILE': 'Réptil',
    'OTHER': 'Outro'
  };
  return mapping[species] || species;
};

const mapStatusToBackend = (status: string): 'ACTIVE' | 'INACTIVE' | 'DECEASED' | 'TRANSFERRED' => {
  const mapping: { [key: string]: any } = {
    'Ativo': 'ACTIVE',
    'Inativo': 'INACTIVE',
    'Óbito': 'DECEASED',
    'Transferido': 'TRANSFERRED'
  };
  return mapping[status] || 'ACTIVE';
};

const mapStatusToFrontend = (status: string): string => {
  const mapping: { [key: string]: string } = {
    'ACTIVE': 'Ativo',
    'INACTIVE': 'Inativo',
    'DECEASED': 'Óbito',
    'TRANSFERRED': 'Transferido'
  };
  return mapping[status] || status;
};

const mapGenderToBackend = (gender: string): 'MALE' | 'FEMALE' | 'OTHER' => {
  const mapping: { [key: string]: any } = {
    'Macho': 'MALE',
    'Fêmea': 'FEMALE',
    'Indefinido': 'OTHER'
  };
  return mapping[gender] || 'OTHER';
};

const mapGenderToFrontend = (gender: string): string => {
  const mapping: { [key: string]: string } = {
    'MALE': 'Macho',
    'FEMALE': 'Fêmea',
    'OTHER': 'Indefinido'
  };
  return mapping[gender] || gender;
};

const mapSterilizationToBackend = (sterilization: string): 'NOT_STERILIZED' | 'STERILIZED' | 'SCHEDULED' => {
  const mapping: { [key: string]: any } = {
    'Não': 'NOT_STERILIZED',
    'Sim': 'STERILIZED',
    'Agendado': 'SCHEDULED'
  };
  return mapping[sterilization] || 'NOT_STERILIZED';
};

const mapSterilizationToFrontend = (sterilization: string): string => {
  const mapping: { [key: string]: string } = {
    'NOT_STERILIZED': 'Não',
    'STERILIZED': 'Sim',
    'SCHEDULED': 'Agendado'
  };
  return mapping[sterilization] || sterilization;
};

const mapCoatToBackend = (coat: string): 'SHORT' | 'LONG' | 'SMOOTH' | 'WAVY' | 'CURLY' | 'GOLDEN' | 'BLACK' | 'WHITE' | 'BROWN' | 'MIXED' => {
  const mapping: { [key: string]: any } = {
    'Curta': 'SHORT',
    'Longa': 'LONG',
    'Lisa': 'SMOOTH',
    'Ondulada': 'WAVY',
    'Dourado': 'GOLDEN'
  };
  return mapping[coat] || 'SHORT';
};

const mapCoatToFrontend = (coat: string): string => {
  const mapping: { [key: string]: string } = {
    'SHORT': 'Curta',
    'LONG': 'Longa',
    'SMOOTH': 'Lisa',
    'WAVY': 'Ondulada',
    'CURLY': 'Encaracolada',
    'GOLDEN': 'Dourado',
    'BLACK': 'Preta',
    'WHITE': 'Branca',
    'BROWN': 'Marrom',
    'MIXED': 'Mista'
  };
  return mapping[coat] || coat;
};

export default function EditPetPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [petLoading, setPetLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'foto' | 'extras'>('geral');

  // Carregar pet específico e tutores
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar pet
        const petResponse = await fetch(`/api/pets/${petId}`);
        if (!petResponse.ok) {
          throw new Error(`Pet não encontrado: ${petResponse.status}`);
        }
        const petData = await petResponse.json();
        
        console.log('Dados recebidos do backend:', petData); // Debug
        
        // Mapear dados do backend para o frontend
        const mappedPetData = {
          ...petData,
          species: mapSpeciesToFrontend(petData.species),
          status: mapStatusToFrontend(petData.status),
          sex: mapGenderToFrontend(petData.gender),
          sterilization: mapSterilizationToFrontend(petData.sterilization),
          coat: mapCoatToFrontend(petData.coat),
          breed: petData.breed || "",
          birthDate: petData.birthDate || "",
          tutorId: petData.tutorId || ""
        };
        
        setPet(mappedPetData);

        // Carregar tutores
        const tutorsResponse = await fetch('/api/tutors');
        if (!tutorsResponse.ok) {
          throw new Error(`Erro ao carregar tutores: ${tutorsResponse.status}`);
        }
        
        const tutorsData: ApiResponse = await tutorsResponse.json();
        const tutorsArray = tutorsData.tutors || [];
        
        if (!Array.isArray(tutorsArray)) {
          console.warn('A propriedade tutors não é um array:', tutorsArray);
          setTutors([]);
          return;
        }
        
        setTutors(tutorsArray);

        console.log('Pet mapeado para frontend:', mappedPetData);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
        setPetLoading(false);
      }
    };

    if (petId) {
      fetchData();
    }
  }, [petId]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (!pet) return;
    
    if (name === 'tutorId') {
      // Quando o tutor é alterado, atualizar tanto o tutorId quanto o nome do owner
      const selectedTutor = tutors.find(tutor => tutor.id === value);
      setPet(prev => prev ? { 
        ...prev, 
        tutorId: value,
        owner: selectedTutor ? selectedTutor.name : prev.owner
      } : null);
    } else {
      setPet(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pet) return;
    
    try {
      // Mapear dados para o formato do backend
      const petDataForBackend = {
        name: pet.name,
        species: mapSpeciesToBackend(pet.species),
        breed: pet.breed,
        status: mapStatusToBackend(pet.status),
        gender: mapGenderToBackend(pet.sex),
        sterilization: mapSterilizationToBackend(pet.sterilization),
        birthDate: pet.birthDate || null,
        coat: mapCoatToBackend(pet.coat),
        tutorId: pet.tutorId
      };

      console.log('Dados enviados para backend:', petDataForBackend); // Debug

      const response = await fetch(`/api/pets/${pet.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(petDataForBackend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar pet');
      }

      const updatedPet = await response.json();
      console.log("Pet atualizado com sucesso", updatedPet);
      
      // Feedback de sucesso e redirecionamento
      alert('Pet atualizado com sucesso!');
      router.push('/dashboard/erp/pets');
      
    } catch (error) {
      console.error('Erro ao atualizar pet:', error);
      alert('Erro ao atualizar pet. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? "ml-48 sm:ml-64" : "ml-12 sm:ml-16"
        }`}>
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Carregando...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? "ml-48 sm:ml-64" : "ml-12 sm:ml-16"
        }`}>
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Erro</h2>
                <p className="text-gray-600 mb-6">{error || "Pet não encontrado"}</p>
                <Link 
                  href="/dashboard/erp/pets" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all duration-300"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? "ml-48 sm:ml-64" : "ml-12 sm:ml-16"
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Editar Pet
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Edite as informações do pet no sistema
                  </p>
                </div>
                <Link 
                  href="/dashboard/erp/pets" 
                  className="group flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-semibold bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  <LuArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  <span>Voltar</span>
                </Link>
              </div>
            </div>

            {/* Main Card */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-green-500/10 overflow-hidden">
              {/* Pet Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <LuPawPrint className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">{pet.name}</h1>
                      <p className="text-green-100 text-sm mt-1">
                        {pet.breed} • {pet.species}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                      <span className="text-white text-sm font-medium">{pet.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Modernizadas */}
              <div className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('geral')}
                    className={`group px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'geral'
                        ? 'border-b-2 border-green-500 text-green-600 bg-green-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuPawPrint className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'geral' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Geral</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('foto')}
                    className={`group px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'foto'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuVenetianMask className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'foto' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Foto</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('extras')}
                    className={`group px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'extras'
                        ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuUser className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'extras' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Extras</span>
                  </button>
                </div>
              </div>

              {/* Form */}
              {activeTab === 'geral' && (
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Nome do Animal*
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={pet.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Espécie*
                      </label>
                      <select
                        name="species"
                        value={pet.species}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="Canina">Canina</option>
                        <option value="Felina">Felina</option>
                        <option value="Ave">Ave</option>
                        <option value="Roedor">Roedor</option>
                        <option value="Réptil">Réptil</option>
                      </select>
                    </div>
                  </div>

                  {/* Raça e Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Raça
                      </label>
                      <select
                        name="breed"
                        value={pet.breed || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="SRD">SRD</option>
                        <option value="Labrador">Labrador</option>
                        <option value="Poodle">Poodle</option>
                        <option value="Dachshund Miniatura">Dachshund Miniatura</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Status*
                      </label>
                      <select
                        name="status"
                        value={pet.status}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Óbito">Óbito</option>
                        <option value="Transferido">Transferido</option>
                      </select>
                    </div>
                  </div>

                  {/* Sexo e Esterilização */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Sexo
                      </label>
                      <select
                        name="sex"
                        value={pet.sex || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Macho">Macho</option>
                        <option value="Fêmea">Fêmea</option>
                        <option value="Indefinido">Indefinido</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Esterilização
                      </label>
                      <select
                        name="sterilization"
                        value={pet.sterilization || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                        <option value="Agendado">Agendado</option>
                      </select>
                    </div>
                  </div>

                  {/* Nascimento e Pelagem */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuCalendar className="w-4 h-4 mr-2 text-blue-500" />
                        Data de Nascimento
                      </label>
                      <input
                        type="text"
                        name="birthDate"
                        value={pet.birthDate}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        placeholder="dd/mm/aaaa"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Pelagem
                      </label>
                      <select
                        name="coat"
                        value={pet.coat || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Curta">Curta</option>
                        <option value="Longa">Longa</option>
                        <option value="Lisa">Lisa</option>
                        <option value="Ondulada">Ondulada</option>
                        <option value="Dourado">Dourado</option>
                      </select>
                    </div>
                  </div>

                  {/* Dono - Campo único */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <LuUser className="w-4 h-4 mr-2 text-purple-500" />
                      Dono do Animal*
                    </label>
                    {petLoading ? (
                      <div className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200/80 rounded-2xl text-gray-600 shadow-sm">
                        Carregando tutores...
                      </div>
                    ) : error ? (
                      <div className="w-full px-4 py-3 bg-red-50/80 border border-red-200/80 rounded-2xl text-red-600 shadow-sm">
                        Erro ao carregar tutores: {error}
                      </div>
                    ) : (
                      <select
                        name="tutorId"
                        value={pet.tutorId || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      >
                        <option value="">Selecione um tutor</option>
                        {Array.isArray(tutors) && tutors.map((tutor) => (
                          <option key={tutor.id} value={tutor.id}>
                            {tutor.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-4 mt-8 pt-8 border-t border-white/20">
                    <button
                      type="submit"
                      className="group px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 flex items-center space-x-2 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <LuSave className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Salvar Alterações</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Outras Tabs */}
              {activeTab === 'foto' && (
                <div className="p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-32 h-32 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                      <LuVenetianMask className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Editar Foto</h3>
                    <p className="text-gray-600 mb-6">Faça upload de uma nova foto do pet</p>
                    <button className="px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all duration-300">
                      Selecionar Arquivo
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'extras' && (
                <div className="p-8">
                  <div className="max-w-2xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Extras</h3>
                    <p className="text-gray-600">Em desenvolvimento...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
