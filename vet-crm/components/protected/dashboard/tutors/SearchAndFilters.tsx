import { LuSearch, LuDownload } from 'react-icons/lu';

interface SearchAndFiltersProps {
  searchTerm: string;
  filterStatus: 'all' | 'active' | 'inactive';
  onSearchChange: (value: string) => void;
  onFilterChange: (status: 'all' | 'active' | 'inactive') => void;
}

export default function SearchAndFilters({
  searchTerm,
  filterStatus,
  onSearchChange,
  onFilterChange
}: SearchAndFiltersProps) {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Barra de Pesquisa */}
        <div className="md:col-span-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LuSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou telefone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </div>

        {/* Filtro de Status */}
        <div className="md:col-span-3">
          <div className="flex items-center space-x-2">
            <span style={{fontSize:"14px"}}>⌕</span>
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        {/* Botão Exportar */}
        <div className="md:col-span-3">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/50">
            <LuDownload className="w-5 h-5" />
            <span className="font-semibold">Exportar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
