import Link from 'next/link';
import { LuPlus } from 'react-icons/lu';

export default function PipelineHeader() {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Meus Pipelines
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os seus boards de trabalho
          </p>
        </div>
        <Link 
          href="/dashboard/crm/pipeline/new"
          className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-2 relative overflow-hidden w-full sm:w-auto justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <LuPlus className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Novo Board</span>
        </Link>
      </div>
    </div>
  );
}
