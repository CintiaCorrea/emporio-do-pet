'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LuArrowLeft, LuPawPrint, LuVenetianMask, LuCalendar, LuUser, LuPencil, LuTrash, LuPhone, LuFiles } from 'react-icons/lu';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import Link from 'next/link';
import PetStatsPanel from '@/components/gamification/PetStatsPanel';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';

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
  documents?: string[];
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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'foto' | 'extras' | 'documentos'>('geral');

  const [docTemplates, setDocTemplates] = useState<
    { id: string; title: string; category: string | null; updatedAt: string }[]
  >([]);
  const [docTemplatesLoading, setDocTemplatesLoading] = useState(false);
  const [docTemplatesError, setDocTemplatesError] = useState<string | null>(null);

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

  // Carregar templates de documentos (para exibir os vinculados ao pet)
  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      try {
        setDocTemplatesLoading(true);
        setDocTemplatesError(null);

        // Puxar todos os templates do usuário (inclui DRAFT/PUBLISHED/ARCHIVED)
        const res = await fetch('/api/documents');
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Erro ao carregar templates de documentos');

        const docs = Array.isArray(data?.documents) ? data.documents : [];
        const slim = docs
          .map((d: any) => ({
            id: String(d?.id || ''),
            title: String(d?.title || 'Sem título'),
            category: d?.category ?? null,
            updatedAt: String(d?.updatedAt || '')}))
          .filter((d: any) => d.id);

        if (!cancelled) setDocTemplates(slim);
      } catch (e) {
        if (!cancelled) setDocTemplatesError(e instanceof Error ? e.message : 'Erro ao carregar templates de documentos');
      } finally {
        if (!cancelled) setDocTemplatesLoading(false);
      }
    };

    fetchDocs();
    return () => {
      cancelled = true;
    };
  }, []);

  const petDocumentIds = useMemo(() => (Array.isArray(pet?.documents) ? pet!.documents : []), [pet]);
  const docById = useMemo(() => {
    const map = new Map<string, { id: string; title: string; category: string | null; updatedAt: string }>();
    for (const d of docTemplates) map.set(d.id, d);
    return map;
  }, [docTemplates]);
  const selectedDocs = useMemo(() => {
    return petDocumentIds.map((id) => docById.get(id) || { id, title: `Template (${id})`, category: null, updatedAt: '' });
  }, [petDocumentIds, docById]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleDeletePet = async () => {
    setIsDeleteOpen(true);
  };

  const confirmDeletePet = async () => {
    const res = await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
        'Erro ao excluir pet';
      throw new Error(message);
    }

    toast.success('Pet excluído com sucesso!');
    router.push('/dashboard/erp/pets');
  };

  const parseDateOnly = (value: string): { year: number; month: number; day: number } | null => {
    if (!value) return null;

    // ISO-like: YYYY-MM-DD...
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]);
      const day = Number(iso[3]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      return { year, month, day };
    }

    // pt-BR: dd/mm/yyyy (also accept '-' or '.')
    const cleaned = value.replace(/[.\-]/g, "/").trim();
    const br = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (br) {
      const day = Number(br[1]);
      const month = Number(br[2]);
      let year = Number(br[3]);
      if (br[3].length === 2) year = year <= 49 ? 2000 + year : 1900 + year;
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      return { year, month, day };
    }

    return null;
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Não informada';
      const parsed = parseDateOnly(dateString);
      if (parsed) {
        const dd = String(parsed.day).padStart(2, "0");
        const mm = String(parsed.month).padStart(2, "0");
        return `${dd}/${mm}/${parsed.year}`;
      }

      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return 'Não informada';
      return d.toLocaleDateString('pt-BR');
    } catch {
      return 'Não informada';
    }
  };

  const calculateAge = (birthDate: string) => {
    try {
      if (!birthDate) return null;
      const parsed = parseDateOnly(birthDate);
      if (!parsed) return null;

      const today = new Date();
      const ty = today.getUTCFullYear();
      const tm = today.getUTCMonth() + 1; // 1-12
      const td = today.getUTCDate();

      let totalMonths = (ty - parsed.year) * 12 + (tm - parsed.month);
      // se ainda não completou o "dia" no mês atual, desconta 1 mês
      if (td < parsed.day) totalMonths -= 1;
      if (totalMonths < 0) return null;

      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      
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

  const getSpeciesText = (species: string) => {
    switch (species) {
      case 'CANINE':
        return 'Canina';
      case 'FELINE':
        return 'Felina';
      case 'BIRD':
        return 'Ave';
      case 'RODENT':
        return 'Roedor';
      case 'REPTILE':
        return 'Réptil';
      case 'OTHER':
        return 'Outro';
      default:
        return species || 'Não informada';
    }
  };

  const getCoatText = (coat: string) => {
    switch (coat) {
      case 'SHORT':
        return 'Curta';
      case 'LONG':
        return 'Longa';
      case 'SMOOTH':
        return 'Lisa';
      case 'WAVY':
        return 'Ondulada';
      case 'CURLY':
        return 'Encaracolada';
      case 'GOLDEN':
        return 'Dourado';
      case 'BLACK':
        return 'Preta';
      case 'WHITE':
        return 'Branca';
      case 'BROWN':
        return 'Marrom';
      case 'MIXED':
        return 'Mista';
      default:
        return coat || 'Não informada';
    }
  };

  const formatWeight = (weight?: number) => {
    if (weight === null || weight === undefined) return 'Não informado';
    return `${String(weight).replace('.', ',')} kg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-cyan-50/10 overflow-hidden">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-cyan-50/10 overflow-hidden">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-cyan-50/10 overflow-hidden">
      {pet && (
        <ConfirmDeleteModal
          isOpen={isDeleteOpen}
          entityLabel="Pet"
          itemName={pet.name || '—'}
          consequenceText="Esta ação não pode ser desfeita. Os dados do pet serão removidos."
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={confirmDeletePet}
        />
      )}
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
                    <LuTrash className="w-3 h-3 sm:w-4 sm:h-4" />
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

            {/* Card principal com tabs (igual ao formulário) */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-green-500/10 overflow-hidden">
              {/* Header do Pet */}
              <div className="bg-gradient-to-r from-green-600 to-cyan-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm overflow-hidden">
                      {pet.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pet.avatar} alt={pet.name} className="w-16 h-16 object-cover" />
                      ) : (
                        <LuPawPrint className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold text-white break-words">{pet.name}</h2>
                      <p className="text-green-100 text-sm mt-1 break-words">
                        {pet.breed || 'Raça'} • {getSpeciesText(pet.species)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm border border-white/10">
                      <span className="text-white text-sm font-medium">{getStatusText(pet.status)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
                <div className="overflow-x-auto">
                  <div className="flex flex-nowrap min-w-max">
                  <button
                    onClick={() => setActiveTab('geral')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'geral'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-500/10 dark:text-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'
                    }`}
                  >
                    <LuPawPrint className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'geral' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Geral</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('foto')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'foto'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-500/10 dark:text-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'
                    }`}
                  >
                    <LuVenetianMask className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'foto' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Foto</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('extras')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'extras'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-500/10 dark:text-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'
                    }`}
                  >
                    <LuUser className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'extras' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Extras</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('documentos')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'documentos'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-500/10 dark:text-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'
                    }`}
                  >
                    <LuFiles className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'documentos' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Documentos</span>
                  </button>
                  </div>
                </div>
              </div>

              {/* Conteúdo das tabs */}
              {activeTab === 'geral' && (
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Nome do Animal
                      </label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                        {pet.name || '—'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Espécie
                      </label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                        {getSpeciesText(pet.species)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Raça</label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                        {pet.breed || 'Não informada'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Status</label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 flex items-center justify-between">
                        <span>{getStatusText(pet.status)}</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(pet.status)}`}>
                          {getStatusText(pet.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Sexo</label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                        {getSexText(pet.sex)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Esterilização</label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                        {getSterilizationText(pet.sterilization)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuCalendar className="w-4 h-4 mr-2 text-blue-500" />
                        Data de Nascimento
                      </label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                        {pet.birthDate ? `${formatDate(pet.birthDate)}${calculateAge(pet.birthDate) ? ` (${calculateAge(pet.birthDate)})` : ''}` : 'Não informada'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Pelagem</label>
                      <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                        {pet.coat ? getCoatText(pet.coat) : 'Não informada'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <LuUser className="w-4 h-4 mr-2 text-purple-500" />
                      Dono do Animal
                    </label>
                    <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 flex items-center justify-between gap-3">
                      <span className="break-words">{pet.owner || pet.tutor?.name || 'Tutor não informado'}</span>
                      <Link
                        href={`/dashboard/erp/tutors/${pet.tutorId}`}
                        className="shrink-0 px-3 py-2 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-all duration-300"
                      >
                        Ver tutor
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'foto' && (
                <div className="p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="relative w-40 h-40 mx-auto mb-4">
                      {pet.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pet.avatar}
                          alt={pet.name || "Foto do pet"}
                          className="w-40 h-40 rounded-2xl object-cover ring-2 ring-white/60 shadow-lg"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <LuVenetianMask className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Foto do Pet</h3>
                    <p className="text-gray-600 mb-6">Envie uma foto e ela será salva no cadastro.</p>

                    <Link
                      href={`/dashboard/erp/pets/${pet.id}/editar`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all duration-300"
                    >
                      <LuPencil className="w-5 h-5" />
                      Editar / Alterar foto
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'extras' && (
                <div className="p-8">
                  <div className="max-w-3xl mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Informações Extras</h3>
                    <p className="text-gray-600 mb-6">Campos opcionais para complementar o cadastro do pet.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Cor da Pelagem</label>
                        <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                          {pet.coatColor || 'Não informada'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Peso (kg)</label>
                        <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900">
                          {formatWeight(pet.weight)}
                        </div>
                        <p className="text-xs text-gray-500">Exibido em kg.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Microchip</label>
                        <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 break-words">
                          {pet.microchip || 'Não informado'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Alergias</label>
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
                          <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-500">
                            Nenhuma alergia registrada
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 mt-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Observações</label>
                        <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 whitespace-pre-wrap min-h-[96px]">
                          {pet.observations || '—'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Notas Médicas Importantes</label>
                        <div className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 whitespace-pre-wrap min-h-[96px]">
                          {pet.medicalNotes || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">Cadastrado em:</span> {formatDate(pet.createdAt)}
                        {pet._count ? (
                          <span className="ml-2">
                            • <span className="font-semibold">{pet._count.appointments}</span> consultas •{" "}
                            <span className="font-semibold">{pet._count.treatments}</span> tratamentos
                          </span>
                        ) : null}
                      </div>
                      <Link
                        href={`/dashboard/erp/pets/${pet.id}/editar`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 text-sm font-semibold bg-white/80 border border-green-200 rounded-2xl hover:bg-white hover:border-green-300 hover:shadow-lg transition-all duration-300"
                      >
                        <LuPencil className="w-4 h-4" />
                        Editar informações
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documentos' && (
                <div className="p-8">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Documentos</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          Templates vinculados a este pet.
                        </p>
                      </div>
                      <Link
                        href="/dashboard/erp/documentos"
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 underline underline-offset-2"
                      >
                        Gerenciar templates
                      </Link>
                    </div>

                    <div className="bg-white/70 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 rounded-2xl overflow-hidden">
                      {docTemplatesLoading ? (
                        <div className="p-4 text-sm text-gray-600 dark:text-gray-300">Carregando templates...</div>
                      ) : docTemplatesError ? (
                        <div className="p-4 text-sm text-red-600 dark:text-red-300">{docTemplatesError}</div>
                      ) : petDocumentIds.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
                          Nenhum template vinculado a este pet.
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-white/10">
                          {selectedDocs.map((doc) => (
                            <li key={doc.id} className="p-4 hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 dark:text-white truncate">{doc.title}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-300 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                                    {doc.category ? <span>Categoria: {doc.category}</span> : null}
                                    {doc.updatedAt ? (
                                      <span>Atualizado: {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}</span>
                                    ) : null}
                                  </div>
                                </div>
                                <Link
                                  href={`/dashboard/erp/documentos/${doc.id}`}
                                  className="shrink-0 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-200 bg-white dark:bg-white/5 border border-blue-200 dark:border-blue-400/30 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-300"
                                >
                                  Abrir
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Para vincular/remover templates, use a tela de edição do pet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {pet && (
        <div className="px-4 max-w-7xl mx-auto py-4">
          <PetStatsPanel petId={pet.id} />
        </div>
      )}
    </div>
  );
}
