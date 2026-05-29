'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LuFileText,
  LuLoader,
  LuSparkles,
  LuCalendar,
  LuStethoscope,
  LuClipboardList,
  LuPill,
  LuHeart,
  LuShield,
  LuFlask,
  LuSyringe,
  LuDownload,
  LuCopy,
  LuShare2,
} from 'react-icons/lu';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<string, any> = {
  ANAMNESIS: LuClipboardList,
  PRESCRIPTION: LuPill,
  DIAGNOSIS: LuStethoscope,
  TUTOR_REPORT: LuHeart,
  MEDICAL_CERTIFICATE: LuShield,
  EXAM_REQUEST: LuFlask,
  SURGICAL_REPORT: LuSyringe,
  DISCHARGE_SUMMARY: LuFileText,
  VACCINATION_CARD: LuFileText,
  GENERAL: LuFileText,
};

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
  GENERAL: 'Documento Geral',
};

const TYPE_COLORS: Record<string, string> = {
  ANAMNESIS: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  PRESCRIPTION: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  DIAGNOSIS: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  TUTOR_REPORT: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
  MEDICAL_CERTIFICATE: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  EXAM_REQUEST: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  SURGICAL_REPORT: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  DISCHARGE_SUMMARY: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
};

interface DocumentTimelineProps {
  petId?: string;
  tutorId?: string;
  limit?: number;
}

export default function DocumentTimeline({ petId, tutorId, limit = 10 }: DocumentTimelineProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchDocuments();
  }, [petId, tutorId]);

  const fetchDocuments = async () => {
    try {
      let url = '/api/clinical-documents?';
      if (petId) url += `petId=${petId}&`;
      if (tutorId) url += `tutorId=${tutorId}&`;
      url += `limit=${limit}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      console.error('Error fetching documents');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copiado!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LuLoader className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <LuFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Nenhum documento clínico encontrado</p>
      </div>
    );
  }

  // Group by appointment date
  const grouped = documents.reduce((acc: any, doc: any) => {
    const date = doc.appointment?.date
      ? new Date(doc.appointment.date).toLocaleDateString('pt-BR')
      : 'Sem data';
    if (!acc[date]) acc[date] = [];
    acc[date].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <LuFileText className="w-5 h-5 text-violet-600" />
          Documentos Clínicos
        </h3>
        <span className="text-sm text-gray-500">{total} documento(s)</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {Object.entries(grouped).map(([date, docs]: [string, any]) => (
          <div key={date} className="relative mb-6">
            {/* Date marker */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center relative z-10">
                <LuCalendar className="w-5 h-5 text-violet-600" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{date}</span>
            </div>

            {/* Documents for this date */}
            <div className="ml-16 space-y-3">
              {docs.map((doc: any) => {
                const Icon = TYPE_ICONS[doc.type] || LuFileText;
                const colorClass = TYPE_COLORS[doc.type] || 'text-gray-600 bg-gray-100';

                return (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                              {doc.title}
                            </h4>
                            {doc.isAiGenerated && (
                              <LuSparkles className="w-3.5 h-3.5 text-violet-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {TYPE_LABELS[doc.type]} • {doc.user?.name || 'Veterinário'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {doc.content?.substring(0, 120)}...
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(doc.content)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                          title="Copiar"
                        >
                          <LuCopy className="w-3.5 h-3.5" />
                        </button>
                        {doc.appointment?.id && (
                          <Link
                            href={`/dashboard/erp/consultas/${doc.appointment.id}/documentos?doc=${doc.id}`}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-violet-600"
                            title="Visualizar"
                          >
                            <LuFileText className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
