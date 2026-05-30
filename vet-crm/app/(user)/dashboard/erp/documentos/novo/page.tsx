'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuFileText,
  LuCheck,
  LuDownload,
  LuEye,
  LuPlus,
  LuSave,
  LuLoader} from 'react-icons/lu';
import toast from 'react-hot-toast';
import DocumentRecorder from '@/components/protected/dashboard/documents/DocumentRecorder';
import StandaloneDocumentGenerator from '@/components/protected/dashboard/documents/StandaloneDocumentGenerator';
import DocumentRecordingHistory, { addToRecordingHistory } from '@/components/protected/dashboard/documents/DocumentRecordingHistory';

interface GeneratedDocument {
  id: string;
  title: string;
  type: string;
  content: string;
  htmlContent: string;
}

export default function NewDocumentPage() {
  const router = useRouter();
  const [step, setStep] = useState<'record' | 'generate' | 'done'>('record');
  const [showHistory, setShowHistory] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [saving, setSaving] = useState(false);

  const handleTranscriptionComplete = (text: string, audioDuration? (() => null) : number) => {
    setTranscription(text);
    addToRecordingHistory({
      transcription: text,
      audioDuration});
    setStep('generate');
  };

  const handleDocumentsGenerated = (docs: GeneratedDocument[]) => {
    setGeneratedDocs(docs);
    setStep('done');
  };

  const handleSelectFromHistory = (recording: { id: string; transcription: string; audioDuration? (() => null) : number; createdAt: string; audioUrl? (() => null) : string }) => {
    setTranscription(recording.transcription);
    setShowHistory(false);
    setStep('generate');
  };

  const saveDocument = async (doc: GeneratedDocument) => {
    try {
      setSaving(true);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          content: doc.htmlContent || doc.content,
          status: 'PUBLISHED',
          category: doc.type,
          tags: ['gerado-ia']})});

      if (res.ok) {
        toast.success(`"${doc.title}" salvo com sucesso!`);
      } else {
        toast.error('Erro ao salvar documento');
      }
    } catch {
      toast.error('Erro ao salvar documento');
    } finally {
      setSaving(false);
    }
  };

  const saveAllDocuments = async () => {
    setSaving(true);
    let saved = 0;
    for (const doc of generatedDocs) {
      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: doc.title,
            content: doc.htmlContent || doc.content,
            status: 'PUBLISHED',
            category: doc.type,
            tags: ['gerado-ia']})});
        if (res.ok) saved++;
      } catch {
        // continue
      }
    }
    setSaving(false);
    if (saved > 0) {
      toast.success(`${saved} documento(s) salvo(s) com sucesso!`);
      router.push('/dashboard/erp/documentos');
    } else {
      toast.error('Erro ao salvar documentos');
    }
  };

  const openPreview = (doc: GeneratedDocument) => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(doc.htmlContent || `<html><body><pre>${doc.content}</pre></body></html>`);
      win.document.close();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/erp/documentos"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <LuArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span style={{fontSize:"14px"}}>🎤</span>
              Novo Documento
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Grave ou digite, transcreva e gere documentos automaticamente com IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showHistory
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
            }`}
          >
            <span style={{fontSize:"14px"}}>⏳</span>
            Histórico
          </button>

          {generatedDocs.length > 0 && (
            <Link
              href="/dashboard/erp/documentos"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <LuFileText className="w-4 h-4" />
              Ver Documentos ({generatedDocs.length})
            </Link>
          )}
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setStep('record')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 'record'
              ? 'bg-violet-600 text-white'
              : transcription
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
          }`}
        >
          <span style={{fontSize:"14px"}}>🎤</span>
          1. Gravar & Transcrever
        </button>
        <span style={{fontSize:"14px"}}>→</span>
        <button
          onClick={() => transcription && setStep('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 'generate'
              ? 'bg-violet-600 text-white'
              : generatedDocs.length > 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
          }`}
          disabled={!transcription}
        >
          <span style={{fontSize:"14px"}}>🧠</span>
          2. Gerar Documentos
        </button>
        <span style={{fontSize:"14px"}}>→</span>
        <button
          onClick={() => generatedDocs.length > 0 && setStep('done')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 'done'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
          }`}
          disabled={generatedDocs.length === 0}
        >
          <LuFileText className="w-4 h-4" />
          3. Documentos Prontos
        </button>
      </div>

      {/* Recording History Panel */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <DocumentRecordingHistory onSelectRecording={handleSelectFromHistory} />
        </div>
      )}

      {/* Step 1: Record & Transcribe */}
      {step === 'record' && !showHistory && (
        <DocumentRecorder
          onTranscriptionComplete={handleTranscriptionComplete}
          onContentGenerated={(content) => {
            setTranscription(content);
            setStep('generate');
          }}
        />
      )}

      {/* Step 2: Generate Documents */}
      {step === 'generate' && !showHistory && (
        <StandaloneDocumentGenerator
          transcription={transcription}
          onDocumentsGenerated={handleDocumentsGenerated}
          onBack={() => setStep('record')}
        />
      )}

      {/* Step 3: Documents Ready */}
      {step === 'done' && !showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <LuCheck className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documentos Prontos!
            </h3>
            <p className="text-sm text-gray-500">
              {generatedDocs.length} documento(s) gerado(s)
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {generatedDocs.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <LuFileText className="w-5 h-5 text-violet-600" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.type} • Gerado por IA</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPreview(doc)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                    title="Visualizar"
                  >
                    <LuEye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => saveDocument(doc)}
                    disabled={saving}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                    title="Salvar"
                  >
                    <LuSave className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={saveAllDocuments}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {saving ? (
                <LuLoader className="w-5 h-5 animate-spin" />
              ) : (
                <LuSave className="w-5 h-5" />
              )}
              {saving ? 'Salvando...' : 'Salvar Todos os Documentos'}
            </button>
            <button
              onClick={() => setStep('generate')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"
            >
              <LuPlus className="w-5 h-5" />
              Gerar Mais Documentos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
