import { LuSearch } from 'react-icons/lu';

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function SearchAndFilters({ 
  searchTerm, 
  onSearchChange, 
  viewMode, 
  onViewModeChange 
}: SearchAndFiltersProps) {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LuSearch className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar boards por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <span style={{fontSize:"14px"}}>⌕</span>
            <span>Filtrar</span>
          </button>
          <div className="flex gap-1 bg-white/50 border border-gray-300/50 rounded-2xl p-1 backdrop-blur-sm">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-xl transition-all duration-300 ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-current rounded-sm" />
                ))}
              </div>
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-xl transition-all duration-300 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <div className="w-4 h-4 flex flex-col gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full h-0.5 bg-current rounded-sm" />
                ))}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
