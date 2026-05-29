'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuPawPrint,
  LuUser,
  LuCalendar
  LuLoader,
  LuFileText
} from 'react-icons/lu';
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
        <LuLoader className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/erp/consultas"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span style={{fontSize:"12px"}}>◀</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span style={{fontSize:"14px"}}>🎤</span>
              Gravação & Documentos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Grave a consulta, transcreva e gere documentos automaticamente
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
              href={`/dashboard/erp/consultas/${id}/documentos`}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <LuFileText className="w-4 h-4" />
              Ver Documentos ({generatedDocs.length})
            </Link>
          )}
        </div>
      </div>

      {/* Appointment Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <LuPawPrint className="w-4 h-4 text-violet-600" />
            <span className="font-medium text-gray-900 dark:text-white">{appointment.pet.name}</span>
            <span className="text-gray-500">({appointment.pet.species}{appointment.pet.breed ? ` - ${appointment.pet.breed}` : ''})</span>
          </div>
          <div className="flex items-center gap-2">
            <LuUser className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 dark:text-gray-300">{appointment.tutor.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <LuCalendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 dark:text-gray-300">
              {new Date(appointment.date).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{fontSize:"14px"}}>🩺</span>
            <span className="text-gray-700 dark:text-gray-300">{appointment.user.name}</span>
          </div>
        </div>
        {appointment.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <strong>Motivo:</strong> {appointment.description}
          </p>
        )}
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setStep('record')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 'record'
              ? 'bg-violet-600 text-white'
              : hasTranscription || hasAnalysis
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
          }`}
        >
          <span style={{fontSize:"14px"}}>🎤</span>
          1. Gravar & Transcrever
        </button>
        <span style={{fontSize:"14px"}}>→</span>
        <button
          onClick={() => (hasTranscription || hasAnalysis) && setStep('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 'generate'
              ? 'bg-violet-600 text-white'
              : generatedDocs.length > 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
          }`}
          disabled={!hasTranscription && !hasAnalysis}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <LuFileText className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documentos Prontos!
            </h3>
            <p className="text-sm text-gray-500">
              {generatedDocs.length} documento(s) gerado(s) para esta consulta
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {generatedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <LuFileText className="w-5 h-5 text-violet-600" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <Link
              href={`/dashboard/erp/consultas/${id}/documentos`}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all"
            >
              <LuFileText className="w-5 h-5" />
              Visualizar e Baixar Documentos
            </Link>
            <button
              onClick={() => setStep('generate')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"
            >
              <span style={{fontSize:"14px"}}>🧠</span>
              Gerar Mais Documentos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
