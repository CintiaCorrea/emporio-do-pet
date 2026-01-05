interface ErrorStateProps {
  error: string;
  sidebarOpen: boolean;
  onRetry: () => void;
}

export default function ErrorState({ error, sidebarOpen, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar boards</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
