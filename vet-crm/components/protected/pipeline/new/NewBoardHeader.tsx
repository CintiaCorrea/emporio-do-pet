import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

export default function NewBoardHeader() {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/crm/pipelines"
            className="group p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <LuArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Criar Novo Board
            </h1>
            <p className="text-gray-600 mt-2">
              Configure um novo pipeline para gerenciar seus deals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
