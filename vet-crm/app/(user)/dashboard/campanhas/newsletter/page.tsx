'use client';

import { useState, useEffect } from 'react';
import { LuPlus, LuSearch, LuPencil, LuTrash LuDownload, LuEye LuSave LuCalendar } from 'react-icons/lu';
import Link from 'next/link';

interface Newsletter {
  id: string;
  title: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed' | 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  recipientCount: number;
  sentCount?: number;
  openCount?: number;
  clickCount?: number;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  recipientType: 'all' | 'client' | 'lead' | 'ALL' | 'CLIENT' | 'LEAD' | 'TUTOR';
  recipients?: any[];
  newsletterLogs?: any[];
}

export default function NewslettersListPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'sent' | 'failed'>('all');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'lead' | 'tutor'>('all');
  
  // Estados para modais
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'delete' | 'success' | 'error'>('delete');

  // Buscar newsletters da API
  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/newsletters');
        
        if (!response.ok) {
          let message = `Erro ${response.status}: ${response.statusText}`;
          try {
            const errData = await response.json();
            message =
              (errData &&
                (errData.error ||
                  (Array.isArray(errData.message) ? errData.message.join(', ') : errData.message) ||
                  errData.message)) ||
              message;
          } catch {
            // ignore parse errors
          }
          throw new Error(message);
        }
        
        const data = await response.json();
        
        // CORREÇÃO: A API retorna { newsletters: [...] }
        const newslettersArray = data.newsletters || [];
        
        // Garantir que newslettersArray é um array
        if (!Array.isArray(newslettersArray)) {
          console.warn('Dados recebidos não são um array:', data);
          setNewsletters([]);
          return;
        }

        // Processar os dados para calcular métricas
        const processedNewsletters = newslettersArray.map((newsletter: any) => {
          const recipientCount = newsletter.recipients?.length || 0;
          const newsletterLog = newsletter.newsletterLogs?.[0];
          const sentCount = newsletterLog?.details?.successful || 0;
          
          return {
            ...newsletter,
            recipientCount,
            sentCount,
            openCount: 0, // Adicione lógica para calcular aberturas se disponível
            clickCount: 0, // Adicione lógica para calcular cliques se disponível
          };
        });
        
        setNewsletters(processedNewsletters);
      } catch (error) {
        console.error('Erro ao buscar newsletters:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido ao carregar newsletters');
        setNewsletters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletters();
  }, []);

  // Filtrar newsletters - com validação adicional
  const filteredNewsletters = Array.isArray(newsletters) ? newsletters.filter(newsletter => {
    // Verificar se newsletter tem as propriedades necessárias
    if (!newsletter || typeof newsletter !== 'object') return false;
    
    const title = newsletter.title || '';
    const subject = newsletter.subject || '';
    const status = newsletter.status || 'draft';
    const recipientType = newsletter.recipientType || 'all';
    
    // Converter para lowercase para comparação
    const statusLower = status.toLowerCase();
    const recipientTypeLower = recipientType.toLowerCase();
    const filterStatusLower = filterStatus.toLowerCase();
    const filterTypeLower = filterType.toLowerCase();
    
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || statusLower === filterStatusLower;
    const matchesType = filterType === 'all' || recipientTypeLower === filterTypeLower;
    
    return matchesSearch && matchesStatus && matchesType;
  }) : [];

  // Função para abrir modal de confirmação de exclusão
  const openDeleteModal = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setModalType('delete');
    setModalMessage(`Você está prestes a excluir o email "${newsletter.title}". Esta ação é irreversível e não pode ser desfeita.`);
    setShowDeleteModal(true);
  };

  // Função para fechar todos os modais
  const closeModals = () => {
    setShowDeleteModal(false);
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setSelectedNewsletter(null);
    setModalMessage('');
  };

  // Função principal de exclusão
  const handleDeleteNewsletter = async () => {
    if (!selectedNewsletter) return;

    try {
      const response = await fetch(`/api/newsletters/${selectedNewsletter.id}`, {
        method: 'DELETE'});

      // Verificar se a resposta é JSON válida
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.warn('Resposta não é JSON:', text);
        throw new Error('Resposta inválida do servidor');
      }

      if (response.ok) {
        setNewsletters(prevNewsletters => prevNewsletters.filter(newsletter => newsletter.id !== selectedNewsletter.id));
        setModalType('success');
        setModalMessage('Email excluído com sucesso! A lista foi atualizada.');
        setShowDeleteModal(false);
        setShowSuccessModal(true);
      } else {
        setModalType('error');
        setModalMessage(result.error || 'Erro ao excluir email');
        setShowDeleteModal(false);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Erro ao excluir newsletter:', error);
      setModalType('error');
      setModalMessage(error instanceof Error ? `Erro ao excluir email: ${error.message}` : 'Erro ao excluir email. Tente novamente.');
      setShowDeleteModal(false);
      setShowErrorModal(true);
    }
  };

  const handleDuplicateNewsletter = async (id: string) => {
    try {
      const response = await fetch(`/api/newsletters/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'}});

      // Verificar se a resposta é JSON válida
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.warn('Resposta não é JSON:', text);
        throw new Error('Resposta inválida do servidor');
      }

      if (response.ok) {
        // Adicionar a newsletter duplicada no início da lista
        const duplicatedWithMetrics = {
          ...result,
          recipientCount: 0,
          sentCount: 0,
          openCount: 0,
          clickCount: 0};
        setNewsletters(prev => [duplicatedWithMetrics, ...prev]);
        setModalType('success');
        setModalMessage('Email duplicado com sucesso! Uma nova cópia foi adicionada à lista.');
        setShowSuccessModal(true);
      } else {
        setModalType('error');
        setModalMessage(result.error || 'Erro ao duplicar email');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Erro ao duplicar newsletter:', error);
      setModalType('error');
      setModalMessage(error instanceof Error ? `Erro ao duplicar email: ${error.message}` : 'Erro ao duplicar email. Tente novamente.');
      setShowErrorModal(true);
    }
  };

  // Componente de Modal
  const Modal = () => {
    if (!showDeleteModal && !showSuccessModal && !showErrorModal) return null;

    const getModalConfig = () => {
      switch (modalType) {
        case 'delete':
          return {
            icon: () => <span style={{fontSize:"14px"}}>△</span>,
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            title: 'Confirmar Exclusão',
            buttons: (
              <>
                <button
                  onClick={closeModals}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteNewsletter}
                  className="px-6 py-3 text-white bg-gradient-to-r from-red-600 to-red-700 rounded-2xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium shadow-lg shadow-red-500/25"
                >
                  Sim, Excluir
                </button>
              </>
            )
          };
        case 'success':
          return {
            icon: () => <span style={{fontSize:"14px"}}>✓</span>,
            iconColor: 'text-green-500',
            bgColor: 'bg-green-50',
            title: 'Sucesso!',
            buttons: (
              <button
                onClick={closeModals}
                className="px-6 py-3 text-white bg-gradient-to-r from-green-600 to-green-700 rounded-2xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium shadow-lg shadow-green-500/25"
              >
                Continuar
              </button>
            )
          };
        case 'error':
          return {
            icon: () => <span style={{fontSize:"14px"}}>△</span>,
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            title: 'Ops! Algo deu errado',
            buttons: (
              <button
                onClick={closeModals}
                className="px-6 py-3 text-white bg-gradient-to-r from-red-600 to-red-700 rounded-2xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium shadow-lg shadow-red-500/25"
              >
                Entendi
              </button>
            )
          };
        default:
          return {
            icon: () => <span style={{fontSize:"14px"}}>✓</span>,
            iconColor: 'text-gray-500',
            bgColor: 'bg-gray-50',
            title: 'Atenção',
            buttons: null
          };
      }
    };

    const config = getModalConfig();
    const IconComponent = config.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
          {/* Header do Modal */}
          <div className={`p-6 rounded-t-3xl ${config.bgColor}`}>
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-2xl bg-white/80 backdrop-blur-sm`}>
                <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {config.title}
              </h3>
            </div>
          </div>

          {/* Corpo do Modal */}
          <div className="p-6">
            <p className="text-gray-600 mb-6 leading-relaxed">
              {modalMessage}
            </p>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              {config.buttons}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'draft':
        return 'Rascunho';
      case 'scheduled':
        return 'Agendada';
      case 'sent':
        return 'Enviada';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'draft':
        return LuSave;
      case 'scheduled':
        return;
      case 'sent':
        return;
      case 'failed':
        return LuTrash;
      default:
        return;
    }
  };

  const getRecipientTypeText = (type: string) => {
    const typeLower = type.toLowerCase();
    switch (typeLower) {
      case 'all':
        return 'Todos os Clientes';
      case 'client':
        return 'Clientes';
      case 'lead':
        return 'Leads';
      case 'tutor':
        return 'Tutores';
      default:
        return type;
    }
  };

  const getRecipientTypeIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    switch (typeLower) {
      case 'all':
        return;
      case 'client':
        return;
      case 'lead':
        return;
      case 'tutor':
        return;
      default:
        return;
    }
  };

  // Calcular estatísticas
  const stats = {
    total: newsletters.length,
    drafts: newsletters.filter(n => n.status.toLowerCase() === 'draft').length,
    scheduled: newsletters.filter(n => n.status.toLowerCase() === 'scheduled').length,
    sent: newsletters.filter(n => n.status.toLowerCase() === 'sent').length,
    failed: newsletters.filter(n => n.status.toLowerCase() === 'failed').length
  };

  // Calcular métricas de engajamento
  const engagementMetrics = {
    totalRecipients: newsletters.reduce((sum, n) => sum + (n.recipientCount || 0), 0),
    totalSent: newsletters.reduce((sum, n) => sum + (n.sentCount || 0), 0),
    totalOpens: newsletters.reduce((sum, n) => sum + (n.openCount || 0), 0),
    totalClicks: newsletters.reduce((sum, n) => sum + (n.clickCount || 0), 0)
  };

  const openRate = engagementMetrics.totalRecipients > 0 
    ? ((engagementMetrics.totalOpens / engagementMetrics.totalRecipients) * 100).toFixed(1)
    : '0.0';

  const clickRate = engagementMetrics.totalRecipients > 0 
    ? ((engagementMetrics.totalClicks / engagementMetrics.totalRecipients) * 100).toFixed(1)
    : '0.0';

  // Estado de renderização condicional
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando newsletters...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-12 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Erro ao carregar newsletters</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (!Array.isArray(newsletters) || newsletters.length === 0) {
      return (
        <div className="p-12 text-center">
          <span style={{fontSize:"14px"}}>✉</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Nenhuma newsletter criada
          </h3>
          <p className="mt-2 text-gray-600">
            Comece criando sua primeira newsletter
          </p>
          <Link
            href="/dashboard/campanhas/email/novo"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            <LuPlus className="w-5 h-5" />
            <span className="font-semibold">Criar Primeiro Email</span>
          </Link>
        </div>
      );
    }

    if (filteredNewsletters.length === 0) {
      return (
        <div className="p-12 text-center">
          <span style={{fontSize:"14px"}}>✉</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Nenhuma newsletter encontrada
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Destinatários</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Engajamento</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Agendamento</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredNewsletters.map((newsletter) => {
              const StatusIcon = getStatusIcon(newsletter.status);
              const RecipientIcon = getRecipientTypeIcon(newsletter.recipientType);
              const statusLower = newsletter.status.toLowerCase();
              const openRate = newsletter.recipientCount > 0 && newsletter.openCount 
                ? ((newsletter.openCount / newsletter.recipientCount) * 100).toFixed(1)
                : '0.0';
              const clickRate = newsletter.recipientCount > 0 && newsletter.clickCount 
                ? ((newsletter.clickCount / newsletter.recipientCount) * 100).toFixed(1)
                : '0.0';

              return (
                <tr key={newsletter.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <span style={{fontSize:"14px"}}>✉</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{newsletter.title || 'Sem título'}</div>
                        <div className="text-sm text-gray-500">{newsletter.subject}</div>
                        <div className="flex items-center mt-1 text-xs text-gray-400">
                          <RecipientIcon className="w-3 h-3 mr-1" />
                          {getRecipientTypeText(newsletter.recipientType)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{newsletter.recipientCount.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">destinatários</div>
                    {newsletter.sentCount !== undefined && newsletter.sentCount > 0 && (
                      <div className="text-xs text-gray-400">
                        {newsletter.sentCount} enviados
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`w-4 h-4 ${
                        statusLower === 'draft' ? 'text-gray-500' :
                        statusLower === 'scheduled' ? 'text-blue-500' :
                        statusLower === 'sent' ? 'text-green-500' : 'text-red-500'
                      }`} />
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(newsletter.status)}`}>
                        {getStatusText(newsletter.status)}
                      </span>
                    </div>
                    {newsletter.sentAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(newsletter.sentAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {statusLower === 'sent' ? (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          {openRate}% aberturas
                        </div>
                        <div className="text-sm text-gray-500">
                          {clickRate}% cliques
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {newsletter.scheduledFor ? (
                      <div className="flex items-center space-x-2">
                        <LuCalendar className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-900">{formatDate(newsletter.scheduledFor)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/dashboard/campanhas/newsletter/${newsletter.id}`}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                        title="Visualizar"
                      >
                        <LuEye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/dashboard/campanhas/newsletter/${newsletter.id}/editar`}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                        title="Editar"
                      >
                        <LuPencil className="w-4 h-4" />
                      </Link>
                      {statusLower === 'draft' && (
                        <button
                          onClick={() => handleDuplicateNewsletter(newsletter.id)}
                          className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all duration-300 hover:scale-110"
                          title="Duplicar"
                        >
                          <span style={{fontSize:"14px"}}>⎘</span>
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(newsletter)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                        title="Excluir"
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
      {/* Modal */}
      <Modal />

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Email
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie todas as campanhas de email do sistema
                  </p>
                </div>
                <Link
                  href="/dashboard/campanhas/email/novo"
                  className="group mt-4 sm:mt-0 flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                >
                  <LuPlus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="font-semibold">Novo Email</span>
                </Link>
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              {[
                { label: "Total", value: stats.total, color: "blue", icon: () => <span style={{fontSize:"14px"}}>✉</span> },
                { label: "Rascunhos", value: stats.drafts, color: "gray", icon: LuSave },
                { label: "Agendadas", value: stats.scheduled, color: "purple", icon: () => <span style={{fontSize:"14px"}}>⏱</span> },
                { label: "Enviadas", value: stats.sent, color: "green", icon: () => <span style={{fontSize:"14px"}}>➤</span> },
                { label: "Com Falha", value: stats.failed, color: "red", icon: LuTrash }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-2">{stat.label}</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-2xl ${
                      stat.color === 'blue' ? 'bg-blue-50' :
                      stat.color === 'gray' ? 'bg-gray-50' :
                      stat.color === 'purple' ? 'bg-purple-50' :
                      stat.color === 'green' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <stat.icon className={`w-6 h-6 ${
                        stat.color === 'blue' ? 'text-blue-600' :
                        stat.color === 'gray' ? 'text-gray-600' :
                        stat.color === 'purple' ? 'text-purple-600' :
                        stat.color === 'green' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Métricas de Engajamento */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total de Destinatários", value: engagementMetrics.totalRecipients.toLocaleString(), color: "blue", icon: () => <span style={{fontSize:"14px"}}>👥</span> },
                { label: "Taxa de Abertura", value: `${openRate}%`, color: "green", icon: LuEye },
                { label: "Taxa de Clique", value: `${clickRate}%`, color: "purple", icon: () => <span style={{fontSize:"14px"}}>➤</span> },
                { label: "Emails Enviados", value: engagementMetrics.totalSent.toLocaleString(), color: "orange", icon: () => <span style={{fontSize:"14px"}}>✉</span> }
              ].map((metric, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-2">{metric.label}</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {metric.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-2xl ${
                      metric.color === 'blue' ? 'bg-blue-50' :
                      metric.color === 'green' ? 'bg-green-50' :
                      metric.color === 'purple' ? 'bg-purple-50' : 'bg-orange-50'
                    }`}>
                      <metric.icon className={`w-6 h-6 ${
                        metric.color === 'blue' ? 'text-blue-600' :
                        metric.color === 'green' ? 'text-green-600' :
                        metric.color === 'purple' ? 'text-purple-600' : 'text-orange-600'
                      }`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filtros e Busca - Só mostra se não estiver em estado de erro */}
            {!error && newsletters.length > 0 && (
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Barra de Pesquisa */}
                  <div className="md:col-span-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por título ou assunto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>

                  {/* Filtro de Status */}
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <span style={{fontSize:"14px"}}>⌕</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="all">Todos os status</option>
                        <option value="draft">Rascunhos</option>
                        <option value="scheduled">Agendadas</option>
                        <option value="sent">Enviadas</option>
                        <option value="failed">Com falha</option>
                      </select>
                    </div>
                  </div>

                  {/* Filtro de Tipo */}
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <span style={{fontSize:"14px"}}>👥</span>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="all">Todos os tipos</option>
                        <option value="all">Todos os clientes</option>
                        <option value="client">Clientes</option>
                        <option value="lead">Leads</option>
                        <option value="tutor">Tutores</option>
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

            {/* Tabela de Emails */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
              {renderContent()}

              {/* Paginação */}
              {!loading && !error && Array.isArray(newsletters) && newsletters.length > 0 && filteredNewsletters.length > 0 && (
                <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-white to-white/95">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Mostrando <span className="font-semibold">{filteredNewsletters.length}</span> de{' '}
                      <span className="font-semibold">{newsletters.length}</span> newsletters
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                        Anterior
                      </button>
                      <button className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
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
  );
}
