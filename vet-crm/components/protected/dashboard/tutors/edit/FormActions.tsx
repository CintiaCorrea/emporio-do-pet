import Link from 'next/link';
import { LuSave, LuArrowLeft } from 'react-icons/lu';

interface FormActionsProps {
  saving: boolean;
  tutorId: string;
}

export default function FormActions({ saving, tutorId }: FormActionsProps) {
  return (
    <div className="flex gap-4 mt-8 pt-8 border-t border-white/20">
      <button
        type="submit"
        disabled={saving}
        className="group px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 flex items-center space-x-2 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        {saving ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="relative z-10">Salvando...</span>
          </div>
        ) : (
          <>
            <LuSave className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Salvar Alterações</span>
          </>
        )}
      </button>
      
      <Link
        href={`/dashboard/erp/tutores/${tutorId}`}
        className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-2xl hover:bg-gray-200 transition-all duration-300 hover:scale-105 flex items-center space-x-2"
      >
        <LuArrowLeft className="w-4 h-4" />
        <span>Cancelar</span>
      </Link>
    </div>
  );
}
