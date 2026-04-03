'use client';

import { useState, useEffect } from 'react';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import LoadingState from '@/components/protected/pipeline/LoadingState';
import ErrorState from '@/components/protected/pipeline/ErrorState';
import PipelineHeader from '@/components/protected/pipeline/PipelineHeader';
import StatsCards from '@/components/protected/pipeline/StatsCards';
import SearchAndFilters from '@/components/protected/pipeline/SearchAndFilters';
import BoardCard from '@/components/protected/pipeline/BoardCard';
import BoardListItem from '@/components/protected/pipeline/BoardListItem';
import EmptyState from '@/components/protected/pipeline/EmptyState';
import { Board } from '@/types/board';

const SYSTEM_BOARD_NAMES: ReadonlySet<string> = new Set([
  'Agendamentos',
  'Consultas',
  'Tratamentos',
  'Internações',
]);

function isSystemBoard(name: string): boolean {
  return SYSTEM_BOARD_NAMES.has(name);
}

export default function PipelinePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  // Buscar boards da API
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setLoading(true);

        await fetch('/api/boards/default/ensure', { method: 'POST' }).catch(() => {});

        const response = await fetch('/api/boards');
        
        if (!response.ok) {
          let message = 'Erro ao carregar boards';
          try {
            const errData = await response.json();
            message =
              (errData &&
                (errData.error ||
                  (Array.isArray(errData.message) ? errData.message.join(', ') : errData.message) ||
                  errData.message)) ||
              message;
          } catch {
            // ignore parse errors
          }
          throw new Error(message);
        }
        
        const data = await response.json();
        setBoards(data);
      } catch (err) {
        console.error('Erro ao buscar boards:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, []);

  // Função para atualizar favorito
  const toggleFavorite = async (boardId: string) => {
    try {
      const boardToUpdate = boards.find(board => board.id === boardId);
      if (!boardToUpdate) return;

      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          favorite: !boardToUpdate.favorite
        }),
      });

      if (response.ok) {
        setBoards(boards.map(board =>
          board.id === boardId
            ? { ...board, favorite: !board.favorite }
            : board
        ));
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
    }
  };

  // Função para deletar board
  const deleteBoard = async () => {
    if (!boardToDelete) return;

    try {
      const response = await fetch(`/api/boards/${boardToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBoards(boards.filter(board => board.id !== boardToDelete.id));
      } else {
        throw new Error('Erro ao excluir board');
      }
    } catch (error) {
      console.error('Erro ao excluir board:', error);
      throw error instanceof Error ? error : new Error('Erro ao excluir board');
    }
  };

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (board.description && board.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <PipelineHeader />
        <StatsCards boards={boards} />
        <SearchAndFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Boards Grid/List */}
        {filteredBoards.length === 0 ? (
          <EmptyState boardsCount={boards.length} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredBoards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onToggleFavorite={toggleFavorite}
                onDelete={(boardId) => {
                  const selectedBoard = boards.find((b) => b.id === boardId);
                  if (selectedBoard) setBoardToDelete(selectedBoard);
                }}
                isSystemBoard={isSystemBoard(board.name)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
            {filteredBoards.map((board, index) => (
              <BoardListItem
                key={board.id}
                board={board}
                onToggleFavorite={toggleFavorite}
                onDelete={(boardId) => {
                  const selectedBoard = boards.find((b) => b.id === boardId);
                  if (selectedBoard) setBoardToDelete(selectedBoard);
                }}
                isLast={index === filteredBoards.length - 1}
                isSystemBoard={isSystemBoard(board.name)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!boardToDelete}
        entityLabel="Board"
        itemName={boardToDelete?.name ?? ''}
        consequenceText="Esta ação não pode ser desfeita. O board e suas colunas serão removidos."
        onClose={() => setBoardToDelete(null)}
        onConfirm={deleteBoard}
      />
    </div>
  );
}
