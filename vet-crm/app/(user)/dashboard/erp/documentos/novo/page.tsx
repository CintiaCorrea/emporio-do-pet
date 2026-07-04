'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import DocumentRecorder from '@/components/protected/dashboard/documents/DocumentRecorder';
import StandaloneDocumentGenerator from '@/components/protected/dashboard/documents/StandaloneDocumentGenerator';
import DocumentRecordingHistory, { addToRecordingHistory } from '@/components/protected/dashboard/documents/DocumentRecordingHistory';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const GREEN = '#0f6e56';
const BG = '#F6F2EA';
const SOFT = '#FBF9F4';
const TINT = '#E0F4F6';
const LINE = '#E8E2D6';
const TXT = '#1F2A2E';
const TXT2 = '#5C6B70';
const TXT3 = '#8A989D';

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

  const handleTranscriptionComplete = (text: string, audioDuration?: number) => {
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

  const handleSelectFromHistory = (recording: { id: string; transcription: string; audioDuration?: number; createdAt: string; audioUrl?: string }) => {
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

  const stepBtn = (active: boolean, doneState: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
    background: active ? TEAL : doneState ? '#e1f5ee' : SOFT,
    color: active ? '#fff' : doneState ? GREEN : TXT3});

  return (
    <div style={{ maxWidth: 1024, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24, background: BG, minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/dashboard/erp/documentos"
            style={{ display: 'inline-flex', padding: 8, borderRadius: 9, textDecoration: 'none', fontSize: 18, color: TXT2 }}
          >
            ←
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span style={{ fontSize: 22 }}>🎤</span>
              Novo Documento
            </h1>
            <p style={{ fontSize: 13, color: TXT2, margin: '4px 0 0' }}>
              Grave ou digite, transcreva e gere documentos automaticamente com IA
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: `1px solid ${LINE}`,
              background: showHistory ? TINT : '#fff',
              color: showHistory ? TEAL_DARK : TXT2}}
          >
            <span style={{ fontSize: 14 }}>⏳</span>
            Histórico
          </button>

          {generatedDocs.length > 0 && (
            <Link
              href="/dashboard/erp/documentos"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: TEAL, color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
            >
              <span>📄</span>
              Ver Documentos ({generatedDocs.length})
            </Link>
          )}
        </div>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setStep('record')}
          style={stepBtn(step === 'record', Boolean(transcription))}
        >
          <span style={{ fontSize: 14 }}>🎤</span>
          1. Gravar &amp; Transcrever
        </button>
        <span style={{ fontSize: 14, color: TXT3 }}>→</span>
        <button
          onClick={() => transcription && setStep('generate')}
          style={{ ...stepBtn(step === 'generate', generatedDocs.length > 0), opacity: transcription ? 1 : 0.6 }}
          disabled={!transcription}
        >
          <span style={{ fontSize: 14 }}>🧠</span>
          2. Gerar Documentos
        </button>
        <span style={{ fontSize: 14, color: TXT3 }}>→</span>
        <button
          onClick={() => generatedDocs.length > 0 && setStep('done')}
          style={{ ...stepBtn(step === 'done', false), opacity: generatedDocs.length > 0 ? 1 : 0.6 }}
          disabled={generatedDocs.length === 0}
        >
          <span style={{ fontSize: 14 }}>📄</span>
          3. Documentos Prontos
        </button>
      </div>

      {/* Recording History Panel */}
      {showHistory && (
        <div style={{ background: '#fff', borderRadius: 13, border: `1px solid ${LINE}`, padding: 24 }}>
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
        <div style={{ background: '#fff', borderRadius: 13, border: `1px solid ${LINE}`, padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, background: '#e1f5ee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 30 }}>
              ✅
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>
              Documentos Prontos!
            </h3>
            <p style={{ fontSize: 13, color: TXT2, margin: '4px 0 0' }}>
              {generatedDocs.length} documento(s) gerado(s)
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {generatedDocs.map((doc, idx) => (
              <div
                key={doc.id || idx}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: SOFT, border: `1px solid ${LINE}`, borderRadius: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 13, color: TXT, margin: 0 }}>{doc.title}</p>
                    <p style={{ fontSize: 12, color: TXT3, margin: '2px 0 0' }}>{doc.type} • Gerado por IA</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => openPreview(doc)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, fontSize: 15, color: TXT2 }}
                    title="Visualizar"
                  >
                    🔍
                  </button>
                  <button
                    onClick={() => saveDocument(doc)}
                    disabled={saving}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, fontSize: 15, color: TXT2, opacity: saving ? 0.5 : 1 }}
                    title="Salvar"
                  >
                    ✅
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={saveAllDocuments}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: TEAL, color: '#fff', border: 'none', borderRadius: 11, fontWeight: 500, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
            >
              <span style={{ fontSize: 16 }}>{saving ? '⏳' : '✅'}</span>
              {saving ? 'Salvando...' : 'Salvar Todos os Documentos'}
            </button>
            <button
              onClick={() => setStep('generate')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#fff', border: `1px solid ${LINE}`, color: TXT2, borderRadius: 11, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 16 }}>➕</span>
              Gerar Mais Documentos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
