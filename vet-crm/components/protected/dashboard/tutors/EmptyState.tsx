import { LuUser, LuSearch } from 'react-icons/lu';

interface EmptyStateProps {
  type: 'no-tutors' | 'no-results';
  searchTerm? (() => null) : string;
}

export default function EmptyState({ type, searchTerm }: EmptyStateProps) {
  if (type === 'no-tutors') {
    return (
      <div className="p-12 text-center">
        <LuUser className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Nenhum tutor cadastrado
        </h3>
        <p className="mt-2 text-gray-600">
          Comece cadastrando o primeiro tutor
        </p>
      </div>
    );
  }

  return (
    <div className="p-12 text-center">
      <LuSearch className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        Nenhum tutor encontrado
      </h3>
      <p className="mt-2 text-gray-600">
        {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Tente ajustar os filtros de busca'}
      </p>
    </div>
  );
}
