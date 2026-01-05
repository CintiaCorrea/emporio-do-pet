import Link from 'next/link';
import { LuPlus } from 'react-icons/lu';

export default function TutorsHeader() {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Tutores
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os tutores cadastrados no sistema
          </p>
        </div>
        <Link
          href="/dashboard/erp/tutores/novo"
          className="group mt-4 sm:mt-0 flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
        >
          <LuPlus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
          <span className="font-semibold">Novo Tutor</span>
        </Link>
      </div>
    </div>
  );
}
