import { useState, useEffect } from 'react';
import { BoardFormData } from '@/types/board-form';

export function useBoard(boardId?: string) {
  const [board, setBoard] = useState<BoardFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) {
      setLoading(false);
      return;
    }

    const fetchBoard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/boards/${boardId}`);
        
        if (!response.ok) {
          throw new Error('Erro ao carregar board');
        }
        
        const data = await response.json();
        
        // Converter os dados da API para o formato do formulário
        setBoard({
          name: data.name,
          description: data.description || '',
          color: data.color || 'bg-blue-500',
          type: data.type || 'APPOINTMENT',
        });
      } catch (err) {
        console.error('Erro ao buscar board:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [boardId]);

  return { board, loading, error };
}
