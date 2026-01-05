import { useState, useCallback } from 'react';
import { Appointment, KanbanColumn } from '@/types';

export const useKanbanBoard = (boardId: string) => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boards/${boardId}`);
      
      if (!response.ok) {
        throw new Error('Board não encontrado');
      }
      
      const board = await response.json();
      setColumns(board.columns || []);
      
      // Extrair appointments de todos os cards
      const allAppointments: Appointment[] = [];
      board.columns?.forEach((column: KanbanColumn) => {
        column.cards?.forEach((card) => {
          if (card.appointment) {
            allAppointments.push(card.appointment);
          }
        });
      });
      
      setAppointments(allAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // NOVA FUNÇÃO: Adicionar coluna
  const addColumn = useCallback(async (name: string, color?: string) => {
    try {
      setError(null);
      
      // Determinar a próxima posição
      const nextPosition = columns.length;

      console.log(`🆕 Criando nova coluna: ${name}, posição: ${nextPosition}`);

      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          color: color || '#3B82F6',
          position: nextPosition
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || "Failed to add column");
      }
      
      const newColumn: KanbanColumn = await response.json();

      // Atualizar estado local
      setColumns(prev => [...prev, newColumn]);

      console.log('✅ Coluna criada com sucesso!', newColumn.id);
      return newColumn;

    } catch (err) {
      console.error('💥 Erro ao criar coluna:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar coluna');
      throw err;
    }
  }, [boardId, columns.length]);

  // NOVA FUNÇÃO: Atualizar coluna
  const updateColumn = useCallback(async (columnId: string, updates: Partial<KanbanColumn>) => {
    try {
      setError(null);

      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            id: columnId,
            ...updates
          }
        ])
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar coluna');
      }

      const updatedColumns = await response.json();

      // Atualizar estado local
      setColumns(updatedColumns);

      return updatedColumns;

    } catch (err) {
      console.error('💥 Erro ao atualizar coluna:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar coluna');
      throw err;
    }
  }, [boardId]);

  // NOVA FUNÇÃO: Reordenar colunas
  const reorderColumns = useCallback(async (reorderedColumns: KanbanColumn[]) => {
    try {
      setError(null);

      // Preparar dados para atualização
      const updateData = reorderedColumns.map((column, index) => ({
        id: column.id,
        position: index,
        name: column.name,
        color: column.color
      }));

      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao reordenar colunas');
      }

      const updatedColumns = await response.json();

      // Atualizar estado local
      setColumns(updatedColumns);

      return updatedColumns;

    } catch (err) {
      console.error('💥 Erro ao reordenar colunas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao reordenar colunas');
      throw err;
    }
  }, [boardId]);

  const moveAppointment = useCallback(async (
    appointmentId: string, 
    newColumnId: string, 
    newPosition: number
  ) => {
    try {
      // Encontrar o card atual
      const currentCard = columns
        .flatMap(col => col.cards)
        .find(card => card.appointmentId === appointmentId);

      if (!currentCard) {
        throw new Error('Card não encontrado');
      }

      console.log(`🔄 Movendo card ${currentCard.id} para coluna ${newColumnId}, posição ${newPosition}`);

      // Atualizar no backend usando a nova API
      const response = await fetch(`/api/cards/${currentCard.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnId: newColumnId,
          position: newPosition
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao mover card');
      }

      const updatedCard = await response.json();

      // Atualizar estado local de forma otimista
      setColumns(prevColumns => {
        const newColumns = [...prevColumns];
        
        // Remover do column antigo
        newColumns.forEach(col => {
          if (col.id === currentCard.columnId) {
            col.cards = col.cards.filter(card => card.id !== currentCard.id);
          }
        });
        
        // Adicionar ao novo column
        const targetColumn = newColumns.find(col => col.id === newColumnId);
        if (targetColumn) {
          targetColumn.cards.push({
            ...currentCard,
            columnId: newColumnId,
            position: newPosition,
            column: targetColumn
          });
          // Reordenar cards por posição
          targetColumn.cards.sort((a, b) => a.position - b.position);
        }
        
        return newColumns;
      });

      console.log('✅ Card movido com sucesso!');

      return updatedCard;

    } catch (err) {
      console.error('💥 Erro ao mover appointment:', err);
      
      // Reverter para dados originais em caso de erro
      await fetchBoardData();
      
      throw err;
    }
  }, [columns, fetchBoardData]);

  return {
    columns,
    appointments,
    loading,
    error,
    fetchBoardData,
    addColumn, // NOVO
    updateColumn, // NOVO
    reorderColumns, // NOVO
    moveAppointment,
    setColumns,
    setAppointments
  };
};
