"use client";

import { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Appointment, KanbanColumn, KanbanCard } from "@/types";
import KanbanColumnComponent from "./KanbanColumn";
import NewColumnModal from "./modals/NewColumnModal";
import { LuLoader } from "react-icons/lu";

interface KanbanBoardProps {
  sidebarOpen: boolean;
  boardId: string;
  boardName?: string;
}

const KanbanBoard = ({ sidebarOpen, boardId, boardName = "CRM" }: KanbanBoardProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statuses, setStatuses] = useState<KanbanColumn[]>([]);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar colunas e cartões da API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Buscar board completo com colunas e cards
        const boardResponse = await fetch(`/api/boards/${boardId}`);
        if (!boardResponse.ok) {
          if (boardResponse.status === 404) {
            throw new Error('Board não encontrado');
          }
          throw new Error('Erro ao carregar board');
        }
        
        const board = await boardResponse.json();
        
        // Extrair colunas do board
        setStatuses(board.columns || []);
        
        // Extrair appointments dos cards
        const allAppointments: Appointment[] = [];
        board.columns?.forEach((column: KanbanColumn) => {
          column.cards?.forEach((card: KanbanCard) => {
            if (card.appointment) {
              allAppointments.push(card.appointment);
            }
          });
        });
        
        setAppointments(allAppointments);
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };
    
    if (boardId) {
      fetchData();
    }
  }, [boardId]);

  // Função para renomear coluna
  const handleRenameColumn = async (columnId: string, newName: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error('Erro ao renomear coluna');
      }

      // Atualizar estado local
      setStatuses(prev => 
        prev.map(column => 
          column.id === columnId 
            ? { ...column, name: newName }
            : column
        )
      );

      // Atualizar appointments com o novo nome do status
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.status === statuses.find(col => col.id === columnId)?.name
            ? { ...appointment, status: newName }
            : appointment
        )
      );

    } catch (error) {
      console.error('Erro ao renomear coluna:', error);
      throw error;
    }
  };

  // Função para excluir coluna
  const handleDeleteColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir coluna');
      }

      // Atualizar estado local removendo a coluna
      setStatuses(prev => prev.filter(col => col.id !== columnId));
      
      // Também remover os appointments associados a essa coluna
      setAppointments(prev => prev.filter(app => app.status !== 
        statuses.find(col => col.id === columnId)?.name
      ));

    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      throw error;
    }
  };

  // ✅ CORRIGIDO: status como string
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || "Failed to update appointment status");
      }
      
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert(error instanceof Error ? error.message : "Erro ao atualizar status");
    }
  };

  const handleAddColumn = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 50 || statuses.some((col) => col.name === trimmedName)) {
      alert("Nome inválido ou já existente.");
      return;
    }
    try {
      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: trimmedName, 
          position: statuses.length,
          color: '#6B7280'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || "Failed to add column");
      }
      
      const newColumn: KanbanColumn = await response.json();
      setStatuses((prev) => [...prev, newColumn]);
      setIsColumnModalOpen(false);
    } catch (error) {
      console.error("Erro ao adicionar coluna:", error);
      alert(error instanceof Error ? error.message : "Erro ao criar coluna. Tente novamente.");
    }
  };

  // ✅ CORRIGIDO: Função para adicionar tarefa - tratamento melhorado
  const handleAddTask = async (taskData: Omit<Appointment, "id">) => {
    try {
      console.log('Enviando dados para criar appointment:', {
        tutorId: taskData.tutorId,
        petId: taskData.petId || undefined,
        userId: taskData.userId,
        date: taskData.date,
        duration: taskData.duration || 30,
        description: taskData.description,
        notes: taskData.notes,
        value: taskData.value,
        status: taskData.status || statuses[0]?.name || 'SCHEDULED',
        paymentStatus: taskData.paymentStatus || 'PENDING',
      });

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: taskData.tutorId,
          petId: taskData.petId || undefined,
          userId: taskData.userId,
          date: taskData.date.toISOString(),
          duration: taskData.duration || 30,
          description: taskData.description,
          notes: taskData.notes,
          value: taskData.value,
          status: taskData.status || statuses[0]?.name || 'SCHEDULED',
          paymentStatus: taskData.paymentStatus || 'PENDING',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || "Failed to create appointment");
      }
      
      const newAppointment: Appointment = await response.json();
      console.log('Appointment criado com sucesso:', newAppointment);
      
      // Encontrar a primeira coluna para adicionar o card
      const firstColumn = statuses[0];
      if (firstColumn) {
        const cardResponse = await fetch(`/api/columns/${firstColumn.id}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Consulta de ${newAppointment.pet.name}`,
            appointmentId: newAppointment.id,
            position: appointments.length,
          }),
        });
        
        if (!cardResponse.ok) {
          const errorData = await cardResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || "Failed to create card");
        }
        
        console.log('Card criado com sucesso na coluna:', firstColumn.name);
      }
      
      // Atualizar a lista de appointments
      setAppointments((prev) => [...prev, newAppointment]);
      
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      alert(error instanceof Error ? error.message : "Erro ao criar agendamento. Tente novamente.");
    }
  };

  const handleMoveColumn = async (fromIndex: number, toIndex: number) => {
    try {
      const column = statuses[fromIndex];
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: toIndex }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || "Failed to move column");
      }
      
      setStatuses((prev) => {
        const newStatuses = [...prev];
        const [movedColumn] = newStatuses.splice(fromIndex, 1);
        newStatuses.splice(toIndex, 0, movedColumn);
        return newStatuses;
      });
    } catch (error) {
      console.error("Erro ao mover coluna:", error);
      alert(error instanceof Error ? error.message : "Erro ao mover coluna");
    }
  };

  const totalRevenue = appointments
    .filter((app) => !["CANCELED", "DELETED"].includes(app.status))
    .reduce((sum, app) => sum + app.value, 0);

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-100 transition-all duration-300 ${
        sidebarOpen ? "ml-48 sm:ml-64" : "ml-12 sm:ml-16"
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-gray-600">
            <LuLoader className="w-6 h-6 animate-spin" />
            <span>Carregando board...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gray-100 transition-all duration-300 ${
        sidebarOpen ? "ml-48 sm:ml-64" : "ml-12 sm:ml-16"
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar board</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className={`min-h-screen bg-gray-100 transition-all duration-300 ${
          sidebarOpen ? "ml-48 sm:ml-64" : "ml-12 sm:ml-16"
        } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}
      >
        <div className="w-full py-4 sm:py-6 px-4 sm:px-6">
          <div className="flex flex-col items-start sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{boardName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Receita Total:{" "}
                <span className="font-bold text-green-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRevenue)}
                </span>
                {" • "}
                <span className="text-gray-500">
                  {appointments.length} {appointments.length === 1 ? 'consulta' : 'consultas'}
                </span>
              </p>
            </div>
            <button
              onClick={() => setIsColumnModalOpen(true)}
              className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base self-start sm:self-auto"
            >
              + Nova Coluna
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 overflow-x-auto snap-x snap-mandatory w-full pb-4">
            {statuses.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8 w-full">
                Nenhuma coluna criada. Clique em &quot;Nova Coluna&quot; para começar.
              </div>
            ) : (
              statuses.map((status, index) => (
                <KanbanColumnComponent
                  key={status.id}
                  index={index}
                  status={status.name}
                  columnId={status.id}
                  appointments={appointments.filter((app) => app.status === status.name)}
                  onStatusChange={handleStatusChange}
                  onAddTask={handleAddTask}
                  onMoveColumn={handleMoveColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onRenameColumn={handleRenameColumn} // ✅ AGORA ESTÁ SENDO PASSADA
                />
              ))
            )}
          </div>
          <NewColumnModal
            isOpen={isColumnModalOpen}
            onClose={() => setIsColumnModalOpen(false)}
            onSubmit={handleAddColumn}
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default KanbanBoard;
