'use client';

import { LuSave, LuClock, LuSend } from 'react-icons/lu';

interface ActionButtonsProps {
  onSaveDraft: () => Promise<void>;
  onSchedule: () => Promise<void>;
  onSendNow: () => Promise<void>;
  isSending: boolean;
  isFormValid: boolean;
  hasScheduledDate: boolean;
}

export const ActionButtons = ({
  onSaveDraft,
  onSchedule,
  onSendNow,
  isSending,
  isFormValid,
  hasScheduledDate
}: ActionButtonsProps) => {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-50 rounded-xl">
          <LuSend className="w-5 h-5 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Ações</h3>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={onSaveDraft}
          disabled={isSending || !isFormValid}
          className="w-full px-6 py-4 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 group"
        >
          <LuSave className="w-4 h-4 group-hover:text-gray-900" />
          <span>{isSending ? 'Salvando...' : 'Salvar Rascunho'}</span>
        </button>

        <button
          onClick={onSchedule}
          disabled={isSending || !isFormValid || !hasScheduledDate}
          className="w-full px-6 py-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center space-x-2 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <LuClock className="w-4 h-4 relative z-10" />
          <span className="relative z-10">{isSending ? 'Agendando...' : 'Agendar Envio'}</span>
        </button>

        <button
          onClick={onSendNow}
          disabled={isSending || !isFormValid}
          className="w-full px-6 py-4 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 flex items-center justify-center space-x-2 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <LuSend className="w-4 h-4 relative z-10" />
          <span className="relative z-10">{isSending ? 'Enviando...' : 'Enviar Agora'}</span>
        </button>
      </div>
    </div>
  );
};
