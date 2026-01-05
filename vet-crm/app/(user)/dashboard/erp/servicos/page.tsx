'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuWrench,
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuX,
  LuDollarSign,
  LuTrendingUp,
  LuClock,
  LuActivity,
  LuClipboardList
} from 'react-icons/lu';

// Tipo SERVICE
type ServiceType = 'SERVICE';

interface Treatment {
  id: string;
  description: string;
  cost: number;
  appointment: {
    id: string;
    date: string;
    pet: {
      name: string;
    };
  };
}

interface Service {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  stock: number;
  treatments: Treatment[];
  _count: {
    treatments: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ServiceStats {
  total: number;
  totalValue: number;
  averagePrice: number;
}

interface ApiResponse {
  products: Service[];
  stats: ServiceStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ServicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'SERVICE' as ServiceType,
    price: 0,
    stock: 0
  });

  // Buscar services da API (apenas SERVICE)
  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('type', 'SERVICE');
      
      const response = await fetch(`/api/products?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar serviços');
      }
      
      const data: ApiResponse = await response.json();
      // Garantir que só temos serviços
      const filteredServices = data.products.filter(p => p.type === 'SERVICE');
      setServices(filteredServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar services:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar services inicial
  useEffect(() => {
    fetchServices();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchServices();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Filtrar serviços localmente (backup)
  const filteredServices = services.filter(service => {
    return service.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Estatísticas locais
  const localStats = {
    total: services.length,
    totalRevenue: services.reduce((acc, s) => acc + (s.price * s._count.treatments), 0),
    averagePrice: services.length > 0 ? services.reduce((acc, s) => acc + s.price, 0) / services.length : 0,
    totalTreatments: services.reduce((acc, s) => acc + s._count.treatments, 0)
  };

  // Funções para manipular serviços
  const handleCreateService = async () => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type: 'SERVICE',
          stock: 0
        }),
      });

      if (response.ok) {
        fetchServices();
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar serviço');
      }
    } catch (err) {
      console.error('Erro ao criar service:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar serviço');
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;

    try {
      const response = await fetch(`/api/products/${selectedService.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          price: formData.price,
          type: 'SERVICE'
        }),
      });

      if (response.ok) {
        fetchServices();
        setIsModalOpen(false);
        setIsEditMode(false);
        resetForm();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar serviço');
      }
    } catch (err) {
      console.error('Erro ao atualizar service:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar serviço');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchServices();
        setIsModalOpen(false);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir serviço');
      }
    } catch (err) {
      console.error('Erro ao excluir service:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir serviço');
    }
  };

  const openServiceDetails = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      type: 'SERVICE',
      price: service.price,
      stock: 0
    });
    setIsModalOpen(true);
    setIsEditMode(false);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'SERVICE',
      price: 0,
      stock: 0
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading && services.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando serviços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Serviços
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie os serviços oferecidos pela clínica veterinária
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/erp/servicos/relatorio"
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuTrendingUp className="w-4 h-4" />
                    <span>Relatório</span>
                  </Link>
                  <button 
                    onClick={openCreateModal}
                    className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 flex items-center space-x-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Novo Serviço</span>
                  </button>
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
                  <LuX className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { 
                  label: "Total de Serviços", 
                  value: localStats.total, 
                  color: "purple", 
                  icon: LuWrench
                },
                { 
                  label: "Preço Médio", 
                  value: formatCurrency(localStats.averagePrice), 
                  color: "blue", 
                  icon: LuDollarSign,
                  isFormatted: true
                },
                { 
                  label: "Atendimentos", 
                  value: localStats.totalTreatments, 
                  color: "green", 
                  icon: LuActivity
                },
                { 
                  label: "Receita Estimada", 
                  value: formatCurrency(localStats.totalRevenue), 
                  color: "teal", 
                  icon: LuTrendingUp,
                  isFormatted: true
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-purple-500/5 p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    <div className={`text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent ${stat.isFormatted ? 'text-lg' : ''}`}>
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
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-purple-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1 min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nome do serviço..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <button 
                    onClick={fetchServices}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    <LuSearch className="w-4 h-4" />
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Services Table */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-purple-500/5 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Catálogo de Serviços
                  </h3>
                  <div className="text-sm text-gray-600">
                    {filteredServices.length} serviços encontrados
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Serviço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Preço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Atendimentos</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Receita</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Última Atualização</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service) => (
                      <tr 
                        key={service.id} 
                        className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 group cursor-pointer"
                        onClick={() => openServiceDetails(service)}
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                              <LuWrench className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{service.name}</div>
                              <div className="text-sm text-gray-500">
                                ID: {service.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-semibold text-gray-900 flex items-center gap-1">
                            <LuDollarSign className="w-4 h-4 text-green-600" />
                            {formatCurrency(service.price)}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <LuActivity className="w-3 h-3 mr-1" />
                              {service._count.treatments} atendimentos
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(service.price * service._count.treatments)}
                          </div>
                          <div className="text-xs text-gray-500">
                            receita total
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-1 text-gray-600">
                            <LuClock className="w-4 h-4" />
                            {formatDate(service.updatedAt)}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedService(service);
                                setFormData({
                                  name: service.name,
                                  type: 'SERVICE',
                                  price: service.price,
                                  stock: 0
                                });
                                setIsEditMode(true);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-2xl transition-colors"
                              title="Editar serviço"
                            >
                              <LuPencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 rounded-2xl transition-colors"
                              title="Excluir serviço"
                            >
                              <LuTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredServices.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <LuWrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhum serviço encontrado</p>
                    <p className="text-gray-400 mt-2">
                      {services.length === 0 
                        ? 'Comece adicionando seu primeiro serviço' 
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Mostrando {filteredServices.length} de {services.length} serviços
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
      </div>

      {/* Modal de Detalhes/Edição do Serviço */}
      {isModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Editar Serviço' : 'Detalhes do Serviço'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {isEditMode ? (
                // Edit Form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Serviço</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                      placeholder="Nome do serviço"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              ) : (
                // View Details
                <>
                  {/* Informações do Serviço */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <LuWrench className="w-5 h-5 text-purple-600" />
                      Informações do Serviço
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nome</label>
                        <p className="text-gray-900">{selectedService.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Tipo</label>
                        <p className="text-gray-900">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Serviço
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Preço</label>
                        <p className="text-gray-900 font-semibold">{formatCurrency(selectedService.price)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Atendimentos</label>
                        <p className="text-gray-900">{selectedService._count.treatments} atendimentos</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Receita Total</label>
                        <p className="text-gray-900 font-semibold">
                          {formatCurrency(selectedService.price * selectedService._count.treatments)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Última Atualização</label>
                        <p className="text-gray-900">{formatDate(selectedService.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tratamentos Recentes */}
                  {selectedService.treatments.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <LuClipboardList className="w-5 h-5 text-purple-600" />
                        Atendimentos Recentes
                      </h4>
                      <div className="space-y-3">
                        {selectedService.treatments.map((treatment) => (
                          <div key={treatment.id} className="bg-gray-50 p-4 rounded-2xl">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{treatment.description}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Pet: {treatment.appointment.pet.name} • {formatDate(treatment.appointment.date)}
                                </p>
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
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateService}
                    className="px-6 py-3 text-white bg-purple-600 rounded-2xl hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    Salvar Alterações
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-6 py-3 text-white bg-purple-600 rounded-2xl hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <LuPencil className="w-4 h-4" />
                    Editar Serviço
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Serviço */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Novo Serviço</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Serviço *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                  placeholder="Ex: Consulta Geral, Banho e Tosa..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateService}
                disabled={!formData.name || formData.price < 0}
                className="px-6 py-3 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuPlus className="w-4 h-4" />
                Criar Serviço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






