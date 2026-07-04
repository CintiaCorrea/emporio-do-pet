'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ConsultationRecorder from '@/components/protected/dashboard/clinical-documents/ConsultationRecorder';
import DocumentGenerator from '@/components/protected/dashboard/clinical-documents/DocumentGenerator';
import RecordingHistory from '@/components/protected/dashboard/clinical-documents/RecordingHistory';

interface Appointment {
  id: string;
  date: string;
  duration: number;
  description?: string;
  notes?: string;
  status: string;
  tutor: { id: string; name: string };
  pet: { id: string; name: string; species: string; breed?: string; weight?: number; birthDate?: string };
  user: { id: string; name: string };
  treatments: Array<{ id: string; description: string; cost: number }>;
  recording?: any;
  clinicalDocuments?: any[];
}

export default function GravarConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingId, setRecordingId] = useState<string>('');
  const [hasTranscription, setHasTranscription] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [step, setStep] = useState<'record' | 'generate' | 'done'>('record');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      // Fetch from backend via appointments API
      const res = await fetch(`/api/appointments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointment(data);

        // Check if recording already exists
        if (data.recording) {
          setRecordingId(data.recording.id);
          if (data.recording.transcription) setHasTranscription(true);
          if (data.recording.aiAnalysis) setHasAnalysis(true);
          if (data.recording.status === 'ANALYZED' || data.recording.status === 'COMPLETED') {
            setStep('generate');
          }
        }

        // Check if documents already exist
        if (data.clinicalDocuments?.length > 0) {
          setGeneratedDocs(data.clinicalDocuments);
          setStep('done');
        }
      } else {
        toast.error('Consulta não encontrada');
        router.push('/dashboard/erp/consultas');
      }
    } catch {
      toast.error('Erro ao carregar consulta');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#009AAC]"></div>
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-[#F6F2EA] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/erp/consultas"
            className="p-2 rounded-[9px] border border-[#E8E2D6] bg-white hover:bg-[#FBF9F4] transition-colors text-[#014D5E]"
          >
            <span style={{fontSize:"14px"}}>‹</span>
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-[#014D5E] flex items-center gap-2">
              <span style={{fontSize:"20px"}}>🎤</span>
              Gravação & Documentos
            </h1>
            <p className="text-sm text-[#5C6B70]">
              Grave a consulta, transcreva e gere documentos automaticamente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-colors ${
              showHistory
                ? 'bg-[#E0F4F6] text-[#014D5E]'
                : 'bg-white border border-[#E8E2D6] hover:bg-[#FBF9F4] text-[#5C6B70]'
            }`}
          >
            <span style={{fontSize:"14px"}}>📝</span>
            Histórico
          </button>

          {generatedDocs.length > 0 && (
            <Link
              href={`/dashboard/erp/consultas/${id}/documentos`}
              className="flex items-center gap-2 px-4 py-2 bg-[#009AAC] hover:bg-[#014D5E] text-white rounded-[9px] text-sm font-medium transition-colors"
            >
              <span style={{fontSize:"14px"}}>📄</span>
              Ver Documentos ({generatedDocs.length})
            </Link>
          )}
        </div>
      </div>

      {/* Appointment Info Card */}
      <div className="bg-white rounded-[13px] border border-[#E8E2D6] p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span style={{fontSize:"14px"}}>🐾</span>
            <span className="font-medium text-[#1F2A2E]">{appointment.pet.name}</span>
            <span className="text-[#8A989D]">({appointment.pet.species}{appointment.pet.breed ? ` - ${appointment.pet.breed}` : ''})</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{fontSize:"14px"}}>👤</span>
            <span className="text-[#5C6B70]">{appointment.tutor.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{fontSize:"14px"}}>📅</span>
            <span className="text-[#5C6B70]">
              {new Date(appointment.date).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{fontSize:"14px"}}>🩺</span>
            <span className="text-[#5C6B70]">{appointment.user.name}</span>
          </div>
        </div>
        {appointment.description && (
          <p className="mt-2 text-sm text-[#5C6B70]">
            <strong className="font-medium text-[#1F2A2E]">Motivo:</strong> {appointment.description}
          </p>
        )}
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setStep('record')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-all ${
            step === 'record'
              ? 'bg-[#009AAC] text-white'
              : hasTranscription || hasAnalysis
              ? 'bg-[#E0F4F6] text-[#0f6e56]'
              : 'bg-[#F0EBE0] text-[#8A989D]'
          }`}
        >
          <span style={{fontSize:"14px"}}>🎤</span>
          1. Gravar & Transcrever
        </button>
        <span style={{fontSize:"14px"}}>›</span>
        <button
          onClick={() => (hasTranscription || hasAnalysis) && setStep('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-all ${
            step === 'generate'
              ? 'bg-[#009AAC] text-white'
              : generatedDocs.length > 0
              ? 'bg-[#E0F4F6] text-[#0f6e56]'
              : 'bg-[#F0EBE0] text-[#8A989D]'
          }`}
          disabled={!hasTranscription && !hasAnalysis}
        >
          <span style={{fontSize:"14px"}}>📝</span>
          2. Gerar Documentos
        </button>
        <span style={{fontSize:"14px"}}>›</span>
        <button
          onClick={() => generatedDocs.length > 0 && setStep('done')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-all ${
            step === 'done'
              ? 'bg-[#009AAC] text-white'
              : 'bg-[#F0EBE0] text-[#8A989D]'
          }`}
          disabled={generatedDocs.length === 0}
        >
          <span style={{fontSize:"14px"}}>📄</span>
          3. Documentos Prontos
        </button>
      </div>

      {/* Recording History Panel */}
      {showHistory && (
        <div className="bg-white rounded-[13px] border border-[#E8E2D6] p-6">
          <RecordingHistory
            appointmentId={id}
            currentRecordingId={recordingId}
            onSelectRecording={(recording) => {
              setRecordingId(recording.id);
              setHasTranscription(!!recording.transcription);
              setHasAnalysis(!!recording.aiAnalysis);
              if (recording.transcription || recording.aiAnalysis) {
                setStep('generate');
              }
              setShowHistory(false);
            }}
          />
        </div>
      )}

      {/* Step Content */}
      {step === 'record' && !showHistory && (
        <ConsultationRecorder
          appointmentId={id}
          recordingId={recordingId || undefined}
          onRecordingCreated={(rec) => setRecordingId(rec.id)}
          onTranscriptionComplete={() => {
            setHasTranscription(true);
            setStep('generate');
          }}
          onAnalysisComplete={() => {
            setHasAnalysis(true);
            setStep('generate');
          }}
        />
      )}

      {step === 'generate' && !showHistory && (
        <DocumentGenerator
          appointmentId={id}
          recordingId={recordingId || undefined}
          hasTranscription={hasTranscription}
          hasAnalysis={hasAnalysis}
          onDocumentsGenerated={(docs) => {
            setGeneratedDocs(docs);
            setStep('done');
          }}
        />
      )}

      {step === 'done' && !showHistory && (
        <div className="bg-white rounded-[13px] border border-[#E8E2D6] p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#E0F4F6] rounded-full flex items-center justify-center mx-auto mb-3">
              <span style={{fontSize:"28px"}}>📄</span>
            </div>
            <h3 className="text-lg font-medium text-[#014D5E]">
              Documentos Prontos!
            </h3>
            <p className="text-sm text-[#5C6B70]">
              {generatedDocs.length} documento(s) gerado(s) para esta consulta
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {generatedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-[#FBF9F4] border border-[#F0EBE0] rounded-[9px]"
              >
                <div className="flex items-center gap-3">
                  <span style={{fontSize:"18px"}}>📄</span>
                  <div>
                    <p className="font-medium text-sm text-[#1F2A2E]">{doc.title}</p>
                    <p className="text-xs text-[#8A989D]">{doc.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <Link
              href={`/dashboard/erp/consultas/${id}/documentos`}
              className="flex items-center gap-2 px-6 py-3 bg-[#009AAC] hover:bg-[#014D5E] text-white rounded-[9px] font-medium transition-all"
            >
              <span style={{fontSize:"16px"}}>📄</span>
              Visualizar e Baixar Documentos
            </Link>
            <button
              onClick={() => setStep('generate')}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E8E2D6] hover:bg-[#FBF9F4] text-[#5C6B70] rounded-[9px] font-medium transition-all"
            >
              <span style={{fontSize:"14px"}}>📝</span>
              Gerar Mais Documentos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
