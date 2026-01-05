'use client';

import { useState, useEffect } from 'react';
import { LuPlus, LuStar, LuTrash2, LuUser, LuMapPin, LuFolder, LuSave, LuX, LuArrowLeft, LuMail } from 'react-icons/lu';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';

interface Contact {
  id: string;
  type: 'MOBILE' | 'PHONE' | 'BUSINESS';
  number: string;
  isWhatsApp: boolean;
  observations?: string;
  isPrimary: boolean;
}

interface TutorFormData {
  // Informações Básicas
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY';
  name: string;
  email?: string; // ✅ NOVO CAMPO ADICIONADO
  nationality: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  // Documentos
  cpf?: string;
  rg?: string;
  birthDate?: string;
  profession?: string;
  // Como nos conheceu
  howFoundUs?: string;
  // Preferências de Contato
  acceptsEmail: boolean;
  acceptsWhatsApp: boolean;
  acceptsSMS: boolean;
  acceptsSmsCampaign: boolean;
  // Endereço
  cep?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  referencePoint?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  // Extras
  observations?: string;
  tags: string[];
  formDate?: string;
  inclusionDate?: string;
  // Contatos (serão criados separadamente)
  contacts: Contact[];
}

export default function TutorRegistrationPage() {
  const [activeTab, setActiveTab] = useState<'geral' | 'endereco' | 'extras'>('geral');
  const [contacts, setContacts] = useState<Contact[]>([
    { 
      id: '1', 
      type: 'MOBILE', 
      number: '', 
      isWhatsApp: false, 
      observations: '', 
      isPrimary: true 
    }
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<TutorFormData>({
    type: 'INDIVIDUAL',
    name: '',
    email: '', // ✅ NOVO CAMPO INICIALIZADO
    nationality: 'Brasileira',
    gender: undefined,
    cpf: '',
    rg: '',
    birthDate: '',
    profession: '',
    howFoundUs: '',
    acceptsEmail: true,
    acceptsWhatsApp: true,
    acceptsSMS: true,
    acceptsSmsCampaign: false,
    cep: '',
    address: '',
    addressNumber: '',
    complement: '',
    referencePoint: '',
    neighborhood: '',
    city: '',
    state: '',
    observations: '',
    tags: [],
    formDate: '',
    inclusionDate: '',
    contacts: []
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const addContact = () => {
    const newContact: Contact = {
      id: Date.now().toString(),
      type: 'MOBILE',
      number: '',
      isWhatsApp: false,
      observations: '',
      isPrimary: contacts.length === 0 // Primeiro contato é principal por padrão
    };
    setContacts([...contacts, newContact]);
  };

  const removeContact = (id: string) => {
    if (contacts.length === 1) return; // Não remove o último contato
    
    const updatedContacts = contacts.filter(c => c.id !== id);
    
    // Se removemos o contato principal, definir o primeiro como principal
    const removedWasPrimary = contacts.find(c => c.id === id)?.isPrimary;
    if (removedWasPrimary && updatedContacts.length > 0) {
      updatedContacts[0].isPrimary = true;
    }
    
    setContacts(updatedContacts);
  };

  const setPrimaryContact = (id: string) => {
    setContacts(contacts.map(contact => ({
      ...contact,
      isPrimary: contact.id === id
    })));
  };

  const updateContact = (id: string, field: keyof Contact, value: any) => {
    setContacts(contacts.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };

  const handleInputChange = (field: keyof TutorFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validações básicas
      if (!formData.name.trim()) {
        throw new Error('Nome é obrigatório');
      }

      // Validar contatos
      const validContacts = contacts.filter(contact => contact.number.trim());
      if (validContacts.length === 0) {
        throw new Error('Pelo menos um contato com número é necessário');
      }

      // Preparar dados para API
      const payload = {
        ...formData,
        contacts: validContacts,
        // Garantir que arrays vazios sejam enviados
        tags: formData.tags || [],
        // Converter datas para o formato ISO
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
        formDate: formData.formDate ? new Date(formData.formDate).toISOString() : undefined,
        inclusionDate: formData.inclusionDate ? new Date(formData.inclusionDate).toISOString() : undefined,
      };

      const response = await fetch('/api/tutors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar tutor');
      }

      setSuccess(true);
      
      // Redirecionar após sucesso
      setTimeout(() => {
        window.location.href = '/dashboard/erp/contatos';
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao criar tutor:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Link 
                  href="/dashboard/erp/contatos"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-300"
                >
                  <LuArrowLeft className="w-5 h-5" />
                  <span>Voltar para Contatos</span>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Cadastro de Tutor
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Preencha as informações do tutor para cadastrar no sistema
                  </p>
                </div>
              </div>
            </div>

            {/* Alert Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center justify-between">
                <span>{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-lg"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700">
                ✅ Tutor criado com sucesso! Redirecionando...
              </div>
            )}

            {/* Main Card */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('geral')}
                    className={`group px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'geral'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuUser className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'geral' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Geral</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('endereco')}
                    className={`group px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'endereco'
                        ? 'border-b-2 border-green-500 text-green-600 bg-green-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuMapPin className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'endereco' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Endereço</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('extras')}
                    className={`group px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'extras'
                        ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuFolder className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'extras' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Extras</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                {/* Tab Geral */}
                {activeTab === 'geral' && (
                  <div className="space-y-8">
                    {/* Informações Básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <LuUser className="w-4 h-4 mr-2 text-blue-500" />
                          Tipo
                        </label>
                        <select 
                          value={formData.type}
                          onChange={(e) => handleInputChange('type', e.target.value as 'INDIVIDUAL' | 'LEGAL_ENTITY')}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        >
                          <option value="INDIVIDUAL">Pessoa Física</option>
                          <option value="LEGAL_ENTITY">Pessoa Jurídica</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <LuUser className="w-4 h-4 mr-2 text-blue-500" />
                          Nome completo *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Nome completo do tutor"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <LuUser className="w-4 h-4 mr-2 text-blue-500" />
                          Nacionalidade
                        </label>
                        <select 
                          value={formData.nationality}
                          onChange={(e) => handleInputChange('nationality', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        >
                          <option value="Brasileira">Brasileira</option>
                          <option value="Estrangeira">Estrangeira</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <LuUser className="w-4 h-4 mr-2 text-blue-500" />
                          Sexo
                        </label>
                        <select 
                          value={formData.gender || ''}
                          onChange={(e) => handleInputChange('gender', e.target.value || undefined)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        >
                          <option value="">Selecione...</option>
                          <option value="MALE">Masculino</option>
                          <option value="FEMALE">Feminino</option>
                          <option value="OTHER">Outro</option>
                        </select>
                      </div>
                    </div>

                    {/* ✅ NOVA SEÇÃO: Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <LuMail className="w-4 h-4 mr-2 text-blue-500" />
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="email@exemplo.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          E-mail principal para comunicação
                        </p>
                      </div>
                    </div>

                    {/* Documentos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          CPF
                        </label>
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          value={formData.cpf}
                          onChange={(e) => handleInputChange('cpf', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          RG
                        </label>
                        <input
                          type="text"
                          value={formData.rg}
                          onChange={(e) => handleInputChange('rg', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Data de Nascimento
                        </label>
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Informações Adicionais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Como nos conheceu?
                        </label>
                        <input
                          type="text"
                          value={formData.howFoundUs}
                          onChange={(e) => handleInputChange('howFoundUs', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Indicação, Google, etc."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Profissão
                        </label>
                        <input
                          type="text"
                          value={formData.profession}
                          onChange={(e) => handleInputChange('profession', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Profissão do tutor"
                        />
                      </div>
                    </div>

                    {/* Preferências de Contato */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {[
                        { label: 'Aceita Email?', field: 'acceptsEmail', color: 'blue' },
                        { label: 'Aceita WhatsApp?', field: 'acceptsWhatsApp', color: 'green' },
                        { label: 'Aceita SMS?', field: 'acceptsSMS', color: 'purple' },
                        { label: 'Aceita Campanha SMS?', field: 'acceptsSmsCampaign', color: 'amber' }
                      ].map((item, index) => (
                        <div key={index} className="space-y-2">
                          <label className="flex items-center text-sm font-semibold text-gray-700">
                            {item.label}
                          </label>
                          <select 
                            value={formData[item.field as keyof TutorFormData] ? 'true' : 'false'}
                            onChange={(e) => handleInputChange(item.field as keyof TutorFormData, e.target.value === 'true')}
                            className={`w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-${item.color}-500/50 focus:border-${item.color}-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm`}
                          >
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Contatos */}
                    <div className="border-t border-white/20 pt-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Contatos *</h3>
                        <button
                          type="button"
                          onClick={addContact}
                          className="group flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-semibold bg-blue-50/50 rounded-2xl hover:bg-blue-100/50 transition-all duration-300 hover:scale-105"
                        >
                          <LuPlus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                          Adicionar Contato
                        </button>
                      </div>

                      {contacts.map((contact) => (
                        <div key={contact.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-4 bg-gray-50/50 rounded-2xl hover:bg-gray-100/50 transition-all duration-300">
                          <div className="md:col-span-2 space-y-2">
                            <select 
                              value={contact.type}
                              onChange={(e) => updateContact(contact.id, 'type', e.target.value as 'MOBILE' | 'PHONE' | 'BUSINESS')}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                            >
                              <option value="MOBILE">Celular</option>
                              <option value="PHONE">Telefone</option>
                              <option value="BUSINESS">Comercial</option>
                            </select>
                          </div>

                          <div className="md:col-span-3 space-y-2">
                            <input
                              type="text"
                              placeholder="Número *"
                              value={contact.number}
                              onChange={(e) => updateContact(contact.id, 'number', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <select 
                              value={contact.isWhatsApp ? 'true' : 'false'}
                              onChange={(e) => updateContact(contact.id, 'isWhatsApp', e.target.value === 'true')}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300"
                            >
                              <option value="true">Tem WhatsApp</option>
                              <option value="false">Sem WhatsApp</option>
                            </select>
                          </div>

                          <div className="md:col-span-4 space-y-2">
                            <input
                              type="text"
                              placeholder="Observações"
                              value={contact.observations}
                              onChange={(e) => updateContact(contact.id, 'observations', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all duration-300"
                            />
                          </div>

                          <div className="md:col-span-1 flex gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => setPrimaryContact(contact.id)}
                              className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
                                contact.isPrimary 
                                  ? 'text-amber-500 bg-amber-50' 
                                  : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                              }`}
                            >
                              <LuStar className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeContact(contact.id)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                              disabled={contacts.length === 1}
                            >
                              <LuTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Endereço */}
                {activeTab === 'endereco' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <LuMapPin className="w-4 h-4 mr-2 text-blue-500" />
                          CEP
                        </label>
                        <input
                          type="text"
                          placeholder="00000-000"
                          value={formData.cep}
                          onChange={(e) => handleInputChange('cep', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="md:col-span-8 space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Número
                        </label>
                        <input
                          type="text"
                          value={formData.addressNumber}
                          onChange={(e) => handleInputChange('addressNumber', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Complemento
                        </label>
                        <input
                          type="text"
                          value={formData.complement}
                          onChange={(e) => handleInputChange('complement', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Ponto de referência
                        </label>
                        <input
                          type="text"
                          value={formData.referencePoint}
                          onChange={(e) => handleInputChange('referencePoint', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={formData.neighborhood}
                          onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Estado
                        </label>
                        <select 
                          value={formData.state || ''}
                          onChange={(e) => handleInputChange('state', e.target.value || undefined)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        >
                          <option value="">Selecione...</option>
                          {/* Estados brasileiros aqui */}
                          <option value="SP">São Paulo</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="MG">Minas Gerais</option>
                          {/* Adicionar outros estados */}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Extras */}
                {activeTab === 'extras' && (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Observações
                      </label>
                      <textarea
                        rows={6}
                        value={formData.observations}
                        onChange={(e) => handleInputChange('observations', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
                        placeholder="Observações adicionais sobre o tutor..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Marcações (Tags)
                      </label>
                      <input
                        type="text"
                        placeholder="Digite o texto e pressione enter para adicionar tags"
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        // Implementar lógica de tags posteriormente
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Data da Ficha
                        </label>
                        <input
                          type="date"
                          value={formData.formDate}
                          onChange={(e) => handleInputChange('formDate', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          Data de Inclusão
                        </label>
                        <input
                          type="date"
                          value={formData.inclusionDate}
                          onChange={(e) => handleInputChange('inclusionDate', e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-4 mt-8 pt-8 border-t border-white/20">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 flex items-center space-x-2 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="relative z-10">Salvando...</span>
                      </div>
                    ) : (
                      <>
                        <LuSave className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Salvar Tutor</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
