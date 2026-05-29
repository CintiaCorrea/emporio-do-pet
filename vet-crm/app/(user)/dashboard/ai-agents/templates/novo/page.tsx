'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuArrowLeft LuCheck, LuLoader } from 'react-icons/lu';
import { CategorySelector } from './components/CategorySelector';
import { StepIndicator } from './components/StepIndicator';
import { StandardTemplateEditor } from './components/StandardTemplateEditor';
import { AuthenticationTemplateEditor } from './components/AuthenticationTemplateEditor';
import { CarouselTemplateEditor } from './components/CarouselTemplateEditor';
import { LimitedTimeOfferEditor } from './components/LimitedTimeOfferEditor';
import { MPMTemplateEditor } from './components/MPMTemplateEditor';
import { OrderDetailsEditor } from './components/OrderDetailsEditor';
import { ReviewStep } from './components/ReviewStep';
import { PhonePreview } from './components/PhonePreview';
import { INITIAL_FORM_DATA, LANGUAGES } from './constants';
import { LanguageOption, MetaFlow, TemplateFormData } from './types';
import { buildTemplatePayload, detectBodyVariables, getButtonValidationError } from './utils';

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
  const [formData, setFormData] = useState<TemplateFormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [flows, setFlows] = useState<MetaFlow[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>(LANGUAGES);

  const variablesInBody = useMemo(() => detectBodyVariables(formData.bodyText), [formData.bodyText]);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.category !== 'AUTHENTICATION') return prev;
      const otpButtonExists = prev.buttons.some((b) => b.type === 'OTP' || b.type === 'COPY_CODE');
      if (otpButtonExists) return prev;
      return {
        ...prev,
        buttons: [{ id: crypto.randomUUID(), type: 'OTP', text: 'Copiar codigo', otp_type: 'COPY_CODE' }]};
    });
  }, [formData.category]);

  useEffect(() => {
    const shouldAutoFlow = formData.templateType === 'FLOWS';
    if (!shouldAutoFlow) return;
    setFormData((prev) => {
      const hasFlowButton = prev.buttons.some((button) => button.type === 'FLOW');
      if (hasFlowButton) return prev;
      return {
        ...prev,
        buttons: [...prev.buttons, { id: crypto.randomUUID(), type: 'FLOW', text: 'Abrir flow' }]};
    });
  }, [formData.templateType]);

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const response = await fetch('/api/whatsapp-templates/flows');
        const data = await readJsonSafe(response);
        if (!response.ok) return;
        setFlows(Array.isArray(data?.flows) ? data.flows : []);
      } catch {
        // Non-blocking for editor rendering.
      }
    };
    fetchFlows();
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('/api/whatsapp-templates/metadata');
        const data = await readJsonSafe(response);
        if (!response.ok) return;
        if (Array.isArray(data?.languages) && data.languages.length > 0) {
          setLanguages(
            data.languages
              .filter((language: unknown) => {
                if (!language || typeof language !== 'object') return false;
                const lang = language as Record<string, unknown>;
                return typeof lang.value === 'string' && typeof lang.label === 'string';
              })
              .map((language: Record<string, string>) => ({
                value: language.value,
                label: language.label})),
          );
        }
      } catch {
        // Keep static fallback languages.
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    setFormData((prev) => {
      if (variablesInBody.length === prev.bodyExamples.length) return prev;
      const bodyExamples = [...prev.bodyExamples];
      while (bodyExamples.length < variablesInBody.length) bodyExamples.push('');
      while (bodyExamples.length > variablesInBody.length) bodyExamples.pop();
      return { ...prev, bodyExamples };
    });
  }, [variablesInBody]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do template e obrigatorio.');
      return;
    }
    if (formData.category !== 'AUTHENTICATION' && !formData.bodyText.trim() && formData.templateType !== 'LIMITED_TIME_OFFER') {
      toast.error('Corpo da mensagem e obrigatorio.');
      return;
    }
    if (variablesInBody.length > 0 && formData.bodyExamples.some((example) => !example.trim())) {
      toast.error('Preencha todos os exemplos de variaveis.');
      return;
    }
    if (formData.templateType === 'CAROUSEL' && formData.carouselCards.length < 2) {
      toast.error('Carousel exige ao menos 2 cards.');
      return;
    }
    if (formData.templateType === 'LIMITED_TIME_OFFER' && !formData.limitedTimeOfferText.trim()) {
      toast.error('Informe o texto da oferta por tempo limitado.');
      return;
    }
    const buttonError = getButtonValidationError(formData.buttons, formData.category);
    if (buttonError) {
      toast.error(buttonError);
      return;
    }

    setLoading(true);
    try {
      const payload = buildTemplatePayload(formData);
      const response = await fetch('/api/whatsapp-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)});
      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Erro ao criar template.'));
      }
      toast.success('Template enviado para aprovacao da Meta.');
      router.push('/dashboard/ai-agents/templates');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar template.');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = !!formData.category && !!formData.templateType;
  const canProceedStep2 =
    !!formData.name.trim() &&
    (formData.category === 'AUTHENTICATION' ||
      formData.templateType === 'LIMITED_TIME_OFFER' ||
      formData.templateType === 'ORDER_DETAILS' ||
      !!formData.bodyText.trim());
  const canSubmit = canProceedStep1 && canProceedStep2;

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/ai-agents/templates"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <LuArrowLeft className="w-4 h-4" />
            Voltar para Templates
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Criar modelo</h1>
        </div>

        <StepIndicator currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              {currentStep === 1 && (
                <CategorySelector
                  category={formData.category}
                  templateType={formData.templateType}
                  onCategoryChange={(category) =>
                    setFormData((prev) => ({
                      ...prev,
                      category,
                      templateType: 'STANDARD'}))
                  }
                  onTemplateTypeChange={(templateType) => setFormData((prev) => ({ ...prev, templateType }))}
                />
              )}

              {currentStep === 2 &&
                formData.category !== 'AUTHENTICATION' &&
                ['STANDARD', 'FLOWS', 'CATALOG', 'CALL_PERMISSION'].includes(formData.templateType) && (
                <StandardTemplateEditor
                  formData={formData}
                  variablesInBody={variablesInBody}
                  flows={flows}
                  languages={languages}
                  onChange={(updater) => setFormData(updater)}
                />
              )}

              {currentStep === 2 && formData.category === 'AUTHENTICATION' && (
                <AuthenticationTemplateEditor
                  formData={formData}
                  flows={flows}
                  languages={languages}
                  onChange={(updater) => setFormData(updater)}
                />
              )}

              {currentStep === 2 && formData.templateType === 'CAROUSEL' && (
                <CarouselTemplateEditor formData={formData} onChange={(updater) => setFormData(updater)} />
              )}

              {currentStep === 2 && formData.templateType === 'LIMITED_TIME_OFFER' && (
                <LimitedTimeOfferEditor formData={formData} onChange={(updater) => setFormData(updater)} />
              )}

              {currentStep === 2 && formData.templateType === 'MPM' && (
                <MPMTemplateEditor formData={formData} onChange={(updater) => setFormData(updater)} />
              )}

              {currentStep === 2 && formData.templateType === 'ORDER_DETAILS' && (
                <OrderDetailsEditor formData={formData} onChange={(updater) => setFormData(updater)} />
              )}

              {currentStep === 3 && <ReviewStep formData={formData} />}

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => (currentStep === 1 ? router.push('/dashboard/ai-agents/templates') : setCurrentStep((prev) => prev - 1))}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  {currentStep === 1 ? 'Descartar' : 'Voltar'}
                </button>

                {currentStep < 3 ? (
                  <button
                    onClick={() => setCurrentStep((prev) => prev + 1)}
                    disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Avancar
                    <span style={{fontSize:"14px"}}>→</span>
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
                        Enviar para analise
                        <LuCheck className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span style={{fontSize:"14px"}}>📱</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Previa do modelo</h3>
                </div>
                <PhonePreview formData={formData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
