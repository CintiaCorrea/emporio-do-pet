'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LuFileText,
  LuLoader,
  LuPlus
  LuDownload
  LuSparkles,
  LuCalendar,
  LuPawPrint,
  LuUser,
  LuTrash} from 'react-icons/lu';
import toast from 'react-hot-toast';
import DocumentViewer from '@/components/protected/dashboard/clinical-documents/DocumentViewer';

const TYPE_LABELS: Record<string, string> = {
  ANAMNESIS: 'Anamnese',
  PRESCRIPTION: 'Prescrição',
  DIAGNOSIS: 'Diagnóstico',
  TUTOR_REPORT: 'Relatório Tutor',
  MEDICAL_CERTIFICATE: 'Atestado',
  EXAM_REQUEST: 'Solicitação de Exames',
  SURGICAL_REPORT: 'Relatório Cirúrgico',
  DISCHARGE_SUMMARY: 'Sumário de Alta',
  VACCINATION_CARD: 'Carteira de Vacinação',
  GENERAL: 'Documento Geral'};

const TYPE_COLORS: Record<string, string> = {
  ANAMNESIS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PRESCRIPTION: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DIAGNOSIS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TUTOR_REPORT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  MEDICAL_CERTIFICATE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  EXAM_REQUEST: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  SURGICAL_REPORT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DISCHARGE_SUMMARY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'};

export default function DocumentosConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDocId = searchParams.get('doc');

  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    fetchDocuments();
  }, [id]);

  useEffect(() => {
    if (selectedDocId && documents.length > 0) {
      const doc = documents.find((d) => d.id === selectedDocId);
      if (doc) setSelectedDoc(doc);
    }
  }, [selectedDocId, documents]);

  const fetchDocuments = async () => {
    try {
      // Fetch appointment info
      const appointmentRes = await fetch(`/api/appointments/${id}`);
      if (appointmentRes.ok) {
        const appointmentData = await appointmentRes.json();
        setAppointment(appointmentData);
      }

      // Fetch documents for this appointment
      const res = await fetch(`/api/clinical-documents/appointment/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || data || []);
      }
    } catch {
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      const res = await fetch(`/api/clinical-documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDoc?.id === docId) setSelectedDoc(null);
        toast.success('Documento excluído');
      }
    } catch {
      toast.error('Erro ao excluir documento');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LuLoader className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // If a document is selected, show the viewer
  if (selectedDoc) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <DocumentViewer
          document={selectedDoc}
          onBack={() => {
            setSelectedDoc(null);
            router.push(`/dashboard/erp/consultas/${id}/documentos`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/erp/consultas`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span style={{fontSize:"12px"}}>◀</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LuFileText className="w-6 h-6 text-violet-600" />
              Documentos da Consulta
            </h1>
            {appointment && (
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <LuPawPrint className="w-3.5 h-3.5" />
                  {appointment.pet?.name}
                </span>
                <span className="flex items-center gap-1">
                  <LuUser className="w-3.5 h-3.5" />
                  {appointment.tutor?.name}
                </span>
                <span className="flex items-center gap-1">
                  <LuCalendar className="w-3.5 h-3.5" />
                  {new Date(appointment.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/erp/consultas/${id}/gravar`}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <LuPlus className="w-4 h-4" />
            Gerar Mais Documentos
          </Link>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <LuFileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum documento gerado
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Grave a consulta e gere documentos automaticamente com IA
          </p>
          <Link
            href={`/dashboard/erp/consultas/${id}/gravar`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all"
          >
            <span style={{fontSize:"14px"}}>🎤</span>
            Iniciar Gravação
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => {
                setSelectedDoc(doc);
                router.push(`/dashboard/erp/consultas/${id}/documentos?doc=${doc.id}`);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    TYPE_COLORS[doc.type] || 'bg-gray-100 text-gray-700'
                  }`}>
                    {TYPE_LABELS[doc.type] || doc.type}
                  </span>
                  {doc.isAiGenerated && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-xs">
                      <LuSparkles className="w-3 h-3" />
                      IA
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDocument(doc.id);
                  }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all"
                >
                  <LuTrash className="w-4 h-4" />
                </button>
              </div>

              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                {doc.title}
              </h4>

              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {doc.content?.substring(0, 150)}...
              </p>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(doc.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="flex items-center gap-2">
                  {doc.sharedVia?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span style={{fontSize:"14px"}}>↗</span>
                      Compartilhado
                    </span>
                  )}
                  <span>v{doc.version}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
