'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuChevronRight,
  LuLoader,
  LuMessageSquare,
  LuShieldCheck,
  LuSparkles,
  LuImage,
  LuVideo,
  LuFile,
  LuFileText,
  LuPhone,
  LuExternalLink,
  LuCopy,
  LuPlus,
  LuTrash2,
  LuInfo,
  LuSmartphone
} from 'react-icons/lu';
import { toast } from 'sonner';

// Types
type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
type TemplateType = 'STANDARD' | 'CATALOG' | 'FLOWS' | 'ORDER_DETAILS' | 'CALL_PERMISSION';
type HeaderFormat = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';

interface TemplateButton {
  id: string;
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
}

interface TemplateFormData {
  name: string;
  category: TemplateCategory;
  templateType: TemplateType;
  language: string;
  headerFormat: HeaderFormat;
  headerText: string;
  headerMediaHandle?: string;
  bodyText: string;
  footerText: string;
  buttons: TemplateButton[];
  bodyExamples: string[];
  headerExamples: string[];
}

const initialFormData: TemplateFormData = {
  name: '',
  category: 'MARKETING',
  templateType: 'STANDARD',
  language: 'pt_BR',
  headerFormat: 'NONE',
  headerText: '',
  bodyText: '',
  footerText: '',
  buttons: [],
  bodyExamples: [],
  headerExamples: [],
};

const TEMPLATE_TYPES: Record<TemplateCategory, Array<{ value: TemplateType; label: string; description: string }>> = {
  MARKETING: [
    { value: 'STANDARD', label: 'Padrão', description: 'Envie mensagens com mídia e botões personalizados para engajar seus clientes.' },
    { value: 'CATALOG', label: 'Catálogo', description: 'Envie mensagens para aumentar as vendas conectando seu catálogo de produtos.' },
    { value: 'FLOWS', label: 'Flows', description: 'Envie um formulário para coletar interesses dos clientes e pedidos de horas marcadas ou fazer pesquisas.' },
  ],
  UTILITY: [
    { value: 'STANDARD', label: 'Padrão', description: 'Envie mensagens de utilidade como confirmações, lembretes e atualizações.' },
    { value: 'ORDER_DETAILS', label: 'Detalhes do pedido', description: 'Envie mensagens que os clientes podem usar para fazer pagamentos para você.' },
    { value: 'FLOWS', label: 'Flows', description: 'Envie um formulário para coletar informações dos clientes.' },
  ],
  AUTHENTICATION: [
    { value: 'STANDARD', label: 'Padrão', description: 'Envie códigos de verificação para autenticação de usuários.' },
    { value: 'CALL_PERMISSION', label: 'Solicitação de permissões para ligação', description: 'Pergunte aos clientes se você pode ligar para eles no WhatsApp.' },
  ],
};

const LANGUAGES = [
  { value: 'pt_BR', label: 'Português (BR)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es', label: 'Español' },
  { value: 'es_AR', label: 'Español (Argentina)' },
  { value: 'es_MX', label: 'Español (México)' },
];

async function readJsonSafe(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getApiErrorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data?.error === 'string' && data.error) return data.error;
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (Array.isArray(data?.message)) return data.message.filter((x: unknown) => typeof x === 'string').join(', ') || fallback;
  return fallback;
}

