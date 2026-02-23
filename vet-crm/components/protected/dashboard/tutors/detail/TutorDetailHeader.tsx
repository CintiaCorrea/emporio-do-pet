import Link from 'next/link';
import { LuArrowLeft, LuPencil, LuTrash2 } from 'react-icons/lu';
import { Tutor } from '@/types/tutor-detail';
import { getPersonTypeText, formatDate } from '@/utils/tutor-detail-formatters';

interface TutorDetailHeaderProps {
  tutor: Tutor;
  onDelete: () => void;
}

export default function TutorDetailHeader({ tutor, onDelete }: TutorDetailHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/erp/tutores"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl transition-all duration-300"
          >
            <LuArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
              {tutor.name}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              {getPersonTypeText(tutor.type)} • Cadastrado em {formatDate(tutor.createdAt)}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex flex-nowrap min-w-max gap-2 flex-shrink-0">
            <Link
              href={`/dashboard/erp/tutores/${tutor.id}/editar`}
              className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all duration-300 text-sm sm:text-base"
            >
              <LuPencil className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
              <span className="sm:hidden">Editar</span>
            </Link>
            <button
              onClick={onDelete}
              className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all duration-300 text-sm sm:text-base"
            >
              <LuTrash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
              <span className="sm:hidden">Excluir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
