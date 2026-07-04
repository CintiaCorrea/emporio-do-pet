import Link from 'next/link';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  tutorId?: string;
}

export default function ErrorState({ error, onRetry, tutorId }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg mb-2" style={{ fontWeight: 500, color: '#1F2A2E' }}>
        {error || 'Tutor não encontrado'}
      </h3>
      <p className="mb-6" style={{ color: '#5C6B70' }}>
        Não foi possível carregar os dados do tutor.
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={onRetry}
          className="px-6 py-2 text-white transition-colors"
          style={{ background: '#009AAC', borderRadius: '9px' }}
        >
          Tentar novamente
        </button>
        <Link
          href="/dashboard/erp/tutores"
          className="px-6 py-2 transition-colors"
          style={{ background: '#fff', border: '1px solid #E8E2D6', color: '#5C6B70', borderRadius: '9px' }}
        >
          Voltar para a lista
        </Link>
      </div>
    </div>
  );
}
