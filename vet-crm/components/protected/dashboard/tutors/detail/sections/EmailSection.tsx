import { LuMail, LuSend } from 'react-icons/lu';
import Link from 'next/link';
import { Tutor } from '@/types/tutor-detail';

interface EmailSectionProps {
  tutor: Tutor;
}

export default function EmailSection({ tutor }: EmailSectionProps) {
  if (!tutor.email) return null;

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <LuMail className="w-5 h-5 text-blue-500" />
        E-mail
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-medium text-sm sm:text-base break-all">{tutor.email}</p>
          <p className="text-sm text-gray-500 mt-1">
            {tutor.acceptsEmail ? (
              <span className="text-green-600">✓ Aceita receber e-mails</span>
            ) : (
              <span className="text-red-600">✗ Não aceita receber e-mails</span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
          {tutor.acceptsEmail && (
            <Link
              href={{
                pathname: '/dashboard/newsletter',
                query: { 
                  recipientEmail: tutor.email,
                  recipientName: tutor.name,
                  recipientType: 'TUTOR'
                }
              }}
              className="px-3 sm:px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
            >
              <LuSend className="w-4 h-4" />
              <span className="hidden xs:inline">Enviar Newsletter</span>
              <span className="xs:hidden">Newsletter</span>
            </Link>
          )}
          <button
            onClick={() => window.open(`mailto:${tutor.email}`, '_blank')}
            className="px-3 sm:px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
          >
            <LuMail className="w-4 h-4" />
            <span className="hidden xs:inline">E-mail Direto</span>
            <span className="xs:hidden">E-mail</span>
          </button>
        </div>
      </div>
    </div>
  );
}
