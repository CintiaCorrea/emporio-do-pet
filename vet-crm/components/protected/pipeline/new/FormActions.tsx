import { LuPlus, LuLoader, LuSave } from 'react-icons/lu';

interface FormActionsProps {
  isLoading: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}

export default function FormActions({ isLoading, onCancel, isEdit = false }: FormActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-100">
      <button
        type="submit"
        disabled={isLoading}
        className="group px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center gap-3 relative overflow-hidden flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        {isLoading ? (
          <LuLoader className="w-5 h-5 animate-spin relative z-10" />
        ) : isEdit ? (
          <LuSave className="w-5 h-5 relative z-10" />
        ) : (
          <LuPlus className="w-5 h-5 relative z-10" />
        )}
        <span className="relative z-10">
          {isLoading ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar Alterações' : 'Criar Board')}
        </span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="px-8 py-4 text-base font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>Cancelar</span>
      </button>
    </div>
  );
}
