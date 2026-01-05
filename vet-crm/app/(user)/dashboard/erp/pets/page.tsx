'use client';

import { useState, useEffect } from 'react';
import { LuPlus, LuSearch, LuPencil, LuTrash2, LuPawPrint, LuFilter, LuDownload, LuEye, LuUser } from 'react-icons/lu';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import Link from 'next/link';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  status: 'ACTIVE' | 'DECEASED' | 'TRANSFERRED' | 'INACTIVE';
  sex: string;
  sterilization: string;
  birthDate: string;
  coat: string;
  owner: string;
  tutorId: string;
  createdAt: string;
  tutor?: {
    name: string;
  };
}

interface ApiResponse {
  pets: Pet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function PetsListPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'ACTIVE' | 'DECEASED' | 'TRANSFERRED' | 'INACTIVE'>('all');
  const [filterSpecies, setFilterSpecies] = useState<'all' | 'Canina' | 'Felina' | 'Ave' | 'Roedor' | 'Réptil'>('all');

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Buscar pets da API
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/pets');
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const data: ApiResponse = await response.json();
        
        // A API retorna { pets: [], pagination: {} }
        if (!data.pets || !Array.isArray(data.pets)) {
          console.warn('Dados recebidos não contêm array de pets:', data);
          setPets([]);
          return;
        }
        
        setPets(data.pets);
      } catch (error) {
        console.error('Erro ao buscar pets:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido ao carregar pets');
        setPets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  // Filtrar pets
  const filteredPets = pets.filter(pet => {
    const name = pet.name || '';
    const breed = pet.breed || '';
    const owner = pet.owner || pet.tutor?.name || '';
    const species = pet.species || '';
    const status = pet.status || 'INACTIVE';
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         owner.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const matchesSpecies = filterSpecies === 'all' || species === filterSpecies;
    
    return matchesSearch && matchesStatus && matchesSpecies;
  });

  const handleDeletePet = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pet?')) {
      try {
        const response = await fetch(`/api/pets/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setPets(prevPets => prevPets.filter(pet => pet.id !== id));
          alert('Pet excluído com sucesso!');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'DECEASED':
        return 'bg-red-100 text-red-800';
      case 'TRANSFERRED':
        return 'bg-blue-100 text-blue-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getSpeciesText = (species: string) => {
    switch (species) {
      case 'Canina':
        return 'Canino';
      case 'Felina':
        return 'Felino';
      case 'Ave':
        return 'Ave';
      case 'Roedor':
        return 'Roedor';
      case 'Réptil':
        return 'Réptil';
      default:
        return species;
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

  // Estado de renderização condicional
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando pets...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-12 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Erro ao carregar pets</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (pets.length === 0) {
      return (
        <div className="p-12 text-center">
          <LuPawPrint className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Nenhum pet cadastrado
          </h3>
          <p className="mt-2 text-gray-600">
            Comece cadastrando o primeiro pet
          </p>
          <Link
            href="/dashboard/erp/pets/novo"
            className="mt-4 inline-flex items-center gap-2 px-6 py-2 text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300"
          >
            <LuPlus className="w-4 h-4" />
            <span>Cadastrar Primeiro Pet</span>
          </Link>
        </div>
      );
    }

    if (filteredPets.length === 0) {
      return (
        <div className="p-12 text-center">
          <LuPawPrint className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Nenhum pet encontrado
          </h3>
          <p className="mt-2 text-gray-600">
            Tente ajustar os filtros de busca
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Pet</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Espécie/Raça</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tutor</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nascimento</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredPets.map((pet) => (
              <tr key={pet.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <LuPawPrint className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-gray-900">{pet.name || 'Nome não informado'}</div>
                      <div className="text-sm text-gray-500">
                        {getSexText(pet.sex)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{getSpeciesText(pet.species)}</div>
                  <div className="text-sm text-gray-500">{pet.breed || 'Raça não informada'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <LuUser className="h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">{pet.owner || pet.tutor?.name || 'Tutor não informado'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(pet.birthDate)}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(pet.status)}`}>
                    {getStatusText(pet.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Link
                      href={`/dashboard/erp/pets/${pet.id}`}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Visualizar"
                    >
                      <LuEye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/erp/pets/${pet.id}/editar`}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Editar"
                    >
                      <LuPencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeletePet(pet.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Excluir"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Pets
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie todos os pets cadastrados no sistema
                  </p>
                </div>
                <Link
                  href="/dashboard/erp/pets/novo"
                  className="group mt-4 sm:mt-0 flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25"
                >
                  <LuPlus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="font-semibold">Novo Pet</span>
                </Link>
              </div>
            </div>

            {/* Filtros e Busca - Só mostra se não estiver em estado de erro */}
            {!error && pets.length > 0 && (
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-green-500/10 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Barra de Pesquisa */}
                  <div className="md:col-span-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nome, raça ou tutor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>

                  {/* Filtro de Status */}
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <LuFilter className="h-5 w-5 text-gray-400" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="all">Todos os status</option>
                        <option value="ACTIVE">Ativos</option>
                        <option value="DECEASED">Óbito</option>
                        <option value="TRANSFERRED">Transferidos</option>
                        <option value="INACTIVE">Inativos</option>
                      </select>
                    </div>
                  </div>

                  {/* Filtro de Espécie */}
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <LuPawPrint className="h-5 w-5 text-gray-400" />
                      <select
                        value={filterSpecies}
                        onChange={(e) => setFilterSpecies(e.target.value as any)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="all">Todas as espécies</option>
                        <option value="Canina">Caninos</option>
                        <option value="Felina">Felinos</option>
                        <option value="Ave">Aves</option>
                        <option value="Roedor">Roedores</option>
                        <option value="Réptil">Répteis</option>
                      </select>
                    </div>
                  </div>

                  {/* Botão Exportar */}
                  <div className="md:col-span-2">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/50">
                      <LuDownload className="w-5 h-5" />
                      <span className="font-semibold">Exportar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Pets */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-green-500/10 overflow-hidden">
              {renderContent()}

              {/* Paginação */}
              {!loading && !error && pets.length > 0 && filteredPets.length > 0 && (
                <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-white to-white/95">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Mostrando <span className="font-semibold">{filteredPets.length}</span> de{' '}
                      <span className="font-semibold">{pets.length}</span> pets
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                        Anterior
                      </button>
                      <button className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300">
                        Próxima
                      </button>
                    </div>
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
