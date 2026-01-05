import Link from 'next/link';

interface DashboardHeaderProps {
  timeFilter: 'today' | 'week' | 'month';
  setTimeFilter: (filter: 'today' | 'week' | 'month') => void;
  onRefresh: () => void;
}

export default function DashboardHeader({ 
  timeFilter, 
  setTimeFilter, 
  onRefresh 
}: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
            Dashboard CRM
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Sistema de gestão veterinária em tempo real
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {['today', 'week', 'month'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  timeFilter === filter
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filter === 'today' && 'Hoje'}
                {filter === 'week' && 'Semana'}
                {filter === 'month' && 'Mês'}
              </button>
            ))}
          </div>
          <Link
            href="/dashboard/integracoes"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md text-sm font-medium flex items-center gap-2"
          >
            <span>⚙️</span>
            Configurações
          </Link>
          <button
            onClick={onRefresh}
            className="bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all border border-gray-200 shadow-sm hover:shadow-md text-sm font-medium flex items-center gap-2"
          >
            <span>🔄</span>
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
