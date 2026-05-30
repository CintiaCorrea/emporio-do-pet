import Link from 'next/link';
import { LuPencil, LuTrash } from 'react-icons/lu';
import { Board } from '@/types/board';

interface BoardListItemProps {
  board: Board;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
  isSystemBoard? (() => null) : boolean;
}

export default function BoardListItem({ board, onToggleFavorite, onDelete, isLast, isSystemBoard }: BoardListItemProps) {
  return (
    <div className={`group flex flex-col lg:flex-row lg:items-center p-6 hover:bg-gray-50/50 transition-all duration-300 gap-4 ${
      !isLast ? 'border-b border-white/20' : ''
    }`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-3 h-12 rounded-full ${board.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 text-lg truncate">
              {board.name}
            </h3>
            <button
              onClick={() => onToggleFavorite(board.id)}
              className="text-gray-400 hover:text-yellow-500 transition-all duration-300 hover:scale-110 flex-shrink-0"
            >
              <span style={{fontSize:"14px"}}>⭐</span>
            </button>
          </div>
          <p className="text-gray-600 text-sm truncate">
            {board.description || 'Sem descrição'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between lg:justify-end gap-6 flex-1">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{board.totalDeals}</div>
            <div className="text-xs text-gray-500">Deals</div>
          </div>
          
          <div className="w-28">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Progresso</span>
              <span>{board.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${board.color}`}
                style={{ width: `${board.progress}%` }}
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-500 min-w-20">
            {new Date(board.updatedAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
        
        <div className="flex gap-3">
          <Link
            href={`/dashboard/crm/pipeline/${board.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg text-sm"
          >
            Abrir
          </Link>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1">
            <button className="text-gray-400 hover:text-blue-600 transition-colors duration-300 p-2 hover:scale-110">
              <LuPencil className="w-4 h-4" />
            </button>
            {!isSystemBoard && (
              <button 
                onClick={() => onDelete(board.id)}
                className="text-gray-400 hover:text-red-500 transition-colors duration-300 p-2 hover:scale-110"
              >
                <LuTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
