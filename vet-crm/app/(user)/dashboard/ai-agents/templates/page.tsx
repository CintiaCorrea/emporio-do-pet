'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LuFileText,
  LuSearch,
  LuFilter,
  LuPlus,
  LuCopy,
  LuDownload,
  LuUpload,
  LuStar,
  LuMessageSquare,
  LuZap,
  LuBot,
  LuClock,
  LuX,
  LuPencil,
  LuTrash2,
  LuEye,
  LuCheck,
  LuSparkles,
  LuCode,
  LuGlobe,
  LuChevronRight
} from 'react-icons/lu';

// Tipos para Templates
type TemplateCategory = 'ATENDIMENTO' | 'VENDAS' | 'MARKETING' | 'SUPORTE' | 'AGENDAMENTO' | 'PERSONALIZADO';
type TemplateStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  status: TemplateStatus;
  content: string;
  variables: string[];
  usageCount: number;
  rating: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  author: string;
}

// Mock data para templates
const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Atendimento Veterinário',
    description: 'Template completo para atendimento inicial de clínica veterinária via WhatsApp',
    category: 'ATENDIMENTO',
    status: 'PUBLISHED',
    content: `Olá {nome_cliente}! 🐾

Bem-vindo(a) ao {nome_clinica}! Sou o assistente virtual e estou aqui para ajudar.

Como posso ajudá-lo(a) hoje?

1️⃣ Agendar consulta
2️⃣ Informações sobre serviços
3️⃣ Dúvidas sobre tratamentos
4️⃣ Falar com um atendente

Digite o número da opção desejada.`,
    variables: ['nome_cliente', 'nome_clinica'],
    usageCount: 156,
    rating: 4.8,
    isDefault: true,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-11-20T14:30:00Z',
    author: 'Sistema'
  },
  {
    id: '2',
    name: 'Lembrete de Consulta',
    description: 'Mensagem automática de lembrete de consulta agendada',
    category: 'AGENDAMENTO',
    status: 'PUBLISHED',
    content: `Olá {nome_tutor}! 📅

Este é um lembrete da consulta do(a) {nome_pet} agendada para:

📆 Data: {data_consulta}
⏰ Horário: {hora_consulta}
🏥 Local: {endereco_clinica}

Por favor, confirme sua presença respondendo:
✅ SIM - Confirmo presença
❌ NÃO - Preciso reagendar

Até breve! 🐕`,
    variables: ['nome_tutor', 'nome_pet', 'data_consulta', 'hora_consulta', 'endereco_clinica'],
    usageCount: 892,
    rating: 4.9,
    isDefault: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-11-28T09:15:00Z',
    author: 'Sistema'
  },
  {
    id: '3',
    name: 'Promoção de Produtos',
    description: 'Template para divulgação de promoções e ofertas especiais',
    category: 'MARKETING',
    status: 'PUBLISHED',
    content: `🎉 OFERTA ESPECIAL! 🎉

Olá {nome_cliente}!

Temos uma promoção imperdível para você e seu pet:

🔥 {nome_promocao}
💰 De R$ {preco_original} por apenas R$ {preco_promocional}
📅 Válido até: {data_validade}

Não perca essa oportunidade!

📲 Agende agora mesmo ou responda essa mensagem para mais informações.`,
    variables: ['nome_cliente', 'nome_promocao', 'preco_original', 'preco_promocional', 'data_validade'],
    usageCount: 234,
    rating: 4.5,
    isDefault: false,
    createdAt: '2024-02-20T14:00:00Z',
    updatedAt: '2024-11-25T16:45:00Z',
    author: 'Marketing'
  },
  {
    id: '4',
    name: 'Pós-Consulta',
    description: 'Mensagem de acompanhamento após atendimento',
    category: 'SUPORTE',
    status: 'PUBLISHED',
    content: `Olá {nome_tutor}! 💙

Esperamos que {nome_pet} esteja bem após a consulta de hoje.

Lembre-se das orientações:
{orientacoes}

Se tiver alguma dúvida ou {nome_pet} apresentar qualquer alteração, entre em contato conosco.

📞 Estamos à disposição!

Avalie nosso atendimento de 1 a 5 ⭐`,
    variables: ['nome_tutor', 'nome_pet', 'orientacoes'],
    usageCount: 445,
    rating: 4.7,
    isDefault: true,
    createdAt: '2024-03-05T11:00:00Z',
    updatedAt: '2024-11-30T10:20:00Z',
    author: 'Sistema'
  },
  {
    id: '5',
    name: 'Vendas - Cross-sell',
    description: 'Template para sugestão de produtos complementares',
    category: 'VENDAS',
    status: 'DRAFT',
    content: `Olá {nome_cliente}! 🛍️

Vimos que você adquiriu {produto_comprado} recentemente.

Que tal completar os cuidados do seu pet?

Sugerimos:
📦 {produto_sugerido_1} - R$ {preco_1}
📦 {produto_sugerido_2} - R$ {preco_2}

🎁 Na compra dos dois, ganhe {desconto}% de desconto!

Interessado? Responda com SIM para saber mais.`,
    variables: ['nome_cliente', 'produto_comprado', 'produto_sugerido_1', 'preco_1', 'produto_sugerido_2', 'preco_2', 'desconto'],
    usageCount: 0,
    rating: 0,
    isDefault: false,
    createdAt: '2024-11-28T15:00:00Z',
    updatedAt: '2024-11-28T15:00:00Z',
    author: 'Vendas'
  },
  {
    id: '6',
    name: 'Emergência',
    description: 'Template para triagem de casos emergenciais',
    category: 'ATENDIMENTO',
    status: 'PUBLISHED',
    content: `🚨 ATENDIMENTO DE EMERGÊNCIA 🚨

Entendo que {nome_pet} precisa de atendimento urgente.

Para agilizar o atendimento, informe:

1. Quais sintomas o pet está apresentando?
2. Há quanto tempo iniciaram?
3. O pet ingeriu algo suspeito?

📍 Nosso endereço: {endereco_clinica}
📞 Emergência: {telefone_emergencia}

Estamos prontos para recebê-lo!`,
    variables: ['nome_pet', 'endereco_clinica', 'telefone_emergencia'],
    usageCount: 78,
    rating: 4.9,
    isDefault: true,
    createdAt: '2024-04-10T09:00:00Z',
    updatedAt: '2024-12-01T08:00:00Z',
    author: 'Sistema'
  }
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setTemplates(mockTemplates);
      setLoading(false);
    };
    loadTemplates();
  }, []);

  // Filtros
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: templates.length,
    published: templates.filter(t => t.status === 'PUBLISHED').length,
    drafts: templates.filter(t => t.status === 'DRAFT').length,
    totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
    avgRating: templates.filter(t => t.rating > 0).length > 0
      ? (templates.filter(t => t.rating > 0).reduce((sum, t) => sum + t.rating, 0) / templates.filter(t => t.rating > 0).length).toFixed(1)
      : 0
  };

  const getCategoryColor = (category: TemplateCategory) => {
    switch (category) {
      case 'ATENDIMENTO': return 'bg-blue-50 text-blue-600';
      case 'VENDAS': return 'bg-emerald-50 text-emerald-600';
      case 'MARKETING': return 'bg-pink-50 text-pink-600';
      case 'SUPORTE': return 'bg-amber-50 text-amber-600';
      case 'AGENDAMENTO': return 'bg-violet-50 text-violet-600';
      case 'PERSONALIZADO': return 'bg-gray-100 text-gray-600';
    }
  };

  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case 'ATENDIMENTO': return <LuMessageSquare className="w-4 h-4" />;
      case 'VENDAS': return <LuSparkles className="w-4 h-4" />;
      case 'MARKETING': return <LuGlobe className="w-4 h-4" />;
      case 'SUPORTE': return <LuBot className="w-4 h-4" />;
      case 'AGENDAMENTO': return <LuClock className="w-4 h-4" />;
      case 'PERSONALIZADO': return <LuCode className="w-4 h-4" />;
    }
  };

  const getCategoryText = (category: TemplateCategory) => {
    switch (category) {
      case 'ATENDIMENTO': return 'Atendimento';
      case 'VENDAS': return 'Vendas';
      case 'MARKETING': return 'Marketing';
      case 'SUPORTE': return 'Suporte';
      case 'AGENDAMENTO': return 'Agendamento';
      case 'PERSONALIZADO': return 'Personalizado';
    }
  };

  const getStatusColor = (status: TemplateStatus) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-emerald-100 text-emerald-700';
      case 'DRAFT': return 'bg-amber-100 text-amber-700';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: TemplateStatus) => {
    switch (status) {
      case 'PUBLISHED': return 'Publicado';
      case 'DRAFT': return 'Rascunho';
      case 'ARCHIVED': return 'Arquivado';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const openTemplateDetails = (template: Template) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <LuStar
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
            
            {/* Breadcrumb e Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Link href="/dashboard/ai-agents/agents" className="hover:text-indigo-600 transition-colors">
                  AI Agents
                </Link>
                <LuChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">Templates</span>
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Templates
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Modelos prontos para configurar seus agentes de IA
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors">
                    <LuUpload className="w-5 h-5" />
                    Importar
                  </button>
                  <button
                    onClick={() => setIsNewTemplateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:shadow-xl"
                  >
                    <LuPlus className="w-5 h-5" />
                    Novo Template
                  </button>
                </div>
              </div>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50">
                    <LuFileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50">
                    <LuCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Publicados</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-amber-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50">
                    <LuPencil className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rascunhos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.drafts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-50">
                    <LuZap className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Usos Totais</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalUsage)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-amber-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50">
                    <LuStar className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avaliação</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgRating}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Busca */}
                <div className="flex-1 relative">
                  <LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Filtro Categoria */}
                <div className="flex items-center gap-2">
                  <LuFilter className="text-gray-400 w-5 h-5" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Todas Categorias</option>
                    <option value="ATENDIMENTO">Atendimento</option>
                    <option value="VENDAS">Vendas</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="SUPORTE">Suporte</option>
                    <option value="AGENDAMENTO">Agendamento</option>
                    <option value="PERSONALIZADO">Personalizado</option>
                  </select>
                </div>

                {/* Filtro Status */}
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TemplateStatus | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Todos Status</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Templates */}
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                <LuFileText className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum template encontrado</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'Tente ajustar os filtros para encontrar o template desejado.'
                    : 'Comece criando seu primeiro template clicando no botão acima.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => openTemplateDetails(template)}
                    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          template.status === 'PUBLISHED' ? 'bg-emerald-50' :
                          template.status === 'DRAFT' ? 'bg-amber-50' : 'bg-gray-50'
                        }`}>
                          <LuFileText className={`w-5 h-5 ${
                            template.status === 'PUBLISHED' ? 'text-emerald-600' :
                            template.status === 'DRAFT' ? 'text-amber-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {template.name}
                            </h3>
                            {template.isDefault && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-600 rounded">
                                PADRÃO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{getCategoryText(template.category)}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(template.status)}`}>
                        {getStatusText(template.status)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Preview do conteúdo */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 max-h-24 overflow-hidden">
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono line-clamp-4">
                        {template.content}
                      </pre>
                    </div>

                    {/* Variáveis */}
                    {template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {template.variables.slice(0, 3).map((variable) => (
                          <span
                            key={variable}
                            className="px-2 py-0.5 text-[10px] font-mono bg-indigo-50 text-indigo-600 rounded border border-indigo-100"
                          >
                            {`{${variable}}`}
                          </span>
                        ))}
                        {template.variables.length > 3 && (
                          <span className="px-2 py-0.5 text-[10px] text-gray-500">
                            +{template.variables.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <LuZap className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600">{formatNumber(template.usageCount)}</span>
                        </div>
                        {template.rating > 0 && (
                          <div className="flex items-center gap-1.5">
                            {renderStars(template.rating)}
                            <span className="text-sm text-gray-600">{template.rating}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(template.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      {/* Modal de Detalhes do Template */}
      {isModalOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    selectedTemplate.status === 'PUBLISHED' ? 'bg-emerald-50' :
                    selectedTemplate.status === 'DRAFT' ? 'bg-amber-50' : 'bg-gray-50'
                  }`}>
                    <LuFileText className={`w-6 h-6 ${
                      selectedTemplate.status === 'PUBLISHED' ? 'text-emerald-600' :
                      selectedTemplate.status === 'DRAFT' ? 'text-amber-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                      {selectedTemplate.isDefault && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-600 rounded">
                          PADRÃO
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${getCategoryColor(selectedTemplate.category)}`}>
                      {getCategoryIcon(selectedTemplate.category)}
                      {getCategoryText(selectedTemplate.category)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status e Ações */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(selectedTemplate.status)}`}>
                    {getStatusText(selectedTemplate.status)}
                  </span>
                  {selectedTemplate.rating > 0 && (
                    <div className="flex items-center gap-2">
                      {renderStars(selectedTemplate.rating)}
                      <span className="text-gray-600">({selectedTemplate.rating})</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors">
                    <LuCopy className="w-4 h-4" />
                    Duplicar
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors">
                    <LuDownload className="w-4 h-4" />
                    Exportar
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors">
                    <LuPencil className="w-4 h-4" />
                    Editar
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Descrição</h3>
                <p className="text-gray-900">{selectedTemplate.description}</p>
              </div>

              {/* Conteúdo */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Conteúdo do Template</h3>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {selectedTemplate.content}
                  </pre>
                </div>
              </div>

              {/* Variáveis */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Variáveis Disponíveis</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-3 py-1.5 text-sm font-mono bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100"
                    >
                      {`{${variable}}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* Métricas */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Métricas de Uso</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(selectedTemplate.usageCount)}</p>
                    <p className="text-sm text-gray-500">Usos Totais</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{selectedTemplate.rating || '-'}</p>
                    <p className="text-sm text-gray-500">Avaliação</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{selectedTemplate.variables.length}</p>
                    <p className="text-sm text-gray-500">Variáveis</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{selectedTemplate.author}</p>
                    <p className="text-sm text-gray-500">Autor</p>
                  </div>
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Criado em</h3>
                  <p className="text-gray-900">{formatDate(selectedTemplate.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Atualizado em</h3>
                  <p className="text-gray-900">{formatDate(selectedTemplate.updatedAt)}</p>
                </div>
              </div>

              {/* Botão de usar */}
              <div className="pt-4 border-t border-gray-100">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all">
                  <LuBot className="w-5 h-5" />
                  Usar em Novo Agente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Template */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Criar Novo Template</h2>
                <button
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Template</label>
                <input
                  type="text"
                  placeholder="Ex: Boas-vindas Personalizado"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input
                  type="text"
                  placeholder="Descreva o propósito do template..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer">
                  <option value="">Selecione uma categoria</option>
                  <option value="ATENDIMENTO">Atendimento</option>
                  <option value="VENDAS">Vendas</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="SUPORTE">Suporte</option>
                  <option value="AGENDAMENTO">Agendamento</option>
                  <option value="PERSONALIZADO">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo do Template</label>
                <textarea
                  placeholder="Digite o conteúdo do template...&#10;Use {variavel} para criar campos dinâmicos."
                  rows={8}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Dica: Use {'{'}variavel{'}'} para criar campos que serão preenchidos automaticamente.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors border border-gray-200">
                  Salvar Rascunho
                </button>
                <button className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all">
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
