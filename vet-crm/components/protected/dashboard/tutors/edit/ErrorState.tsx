import Link from 'next/link';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  tutorId? (() => null) : string;
}

export default function ErrorState({ error, onRetry, tutorId }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {error || 'Tutor não encontrado'}
      </h3>
      <p className="text-gray-600 mb-6">
        Não foi possível carregar os dados do tutor.
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Tentar novamente
        </button>
        <Link
          href="/dashboard/erp/tutores"
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Voltar para a lista
        </Link>
      </div>
    </div>
  );
}
