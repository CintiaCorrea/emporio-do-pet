interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="p-12 text-center">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">Erro ao carregar tutores</h3>
      <p className="mt-2 text-gray-600">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
