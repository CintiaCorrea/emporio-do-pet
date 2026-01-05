import Link from 'next/link';
import { LuPlus, LuInbox } from 'react-icons/lu';

interface EmptyStateProps {
  boardsCount: number;
}

export default function EmptyState({ boardsCount }: EmptyStateProps) {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-12 text-center">
      <LuInbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-800 mb-3">
        {boardsCount === 0 ? 'Nenhum board criado ainda' : 'Nenhum board encontrado'}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {boardsCount === 0 
          ? 'Comece criando seu primeiro board para organizar seus trabalhos.' 
          : 'Tente ajustar seus termos de busca.'
        }
      </p>
      <Link
        href="/dashboard/crm/pipeline/new"
        className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-2 relative overflow-hidden w-full sm:w-auto justify-center mx-auto"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        <LuPlus className="w-4 h-4 relative z-10" />
        <span className="relative z-10">
          {boardsCount === 0 ? 'Criar Primeiro Board' : 'Criar Novo Board'}
        </span>
      </Link>
    </div>
  );
}
