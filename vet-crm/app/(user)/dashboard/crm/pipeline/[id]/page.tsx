"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import KanbanBoard from "@/components/protected/dashboard/kanban/KanbanBoard";
import { LuLoader } from "react-icons/lu";
import { Board } from "@/types/board";

export default function BoardPage() {
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const boardId = params.id as string;

  // Buscar dados do board
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/boards/${boardId}`);
        
        if (!response.ok) {
          throw new Error('Board não encontrado');
        }
        
        const boardData: Board = await response.json();
        setBoard(boardData);
      } catch (err) {
        console.error('Erro ao carregar board:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (boardId) {
      fetchBoard();
    }
  }, [boardId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-3 text-gray-600">
            <LuLoader className="w-6 h-6 animate-spin" />
            <span>Carregando board...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar board</h3>
          <p className="text-red-600 mb-4">{error || 'Board não encontrado'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <KanbanBoard boardId={boardId} boardName={board.name} />
  );
}
