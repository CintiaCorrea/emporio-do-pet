'use client';

import { useState } from 'react';
import {
  FileText,
  ClipboardList,
  Pill,
  Stethoscope,
  Heart,
  Shield,
  FlaskConical,
  Syringe,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Brain} from 'lucide-react';
import toast from 'react-hot-toast';

const DOCUMENT_TYPES = [
  { value: 'ANAMNESIS', label: 'Anamnese', icon: ClipboardList, description: 'Histórico completo do atendimento', color: 'blue' },
  { value: 'PRESCRIPTION', label: 'Prescrição', icon: Pill, description: 'Receituário com medicamentos e dosagens', color: 'green' },
  { value: 'DIAGNOSIS', label: 'Diagnóstico', icon: Stethoscope, description: 'Relatório diagnóstico com justificativa', color: 'purple' },
  { value: 'TUTOR_REPORT', label: 'Relatório Tutor', icon: Heart, description: 'Orientações em linguagem acessível', color: 'pink' },
  { value: 'MEDICAL_CERTIFICATE', label: 'Atestado', icon: Shield, description: 'Atestado médico veterinário', color: 'yellow' },
  { value: 'EXAM_REQUEST', label: 'Solicitação de Exames', icon: FlaskConical, description: 'Exames complementares', color: 'orange' },
  { value: 'SURGICAL_REPORT', label: 'Relatório Cirúrgico', icon: Syringe, description: 'Descrição do procedimento', color: 'red' },
  { value: 'DISCHARGE_SUMMARY', label: 'Sumário de Alta', icon: FileText, description: 'Resumo da internação e alta', color: 'teal' },
];

interface DocumentGeneratorProps {
  appointmentId: string;
  recordingId?: string;
  hasTranscription: boolean;
  hasAnalysis: boolean;
  onDocumentsGenerated?: (docs: any[]) => void;
}

export default function DocumentGenerator({
  appointmentId,
  recordingId,
  hasTranscription,
  hasAnalysis,
  onDocumentsGenerated}: DocumentGeneratorProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [signedBy, setSignedBy] = useState('');
  const [crmv, setCrmv] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const selectAll = () => {
    if (selectedTypes.length === DOCUMENT_TYPES.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(DOCUMENT_TYPES.map((t) => t.value));
    }
  };

  const generateDocuments = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Selecione pelo menos um tipo de documento');
      return;
    }

    if (!hasTranscription && !hasAnalysis) {
      toast.error('É necessário ter a transcrição ou análise da consulta para gerar documentos');
      return;
    }

    setIsGenerating(true);
    setGeneratedDocs([]);
    setErrors([]);

    try {
      const res = await fetch('/api/clinical-documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          recordingId,
          types: selectedTypes,
          signedBy: signedBy || undefined,
          crmv: crmv || undefined,
          additionalContext: additionalContext || undefined})});

      if (res.ok) {
        const data = await res.json();
        setGeneratedDocs(data.generated || []);
        setErrors(data.errors || []);
        onDocumentsGenerated?.(data.generated || []);

        if (data.generated?.length > 0) {
          toast.success(`${data.generated.length} documento(s) gerado(s) com sucesso!`);
        }
        if (data.errors?.length > 0) {
          toast.error(`${data.errors.length} documento(s) falharam na geração`);
        }
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro ao gerar documentos');
      }
    } catch (err) {
      toast.error('Erro ao gerar documentos');
    } finally {
      setIsGenerating(false);
    }
  };

  const colorClasses: Record<string, string> = {
    blue: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20',
    green: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20',
    purple: 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20',
    pink: 'border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-900/20',
    yellow: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20',
    orange: 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20',
    red: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20',
    teal: 'border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-900/20'};

  const selectedColorClasses: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-100 ring-2 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-900/40',
    green: 'border-green-500 bg-green-100 ring-2 ring-green-500/30 dark:border-green-500 dark:bg-green-900/40',
    purple: 'border-purple-500 bg-purple-100 ring-2 ring-purple-500/30 dark:border-purple-500 dark:bg-purple-900/40',
    pink: 'border-pink-500 bg-pink-100 ring-2 ring-pink-500/30 dark:border-pink-500 dark:bg-pink-900/40',
    yellow: 'border-yellow-500 bg-yellow-100 ring-2 ring-yellow-500/30 dark:border-yellow-500 dark:bg-yellow-900/40',
    orange: 'border-orange-500 bg-orange-100 ring-2 ring-orange-500/30 dark:border-orange-500 dark:bg-orange-900/40',
    red: 'border-red-500 bg-red-100 ring-2 ring-red-500/30 dark:border-red-500 dark:bg-red-900/40',
    teal: 'border-cyan-500 bg-cyan-100 ring-2 ring-cyan-500/30 dark:border-cyan-500 dark:bg-cyan-900/40'};

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Gerar Documentos com IA
          </h3>
          <button
            onClick={selectAll}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            {selectedTypes.length === DOCUMENT_TYPES.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>

        {/* Document Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {DOCUMENT_TYPES.map((doc) => {
            const isSelected = selectedTypes.includes(doc.value);
            const Icon = doc.icon || FileText;
            return (
              <button
                key={doc.value}
                onClick={() => toggleType(doc.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected ? selectedColorClasses[doc.color] : colorClasses[doc.color]
                } hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  {Icon && <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-violet-600' : 'text-gray-500'}`} />}
                  <div>
                    <p className={`font-medium text-sm ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {doc.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{doc.description}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex justify-end mt-2">
                    <Check className="w-4 h-4 text-violet-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Advanced Options */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {showAdvanced ? 'Ocultar opções avançadas' : 'Opções avançadas'}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assinado por (Veterinário)
                </label>
                <input
                  type="text"
                  value={signedBy}
                  onChange={(e) => setSignedBy(e.target.value)}
                  placeholder="Dr(a). Nome Completo"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CRMV
                </label>
                <input
                  type="text"
                  value={crmv}
                  onChange={(e) => setCrmv(e.target.value)}
                  placeholder="CRMV-XX 12345"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm"
                />
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contexto adicional (opcional)
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Informações adicionais que a IA deve considerar..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm h-20 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {selectedTypes.length} documento(s) selecionado(s)
          </p>
          <button
            onClick={generateDocuments}
            disabled={isGenerating || selectedTypes.length === 0 || (!hasTranscription && !hasAnalysis)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando documentos...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                Gerar Documentos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Documents */}
      {generatedDocs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Documentos Gerados ({generatedDocs.length})
          </h3>
          <div className="space-y-3">
            {generatedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-violet-600" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.type} • Gerado por IA</p>
                  </div>
                </div>
                <a
                  href={`/dashboard/erp/consultas/${appointmentId}/documentos?doc=${doc.id}`}
                  className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                >
                  Visualizar
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Erros na Geração
          </h4>
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600 dark:text-red-400">
              {err.type}: {err.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
