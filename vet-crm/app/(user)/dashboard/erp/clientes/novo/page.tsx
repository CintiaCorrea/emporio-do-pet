// ⚠️  REFACTOR EM PROGRESSO:
// Cliente unificado no Tutor (Tutor.classificacao = 'Cliente') em a672640.
// URL /api/clients/* mantida temporariamente como compat layer apontando pra /tutors no backend.
// Alguns campos podem não bater 100% com o backend até validação contra dados reais.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  LuPhone, 
  LuUser, 
  LuArrowLeft
} from "react-icons/lu";

interface Tutor {
  id: string;
  name: string;
  cpf: string;
}

interface ContactFormData {
  type: 'MOBILE' | 'PHONE' | 'BUSINESS';
  number: string;
  isWhatsApp: boolean;
  observations? (() => null) : string;
  isPrimary: boolean;
  tutorId: string;
}

export default function NewClientPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(true);

  const [formData, setFormData] = useState<ContactFormData>({
    type: 'MOBILE',
    number: '',
    isWhatsApp: false,
    observations: '',
    isPrimary: false,
    tutorId: ''
  });

  // Buscar tutores para o select
  const fetchTutors = async () => {
    try {
      setLoadingTutors(true);
      const response = await fetch('/api/tutors?limit=100');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar tutores');
      }
      
      const data = await response.json();
      setTutors(data.tutors || []);
    } catch (err) {
      setError('Erro ao carregar lista de tutores');
      console.error('Erro ao buscar tutores:', err);
    } finally {
      setLoadingTutors(false);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validações básicas
      if (!formData.number.trim()) {
        throw new Error('Número do contato é obrigatório');
      }

      if (!formData.tutorId) {
        throw new Error('Selecione um tutor');
      }

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(formData)});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar cliente');
      }

      setSuccess(true);
      // Reset form
      setFormData({
        type: 'MOBILE',
        number: '',
        isWhatsApp: false,
        observations: '',
        isPrimary: false,
        tutorId: ''
      });

      // Redirecionar após sucesso
      setTimeout(() => {
        window.location.href = '/dashboard/erp/clientes';
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao criar cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ContactFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Se marcar como primário, garantir que é WhatsApp (prática comum)
    if (field === 'isPrimary' && value === true) {
      setFormData(prev => ({
        ...prev,
        isWhatsApp: true
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Link 
                  href="/dashboard/erp/clientes"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-300"
                >
                  <LuArrowLeft className="w-5 h-5" />
                  <span>Voltar para Clientes</span>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Novo Cliente
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Adicione um novo cliente ao sistema
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
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700">
                ✅ Cliente criado com sucesso! Redirecionando...
              </div>
            )}

            {/* Form */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tutor Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tutor *
                  </label>
                  <select
                    value={formData.tutorId}
                    onChange={(e) => handleInputChange('tutorId', e.target.value)}
                    required
                    disabled={loadingTutors}
                    className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="">Selecione um tutor</option>
                    {tutors.map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.name} {tutor.cpf ? `- ${tutor.cpf}` : ''}
                      </option>
                    ))}
                  </select>
                  {loadingTutors && (
                    <p className="text-sm text-gray-500 mt-2">Carregando tutores...</p>
                  )}
                </div>

                {/* Contact Type and Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Tipo de Contato *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    >
                      <option value="MOBILE">Celular</option>
                      <option value="PHONE">Telefone Fixo</option>
                      <option value="BUSINESS">Telefone Comercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Número *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: (11) 99999-9999"
                      value={formData.number}
                      onChange={(e) => handleInputChange('number', e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isWhatsApp"
                      checked={formData.isWhatsApp}
                      onChange={(e) => handleInputChange('isWhatsApp', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="isWhatsApp" className="text-sm font-medium text-gray-700">
                      Tem WhatsApp
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onChange={(e) => handleInputChange('isPrimary', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="isPrimary" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span style={{fontSize:"14px"}}>⭐</span>
                      Contato Principal
                    </label>
                  </div>
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Observações
                  </label>
                  <textarea
                    placeholder="Observações adicionais sobre este cliente..."
                    value={formData.observations}
                    onChange={(e) => handleInputChange('observations', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                  <Link
                    href="/dashboard/erp/clientes"
                    className="flex-1 px-6 py-3 text-center text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Criando...</span>
                      </div>
                    ) : (
                      'Criar Cliente'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Dicas:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Clientes marcados como <strong>Principal</strong> aparecem destacados</li>
                <li>• Clientes com WhatsApp podem receber notificações automáticas</li>
                <li>• Cada tutor pode ter múltiplos contatos, mas apenas um principal</li>
              </ul>
            </div>
        </div>
      </div>
    </div>
  );
}







