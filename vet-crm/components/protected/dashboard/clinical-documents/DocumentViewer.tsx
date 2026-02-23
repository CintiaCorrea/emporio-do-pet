'use client';

import { useState, useRef } from 'react';
import {
  LuFileText,
  LuDownload,
  LuCopy,
  LuShare2,
  LuMail,
  LuPhone,
  LuPrinter,
  LuPencil,
  LuCheck,
  LuX,
  LuLoader,
  LuChevronLeft,
  LuSparkles,
  LuCalendar,
  LuUser,
  LuPawPrint,
} from 'react-icons/lu';
import toast from 'react-hot-toast';

interface ClinicalDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  htmlContent?: string;
  status: string;
  isAiGenerated: boolean;
  aiModel?: string;
  signedBy?: string;
  crmv?: string;
  sharedVia: string[];
  version: number;
  createdAt: string;
  appointment?: {
    id: string;
    date: string;
    description?: string;
  };
  pet?: {
    id: string;
    name: string;
    species: string;
  };
  tutor?: {
    id: string;
    name: string;
    email?: string;
    contacts?: Array<{ number: string; isWhatsApp: boolean }>;
  };
  user?: {
    id: string;
    name: string;
  };
}

interface DocumentViewerProps {
  document: ClinicalDocument;
  onBack?: () => void;
  onUpdate?: (doc: ClinicalDocument) => void;
}

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

export default function DocumentViewer({ document: doc, onBack, onUpdate }: DocumentViewerProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMethod, setShareMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [shareRecipient, setShareRecipient] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Copy content to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(doc.content);
      toast.success('Conteúdo copiado para a área de transferência!');
    } catch {
      // Fallback
      const textarea = window.document.createElement('textarea');
      textarea.value = doc.content;
      window.document.body.appendChild(textarea);
      textarea.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(textarea);
      toast.success('Conteúdo copiado!');
    }
  };

  // Print document
  const printDocument = () => {
    if (doc.htmlContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(doc.htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } else {
      window.print();
    }
  };

  // Download as PDF (using browser print)
  const downloadPdf = () => {
    if (doc.htmlContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          ${doc.htmlContent}
          <script>
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            }, 500);
          </script>
        `);
        printWindow.document.close();
      }
    }
    toast.success('Use "Salvar como PDF" na janela de impressão');
  };

  // Share via WhatsApp or Email
  const shareDocument = async () => {
    if (!shareRecipient.trim()) {
      toast.error('Informe o destinatário');
      return;
    }

    setIsSharing(true);
    try {
      if (shareMethod === 'whatsapp') {
        // Open WhatsApp with document text
        const text = encodeURIComponent(`*${doc.title}*\n\n${doc.content.substring(0, 3000)}`);
        const phone = shareRecipient.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        toast.success('WhatsApp aberto com o documento!');
      } else {
        // Send via API
        const res = await fetch(`/api/clinical-documents/${doc.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'email',
            recipient: shareRecipient,
          }),
        });

        if (res.ok) {
          toast.success('Documento enviado por email!');
        } else {
          const error = await res.json().catch(() => ({}));
          toast.error(error.error || 'Erro ao enviar email');
        }
      }

      setShowShareModal(false);
    } catch (err) {
      toast.error('Erro ao compartilhar documento');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="mt-1 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <LuChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{doc.title}</h2>
                {doc.isAiGenerated && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-xs font-medium">
                    <LuSparkles className="w-3 h-3" />
                    IA
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <LuFileText className="w-4 h-4" />
                  {TYPE_LABELS[doc.type] || doc.type}
                </span>
                {doc.pet && (
                  <span className="flex items-center gap-1">
                    <LuPawPrint className="w-4 h-4" />
                    {doc.pet.name}
                  </span>
                )}
                {doc.tutor && (
                  <span className="flex items-center gap-1">
                    <LuUser className="w-4 h-4" />
                    {doc.tutor.name}
                  </span>
                )}
                {doc.appointment?.date && (
                  <span className="flex items-center gap-1">
                    <LuCalendar className="w-4 h-4" />
                    {new Date(doc.appointment.date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              title="Copiar texto"
            >
              <LuCopy className="w-4 h-4" />
              Copiar
            </button>
            <button
              onClick={printDocument}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              title="Imprimir"
            >
              <LuPrinter className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={downloadPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              title="Baixar PDF"
            >
              <LuDownload className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Compartilhar"
            >
              <LuShare2 className="w-4 h-4" />
              Enviar
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {doc.signedBy && <span>Assinado: {doc.signedBy}</span>}
          {doc.crmv && <span>CRMV: {doc.crmv}</span>}
          <span>Versão {doc.version}</span>
          {doc.aiModel && <span>Modelo: {doc.aiModel}</span>}
          {doc.sharedVia?.length > 0 && (
            <span>Compartilhado via: {doc.sharedVia.join(', ')}</span>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {doc.htmlContent ? (
          <iframe
            ref={iframeRef}
            srcDoc={doc.htmlContent}
            className="w-full border-0"
            style={{ minHeight: '800px' }}
            title={doc.title}
          />
        ) : (
          <div className="p-8">
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
                {doc.content}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compartilhar Documento
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* Method Selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  setShareMethod('whatsapp');
                  // Auto-fill if tutor has WhatsApp
                  const contact = doc.tutor?.contacts?.find((c) => c.isWhatsApp);
                  if (contact) setShareRecipient(contact.number);
                }}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  shareMethod === 'whatsapp'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <LuPhone className="w-6 h-6 mx-auto mb-1 text-green-600" />
                <p className="text-sm font-medium">WhatsApp</p>
              </button>
              <button
                onClick={() => {
                  setShareMethod('email');
                  if (doc.tutor?.email) setShareRecipient(doc.tutor.email);
                }}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  shareMethod === 'email'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <LuMail className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                <p className="text-sm font-medium">Email</p>
              </button>
            </div>

            {/* Recipient */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {shareMethod === 'whatsapp' ? 'Número do WhatsApp' : 'Email'}
              </label>
              <input
                type={shareMethod === 'email' ? 'email' : 'tel'}
                value={shareRecipient}
                onChange={(e) => setShareRecipient(e.target.value)}
                placeholder={shareMethod === 'whatsapp' ? '5511999999999' : 'tutor@email.com'}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={shareDocument}
                disabled={isSharing || !shareRecipient.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {isSharing ? (
                  <LuLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <LuShare2 className="w-4 h-4" />
                )}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
