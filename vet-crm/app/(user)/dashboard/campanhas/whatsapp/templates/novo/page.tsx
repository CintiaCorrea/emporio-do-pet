'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuChevronRight,
  LuArrowLeft,
  LuSave,
  LuLoader,
  LuMessageSquare,
  LuPlus,
  LuTrash2,
  LuInfo,
  LuLink,
  LuPhone,
  LuCopy,
  LuCornerDownRight,
  LuEye,
  LuImage,
  LuVideo,
  LuFile,
} from 'react-icons/lu';
import { toast } from 'sonner';

type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
type TemplateLanguage = 'pt_BR' | 'en_US' | 'es';
type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';

interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
}

interface TemplateMetadata {
  categories: Array<{ value: TemplateCategory; label: string; description: string }>;
  languages: Array<{ value: TemplateLanguage; label: string }>;
  buttonTypes: Array<{ value: ButtonType; label: string; description: string }>;
}

export default function NewWhatsAppTemplatePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<TemplateMetadata | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('MARKETING');
  const [language, setLanguage] = useState<TemplateLanguage>('pt_BR');
  const [headerFormat, setHeaderFormat] = useState<HeaderFormat | ''>('');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);

  // Examples for variables
  const [bodyExamples, setBodyExamples] = useState<string[]>([]);
  const [headerExamples, setHeaderExamples] = useState<string[]>([]);

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/api/whatsapp-templates/metadata');
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        console.error('Erro ao carregar metadados:', error);
      }
    };

    loadMetadata();
  }, []);

  // Count variables in text
  const countVariables = (text: string): number => {
    const matches = text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  // Update examples when body changes
  useEffect(() => {
    const varCount = countVariables(bodyText);
    if (varCount !== bodyExamples.length) {
      setBodyExamples(Array(varCount).fill(''));
    }
  }, [bodyText]);

  // Update header examples when header changes
  useEffect(() => {
    const varCount = countVariables(headerText);
    if (varCount !== headerExamples.length) {
      setHeaderExamples(Array(varCount).fill(''));
    }
  }, [headerText]);

  // Add button
  const addButton = (type: ButtonType) => {
    if (buttons.length >= 3) {
      toast.error('Máximo de 3 botões permitidos');
      return;
    }

    setButtons([
      ...buttons,
      {
        type,
        text: '',
        url: type === 'URL' ? '' : undefined,
        phone_number: type === 'PHONE_NUMBER' ? '' : undefined,
        example: type === 'COPY_CODE' ? '' : undefined,
      },
    ]);
  };

  // Remove button
  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  // Update button
  const updateButton = (index: number, field: keyof TemplateButton, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  // Sanitize template name
  const sanitizeName = (value: string): string => {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!name.trim()) {
      toast.error('Nome do template é obrigatório');
      return;
    }

    if (!bodyText.trim()) {
      toast.error('Corpo da mensagem é obrigatório');
      return;
    }

    // Check if all examples are filled
    const bodyVarCount = countVariables(bodyText);
    if (bodyVarCount > 0 && bodyExamples.some((e) => !e.trim())) {
      toast.error('Preencha todos os exemplos de variáveis do corpo');
      return;
    }

    const headerVarCount = countVariables(headerText);
    if (headerVarCount > 0 && headerExamples.some((e) => !e.trim())) {
      toast.error('Preencha todos os exemplos de variáveis do cabeçalho');
      return;
    }

    // Validate buttons
    for (const button of buttons) {
      if (!button.text.trim()) {
        toast.error('Texto do botão é obrigatório');
        return;
      }
      if (button.type === 'URL' && !button.url?.trim()) {
        toast.error('URL do botão é obrigatória');
        return;
      }
      if (button.type === 'PHONE_NUMBER' && !button.phone_number?.trim()) {
        toast.error('Número de telefone do botão é obrigatório');
        return;
      }
      if (button.type === 'COPY_CODE' && !button.example?.trim()) {
        toast.error('Código de exemplo do botão é obrigatório');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: sanitizeName(name),
        category,
        language,
        bodyText,
      };

      if (headerFormat && headerFormat === 'TEXT' && headerText) {
        payload.headerText = headerText;
        payload.headerFormat = headerFormat;
        if (headerExamples.length > 0) {
          payload.headerExamples = headerExamples;
        }
      } else if (headerFormat && headerFormat !== 'TEXT') {
        payload.headerFormat = headerFormat;
        // For media headers, example is the handle/URL
        if (headerExamples.length > 0) {
          payload.headerExamples = headerExamples;
        }
      }

      if (footerText) {
        payload.footerText = footerText;
      }

      if (buttons.length > 0) {
        payload.buttons = buttons;
      }

      if (bodyExamples.length > 0) {
        payload.bodyExamples = bodyExamples;
      }

      const response = await fetch('/api/whatsapp-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao criar template');
      }

      toast.success('Template criado com sucesso! Aguardando aprovação da Meta.');
      router.push('/dashboard/campanhas/whatsapp/templates');
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar template');
    } finally {
      setLoading(false);
    }
  };

  // Preview text with examples
  const getPreviewText = (text: string, examples: string[]): string => {
    let result = text;
    examples.forEach((example, index) => {
      result = result.replace(`{{${index + 1}}}`, example || `[Variável ${index + 1}]`);
    });
    return result;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/campanhas/whatsapp" className="hover:text-emerald-600">
            WhatsApp
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <Link
            href="/dashboard/campanhas/whatsapp/templates"
            className="hover:text-emerald-600"
          >
            Templates
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Novo Template</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/campanhas/whatsapp/templates"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LuArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Criar Template de Mensagem</h1>
            <p className="text-gray-500">
              Templates precisam ser aprovados pela Meta antes de serem usados
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LuMessageSquare className="w-5 h-5 text-emerald-600" />
              Informações Básicas
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  placeholder="Ex: confirmacao_agendamento"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Será convertido automaticamente: <strong>{sanitizeName(name) || 'nome_do_template'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {metadata?.categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    )) || (
                      <>
                        <option value="MARKETING">Marketing</option>
                        <option value="UTILITY">Utilidade</option>
                        <option value="AUTHENTICATION">Autenticação</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as TemplateLanguage)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {metadata?.languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    )) || (
                      <>
                        <option value="pt_BR">Português (Brasil)</option>
                        <option value="en_US">English (US)</option>
                        <option value="es">Español</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Header (Optional) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Cabeçalho (Opcional)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cabeçalho
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <button
                    type="button"
                    onClick={() => setHeaderFormat('')}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      !headerFormat
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium">Nenhum</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderFormat('TEXT')}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      headerFormat === 'TEXT'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium">Texto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderFormat('IMAGE')}
                    className={`p-3 rounded-xl border-2 text-center transition-all flex items-center justify-center gap-2 ${
                      headerFormat === 'IMAGE'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <LuImage className="w-4 h-4" />
                    <span className="text-sm font-medium">Imagem</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderFormat('VIDEO')}
                    className={`p-3 rounded-xl border-2 text-center transition-all flex items-center justify-center gap-2 ${
                      headerFormat === 'VIDEO'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <LuVideo className="w-4 h-4" />
                    <span className="text-sm font-medium">Vídeo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderFormat('DOCUMENT')}
                    className={`p-3 rounded-xl border-2 text-center transition-all flex items-center justify-center gap-2 ${
                      headerFormat === 'DOCUMENT'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <LuFile className="w-4 h-4" />
                    <span className="text-sm font-medium">Documento</span>
                  </button>
                </div>
              </div>

              {headerFormat === 'TEXT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto do Cabeçalho
                  </label>
                  <input
                    type="text"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    maxLength={60}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Ex: Olá, {{1}}!"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 60 caracteres. Use {'{{1}}'} para variáveis.
                  </p>
                </div>
              )}

              {headerFormat && headerFormat !== 'TEXT' && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700">
                    <LuInfo className="w-4 h-4 inline mr-2" />
                    Para cabeçalhos de mídia, você precisará fornecer a URL da mídia ao enviar a
                    mensagem.
                  </p>
                </div>
              )}

              {/* Header variable examples */}
              {headerFormat === 'TEXT' && countVariables(headerText) > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Exemplos de Variáveis do Cabeçalho
                  </label>
                  {headerExamples.map((example, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-16">{`{{${index + 1}}}`}</span>
                      <input
                        type="text"
                        value={example}
                        onChange={(e) => {
                          const newExamples = [...headerExamples];
                          newExamples[index] = e.target.value;
                          setHeaderExamples(newExamples);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder={`Exemplo para variável ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Corpo da Mensagem *</h2>

            <div className="space-y-4">
              <div>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  maxLength={1024}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  placeholder="Olá {{1}}, seu agendamento para {{2}} foi confirmado para o dia {{3}}."
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>
                    Use {'{{1}}'}, {'{{2}}'}, etc. para variáveis dinâmicas
                  </span>
                  <span>{bodyText.length}/1024</span>
                </div>
              </div>

              {/* Body variable examples */}
              {countVariables(bodyText) > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Exemplos de Variáveis (obrigatório para aprovação)
                  </label>
                  {bodyExamples.map((example, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-16">{`{{${index + 1}}}`}</span>
                      <input
                        type="text"
                        value={example}
                        onChange={(e) => {
                          const newExamples = [...bodyExamples];
                          newExamples[index] = e.target.value;
                          setBodyExamples(newExamples);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder={`Exemplo para variável ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer (Optional) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rodapé (Opcional)</h2>

            <div>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                maxLength={60}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Ex: Empório do Pet - Cuidando do seu melhor amigo"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo 60 caracteres. Sem variáveis.</p>
            </div>
          </div>

          {/* Buttons (Optional) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Botões (Opcional)</h2>
              <span className="text-sm text-gray-500">{buttons.length}/3</span>
            </div>

            {/* Add button options */}
            {buttons.length < 3 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => addButton('QUICK_REPLY')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  <LuCornerDownRight className="w-4 h-4" />
                  Resposta Rápida
                </button>
                <button
                  type="button"
                  onClick={() => addButton('URL')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  <LuLink className="w-4 h-4" />
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => addButton('PHONE_NUMBER')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  <LuPhone className="w-4 h-4" />
                  Ligar
                </button>
                {category === 'AUTHENTICATION' && (
                  <button
                    type="button"
                    onClick={() => addButton('COPY_CODE')}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                  >
                    <LuCopy className="w-4 h-4" />
                    Copiar Código
                  </button>
                )}
              </div>
            )}

            {/* Button list */}
            {buttons.length > 0 && (
              <div className="space-y-3">
                {buttons.map((button, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Botão {index + 1}:{' '}
                        {button.type === 'QUICK_REPLY'
                          ? 'Resposta Rápida'
                          : button.type === 'URL'
                          ? 'Link'
                          : button.type === 'PHONE_NUMBER'
                          ? 'Ligar'
                          : 'Copiar Código'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeButton(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={button.text}
                      onChange={(e) => updateButton(index, 'text', e.target.value)}
                      maxLength={25}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Texto do botão (máx 25 caracteres)"
                    />

                    {button.type === 'URL' && (
                      <input
                        type="url"
                        value={button.url || ''}
                        onChange={(e) => updateButton(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="https://exemplo.com/pagina"
                      />
                    )}

                    {button.type === 'PHONE_NUMBER' && (
                      <input
                        type="tel"
                        value={button.phone_number || ''}
                        onChange={(e) => updateButton(index, 'phone_number', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="+5511999999999"
                      />
                    )}

                    {button.type === 'COPY_CODE' && (
                      <input
                        type="text"
                        value={button.example || ''}
                        onChange={(e) => updateButton(index, 'example', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Código de exemplo: ABC123"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LuEye className="w-5 h-5 text-emerald-600" />
              Pré-visualização
            </h2>

            <div className="max-w-sm mx-auto">
              <div className="bg-[#e5ddd5] rounded-2xl p-4">
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  {headerFormat === 'TEXT' && headerText && (
                    <p className="font-medium text-gray-900 mb-2">
                      {getPreviewText(headerText, headerExamples)}
                    </p>
                  )}
                  {headerFormat && headerFormat !== 'TEXT' && (
                    <div className="bg-gray-100 rounded-lg p-8 mb-2 flex items-center justify-center">
                      {headerFormat === 'IMAGE' && <LuImage className="w-8 h-8 text-gray-400" />}
                      {headerFormat === 'VIDEO' && <LuVideo className="w-8 h-8 text-gray-400" />}
                      {headerFormat === 'DOCUMENT' && <LuFile className="w-8 h-8 text-gray-400" />}
                    </div>
                  )}
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {getPreviewText(bodyText, bodyExamples) || 'Corpo da mensagem...'}
                  </p>
                  {footerText && (
                    <p className="text-gray-500 text-xs mt-2">{footerText}</p>
                  )}
                </div>
                {buttons.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {buttons.map((button, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-2 text-center text-emerald-600 text-sm font-medium shadow-sm"
                      >
                        {button.text || `Botão ${index + 1}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex gap-3">
              <LuInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Sobre aprovação de templates</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Templates são revisados pela Meta antes de serem aprovados</li>
                  <li>O processo pode levar de alguns minutos até 24 horas</li>
                  <li>Templates rejeitados podem ser editados e reenviados</li>
                  <li>Use linguagem clara e evite termos promocionais excessivos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/dashboard/campanhas/whatsapp/templates"
              className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-center transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LuLoader className="w-5 h-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <LuSave className="w-5 h-5" />
                  Criar Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
