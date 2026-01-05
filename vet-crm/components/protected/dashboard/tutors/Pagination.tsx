interface PaginationProps {
  currentCount: number;
  totalCount: number;
}

export default function Pagination({ currentCount, totalCount }: PaginationProps) {
  return (
    <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-white to-white/95">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando <span className="font-semibold">{currentCount}</span> de{' '}
          <span className="font-semibold">{totalCount}</span> tutores
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            Anterior
          </button>
          <button className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
