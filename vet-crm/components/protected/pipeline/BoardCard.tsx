import Link from 'next/link';
import { LuStar, LuArrowRight, LuPencil, LuTrash2 } from 'react-icons/lu';
import { Board } from '@/types/board';

interface BoardCardProps {
  board: Board;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function BoardCard({ board, onToggleFavorite, onDelete }: BoardCardProps) {
  return (
    <div className="group bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105 overflow-hidden">
      <div className={`h-2 ${board.color}`} />
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors flex-1 pr-3">
            {board.name}
          </h3>
          <button
            onClick={() => onToggleFavorite(board.id)}
            className="text-gray-400 hover:text-yellow-500 transition-all duration-300 hover:scale-110 flex-shrink-0"
          >
            <LuStar className={`w-5 h-5 ${board.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </button>
        </div>
        
        <p className="text-gray-600 text-sm mb-6 leading-relaxed line-clamp-2">
          {board.description || 'Sem descrição'}
        </p>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-700 mb-2">
              <span className="font-medium">Progresso</span>
              <span className="font-semibold">{board.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${board.color} transition-all duration-500`}
                style={{ width: `${board.progress}%` }}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span>{board.totalDeals} deals</span>
            </div>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
              {new Date(board.updatedAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
          <Link
            href={`/dashboard/crm/pipeline/${board.id}`}
            className="group/link text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-2 transition-all duration-300 hover:gap-3"
          >
            <span>Abrir Board</span>
            <LuArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-1" />
          </Link>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Link
              href={`/dashboard/crm/pipeline/${board.id}/editar`}
              className="text-gray-400 hover:text-blue-600 transition-colors duration-300 p-1 hover:scale-110"
            >
              <LuPencil className="w-4 h-4" />
            </Link>
            <button 
              onClick={() => onDelete(board.id)}
              className="text-gray-400 hover:text-red-500 transition-colors duration-300 p-1 hover:scale-110"
            >
              <LuTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
