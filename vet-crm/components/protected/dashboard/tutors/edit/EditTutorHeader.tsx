import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

interface EditTutorHeaderProps {
  tutorName: string;
  tutorId: string;
}

export default function EditTutorHeader({ tutorName, tutorId }: EditTutorHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <Link 
          href={`/dashboard/erp/tutores/${tutorId}`}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-300"
        >
          <LuArrowLeft className="w-5 h-5" />
          <span>Voltar para Detalhes</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Editar Tutor
          </h1>
          <p className="text-gray-600 mt-2">
            Atualize as informações de {tutorName}
          </p>
        </div>
      </div>
    </div>
  );
}