export default function NovoTemplatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [variablesInBody, setVariablesInBody] = useState<string[]>([]);

  // Detect variables in body text
  useEffect(() => {
    const matches = formData.bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const vars = [...new Set(matches)];
    setVariablesInBody(vars);
    
    // Adjust bodyExamples array size
    if (vars.length !== formData.bodyExamples.length) {
      const newExamples = [...formData.bodyExamples];
      while (newExamples.length < vars.length) {
        newExamples.push('');
      }
      while (newExamples.length > vars.length) {
        newExamples.pop();
      }
      setFormData(prev => ({ ...prev, bodyExamples: newExamples }));
    }
  }, [formData.bodyText]);

  const handleCategoryChange = (category: TemplateCategory) => {
    setFormData(prev => ({
      ...prev,
      category,
      templateType: 'STANDARD',
    }));
  };

  const addButton = () => {
    if (formData.buttons.length >= 3) {
      toast.error('Máximo de 3 botões permitido');
      return;
    }
    setFormData(prev => ({
      ...prev,
      buttons: [
        ...prev.buttons,
        { id: crypto.randomUUID(), type: 'QUICK_REPLY', text: '' },
      ],
    }));
  };

  const removeButton = (id: string) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter(b => b.id !== id),
    }));
  };

  const updateButton = (id: string, updates: Partial<TemplateButton>) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map(b => b.id === id ? { ...b, ...updates } : b),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do template é obrigatório');
      return;
    }
    if (!formData.bodyText.trim()) {
      toast.error('Corpo da mensagem é obrigatório');
      return;
    }

    // Check if all body examples are filled
    if (variablesInBody.length > 0 && formData.bodyExamples.some(e => !e.trim())) {
      toast.error('Preencha todos os exemplos das variáveis');
      return;
    }

    setLoading(true);
    try {
      // Build components array
      const components: any[] = [];

      // Header
      if (formData.headerFormat !== 'NONE') {
        const headerComponent: any = {
          type: 'HEADER',
          format: formData.headerFormat,
        };
        if (formData.headerFormat === 'TEXT' && formData.headerText) {
          headerComponent.text = formData.headerText;
          if (formData.headerExamples.length > 0) {
            headerComponent.example = { header_text: formData.headerExamples };
          }
        }
        if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerFormat) && formData.headerMediaHandle) {
          headerComponent.example = { header_handle: [formData.headerMediaHandle] };
        }
        components.push(headerComponent);
      }

      // Body
      const bodyComponent: any = {
        type: 'BODY',
        text: formData.bodyText,
      };
      if (formData.bodyExamples.length > 0 && formData.bodyExamples.some(e => e.trim())) {
        bodyComponent.example = { body_text: [formData.bodyExamples] };
      }
      components.push(bodyComponent);

      // Footer
      if (formData.footerText.trim()) {
        components.push({
          type: 'FOOTER',
          text: formData.footerText,
        });
      }

      // Buttons
      if (formData.buttons.length > 0) {
        const buttonsComponent: any = {
          type: 'BUTTONS',
          buttons: formData.buttons.map(b => {
            const btn: any = { type: b.type, text: b.text };
            if (b.type === 'URL' && b.url) {
              btn.url = b.url;
            }
            if (b.type === 'PHONE_NUMBER' && b.phone_number) {
              btn.phone_number = b.phone_number;
            }
            if (b.type === 'COPY_CODE' && b.example) {
              btn.example = b.example;
            }
            return btn;
          }),
        };
        components.push(buttonsComponent);
      }

      const payload = {
        name: formData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        category: formData.category,
        language: formData.language,
        components,
      };

      const response = await fetch('/api/whatsapp-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Erro ao criar template'));
      }

      toast.success('Template enviado para aprovação da Meta!');
      router.push('/dashboard/ai-agents/templates');
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar template');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = formData.category && formData.templateType;
  const canProceedStep2 = formData.name.trim() && formData.bodyText.trim() && 
    (variablesInBody.length === 0 || formData.bodyExamples.every(e => e.trim()));
  const canSubmit = canProceedStep1 && canProceedStep2;

  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case 'MARKETING': return <LuSparkles className="w-5 h-5" />;
      case 'UTILITY': return <LuMessageSquare className="w-5 h-5" />;
      case 'AUTHENTICATION': return <LuShieldCheck className="w-5 h-5" />;
    }
  };

  // Preview message
  const renderPreview = () => {
    let previewBody = formData.bodyText;
    formData.bodyExamples.forEach((example, index) => {
      previewBody = previewBody.replace(`{{${index + 1}}}`, example || `{{${index + 1}}}`);
    });

    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Prévia do modelo</p>
        
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm max-w-[280px] overflow-hidden">
          {/* Header */}
          {formData.headerFormat === 'IMAGE' && (
            <div className="bg-gray-200 dark:bg-gray-700 h-32 flex items-center justify-center">
              <LuImage className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {formData.headerFormat === 'VIDEO' && (
            <div className="bg-gray-200 dark:bg-gray-700 h-32 flex items-center justify-center">
              <LuVideo className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {formData.headerFormat === 'DOCUMENT' && (
            <div className="bg-gray-200 dark:bg-gray-700 h-20 flex items-center justify-center">
              <LuFile className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {formData.headerFormat === 'TEXT' && formData.headerText && (
            <div className="px-3 pt-3">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {formData.headerText}
              </p>
            </div>
          )}

          {/* Body */}
          <div className="p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {previewBody || 'Digite o corpo da mensagem...'}
            </p>
            
            {/* Footer */}
            {formData.footerText && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {formData.footerText}
              </p>
            )}
            
            {/* Time */}
            <p className="text-[10px] text-gray-400 text-right mt-1">11:59</p>
          </div>

          {/* Buttons */}
          {formData.buttons.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              {formData.buttons.map((button, index) => (
                <button
                  key={button.id}
                  className={`w-full px-3 py-2.5 text-sm text-blue-500 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    index > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                  }`}
                >
                  {button.type === 'URL' && <LuExternalLink className="w-4 h-4" />}
                  {button.type === 'PHONE_NUMBER' && <LuPhone className="w-4 h-4" />}
                  {button.type === 'COPY_CODE' && <LuCopy className="w-4 h-4" />}
                  {button.text || 'Botão'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/ai-agents/templates"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <LuArrowLeft className="w-4 h-4" />
            Voltar para Templates
          </Link>
          
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Criar modelo
          </h1>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {currentStep > 1 ? <LuCheck className="w-4 h-4" /> : '1'}
            </div>
            <span className="font-medium">Configurar modelo</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {currentStep > 2 ? <LuCheck className="w-4 h-4" /> : '2'}
            </div>
            <span className="font-medium">Editar modelo</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              3
            </div>
            <span className="font-medium">Enviar para análise</span>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              
              {/* Step 1: Configure Template */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Configurar seu modelo
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Escolha a categoria que melhor descreve seu modelo de mensagem. Em seguida, selecione o tipo de mensagem que deseja enviar.
                    </p>
                  </div>

                  {/* Category Selection */}
                  <div className="flex gap-2">
                    {(['MARKETING', 'UTILITY', 'AUTHENTICATION'] as TemplateCategory[]).map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategoryChange(category)}
                        className={`flex-1 px-4 py-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                          formData.category === category
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {getCategoryIcon(category)}
                        {category === 'MARKETING' ? 'Marketing' : category === 'UTILITY' ? 'Utilidade' : 'Autenticação'}
                      </button>
                    ))}
                  </div>

                  {/* Template Type Selection */}
                  <div className="space-y-3">
                    {TEMPLATE_TYPES[formData.category].map((type) => (
                      <label
                        key={type.value}
                        className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.templateType === type.value
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="templateType"
                            value={type.value}
                            checked={formData.templateType === type.value}
                            onChange={() => setFormData(prev => ({ ...prev, templateType: type.value }))}
                            className="mt-1 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Edit Template */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Editar modelo
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configure o conteúdo do seu template de mensagem.
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome do modelo *
                    </label>
                    <input
                      type="text"
                      placeholder="ex: promocao_verao"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                      }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Apenas letras minúsculas, números e underline
                    </p>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Idioma
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Header */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cabeçalho (opcional)
                    </label>
                    <div className="flex gap-2 mb-3">
                      {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as HeaderFormat[]).map((format) => (
                        <button
                          key={format}
                          onClick={() => setFormData(prev => ({ ...prev, headerFormat: format, headerText: '' }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                            formData.headerFormat === format
                              ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {format === 'NONE' && 'Nenhum'}
                          {format === 'TEXT' && <><LuFileText className="w-4 h-4" /> Texto</>}
                          {format === 'IMAGE' && <><LuImage className="w-4 h-4" /> Imagem</>}
                          {format === 'VIDEO' && <><LuVideo className="w-4 h-4" /> Vídeo</>}
                          {format === 'DOCUMENT' && <><LuFile className="w-4 h-4" /> Documento</>}
                        </button>
                      ))}
                    </div>
                    {formData.headerFormat === 'TEXT' && (
                      <input
                        type="text"
                        placeholder="Texto do cabeçalho (máx. 60 caracteres)"
                        maxLength={60}
                        value={formData.headerText}
                        onChange={(e) => setFormData(prev => ({ ...prev, headerText: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    )}
                    {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerFormat) && (
                      <div className="bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                        <LuInfo className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          O upload de mídia é feito após a aprovação do template
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Corpo da mensagem *
                    </label>
                    <textarea
                      placeholder="Digite sua mensagem aqui...&#10;Use {{1}}, {{2}} para variáveis dinâmicas."
                      rows={5}
                      maxLength={1024}
                      value={formData.bodyText}
                      onChange={(e) => setFormData(prev => ({ ...prev, bodyText: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formData.bodyText.length}/1024 caracteres
                    </p>

                    {/* Body Examples */}
                    {variablesInBody.length > 0 && (
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">
                          Exemplos para as variáveis (obrigatório)
                        </p>
                        <div className="space-y-2">
                          {variablesInBody.map((variable, index) => (
                            <div key={variable} className="flex items-center gap-3">
                              <span className="text-sm font-mono text-amber-700 dark:text-amber-400 w-12">
                                {variable}
                              </span>
                              <input
                                type="text"
                                placeholder={`Exemplo para ${variable}`}
                                value={formData.bodyExamples[index] || ''}
                                onChange={(e) => {
                                  const newExamples = [...formData.bodyExamples];
                                  newExamples[index] = e.target.value;
                                  setFormData(prev => ({ ...prev, bodyExamples: newExamples }));
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rodapé (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Responda SAIR para cancelar"
                      maxLength={60}
                      value={formData.footerText}
                      onChange={(e) => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    />
                  </div>

                  {/* Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Botões (opcional)
                      </label>
                      <button
                        onClick={addButton}
                        disabled={formData.buttons.length >= 3}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LuPlus className="w-4 h-4" />
                        Adicionar botão
                      </button>
                    </div>

                    {formData.buttons.length > 0 && (
                      <div className="space-y-3">
                        {formData.buttons.map((button, index) => (
                          <div key={button.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Botão {index + 1}
                              </span>
                              <button
                                onClick={() => removeButton(button.id)}
                                className="text-red-500 hover:text-red-600 p-1"
                              >
                                <LuTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <select
                                value={button.type}
                                onChange={(e) => updateButton(button.id, { type: e.target.value as ButtonType })}
                                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              >
                                <option value="QUICK_REPLY">Resposta rápida</option>
                                <option value="URL">Link URL</option>
                                <option value="PHONE_NUMBER">Telefone</option>
                                <option value="COPY_CODE">Copiar código</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Texto do botão"
                                maxLength={25}
                                value={button.text}
                                onChange={(e) => updateButton(button.id, { text: e.target.value })}
                                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              />
                            </div>

                            {button.type === 'URL' && (
                              <input
                                type="url"
                                placeholder="https://exemplo.com"
                                value={button.url || ''}
                                onChange={(e) => updateButton(button.id, { url: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              />
                            )}

                            {button.type === 'PHONE_NUMBER' && (
                              <input
                                type="tel"
                                placeholder="+5511999999999"
                                value={button.phone_number || ''}
                                onChange={(e) => updateButton(button.id, { phone_number: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              />
                            )}

                            {button.type === 'COPY_CODE' && (
                              <input
                                type="text"
                                placeholder="Código para copiar"
                                value={button.example || ''}
                                onChange={(e) => updateButton(button.id, { example: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Enviar para análise
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Revise seu template antes de enviar para aprovação da Meta.
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nome do template</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formData.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Categoria</p>
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {getCategoryIcon(formData.category)}
                          {formData.category === 'MARKETING' ? 'Marketing' : formData.category === 'UTILITY' ? 'Utilidade' : 'Autenticação'}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Idioma</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {LANGUAGES.find(l => l.value === formData.language)?.label}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <LuInfo className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">Importante</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          Após o envio, o template será analisado pela Meta. O processo pode levar de alguns minutos até 24 horas. 
                          Você receberá uma notificação quando o status mudar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => currentStep === 1 ? router.push('/dashboard/ai-agents/templates') : setCurrentStep(prev => prev - 1)}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  {currentStep === 1 ? 'Descartar' : 'Voltar'}
                </button>

                {currentStep < 3 ? (
                  <button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Avançar
                    <LuArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <LuLoader className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Enviar para análise
                        <LuCheck className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview area */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <LuSmartphone className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Prévia do modelo</h3>
                </div>
                {renderPreview()}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  Este modelo é ideal para {formData.category === 'MARKETING' ? 'engajar clientes' : formData.category === 'UTILITY' ? 'atualizações importantes' : 'verificação de identidade'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
