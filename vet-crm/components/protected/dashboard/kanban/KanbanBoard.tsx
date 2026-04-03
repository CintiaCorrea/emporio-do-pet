"use client";

import { useState, useEffect, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Appointment, KanbanColumn, KanbanCard } from "@/types";
import { BoardType } from "@/types/board";
import KanbanColumnComponent from "./KanbanColumn";
import NewColumnModal from "./modals/NewColumnModal";
import NewLeadCardModal from "./modals/NewLeadCardModal";
import { LuLoader, LuPlus } from "react-icons/lu";

const SYSTEM_BOARD_NAMES = new Set<string>([
  'Agendamentos',
  'Consultas',
  'Tratamentos',
  'Internações',
]);

const COLUMN_TO_STATUS_MAP: Record<string, Record<string, string>> = {
  APPOINTMENT: {
    'Agendada': 'SCHEDULED',
    'Confirmada': 'CONFIRMED',
    'Em Andamento': 'IN_PROGRESS',
    'Concluída': 'COMPLETED',
    'Cancelada': 'CANCELLED',
  },
  CONSULTATION: {
    'Agendada': 'SCHEDULED',
    'Aguardando': 'CONFIRMED',
    'Em Atendimento': 'IN_PROGRESS',
    'Finalizada': 'COMPLETED',
    'Cancelada': 'CANCELLED',
  },
  HOSPITALIZATION: {
    'Admissão': 'ADMITTED',
    'Em Tratamento': 'IN_TREATMENT',
    'Observação': 'OBSERVATION',
    'Alta Programada': 'DISCHARGE_SCHEDULED',
    'Alta': 'DISCHARGED',
  },
  TREATMENT: {
    'Pendente': 'PENDING',
    'Em Andamento': 'IN_PROGRESS',
    'Aplicado': 'APPLIED',
    'Concluído': 'COMPLETED',
    'Cancelado': 'CANCELLED',
  },
};

function detectBoardTypeFromName(name: string): BoardType {
  const normalizedName = name.toLowerCase().trim();
  if (normalizedName === 'consultas' || normalizedName === 'consulta') {
    return 'CONSULTATION';
  }
  if (normalizedName === 'tratamentos' || normalizedName === 'tratamento') {
    return 'TREATMENT';
  }
  if (normalizedName === 'internações' || normalizedName === 'internacoes' || 
      normalizedName === 'internação' || normalizedName === 'internacao') {
    return 'HOSPITALIZATION';
  }
  if (normalizedName.includes('lead') || normalizedName.includes('vendas') || normalizedName.includes('sales')) {
    return 'LEAD';
  }
  if (normalizedName === 'agendamentos' || normalizedName === 'agendamento') {
    return 'APPOINTMENT';
  }
  return 'TASK';
}

interface KanbanBoardProps {
  boardId: string;
  boardName?: string;
  boardType?: BoardType;
}

const KanbanBoard = ({ boardId, boardName = "CRM", boardType: propBoardType = "APPOINTMENT" }: KanbanBoardProps) => {
  const effectiveBoardType = useMemo(() => {
    const detectedFromName = detectBoardTypeFromName(boardName);
    if (detectedFromName !== 'APPOINTMENT') {
      return detectedFromName;
    }
    return propBoardType;
  }, [boardName, propBoardType]);

  const isLeadBoard = effectiveBoardType === 'LEAD' || effectiveBoardType === 'SALES' || effectiveBoardType === 'CLIENT';
  const isSystemBoard = SYSTEM_BOARD_NAMES.has(boardName);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leadCards, setLeadCards] = useState<{ id: string; title: string; columnId: string; position: number; leadId?: string; metadata?: Record<string, unknown> }[]>([]);
  const [statuses, setStatuses] = useState<KanbanColumn[]>([]);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const boardResponse = await fetch(`/api/boards/${boardId}`);
        if (!boardResponse.ok) {
          if (boardResponse.status === 404) {
            throw new Error('Board não encontrado');
          }
          throw new Error('Erro ao carregar board');
        }
        
        const board = await boardResponse.json();
        setStatuses(board.columns || []);
        
        const allAppointments: Appointment[] = [];
        const allLeadCards: typeof leadCards = [];
        board.columns?.forEach((column: KanbanColumn) => {
          column.cards?.forEach((card: KanbanCard) => {
            if (card.appointment) {
              allAppointments.push({
                ...card.appointment,
                status: column.name,
              });
            }
            if ((card as any).leadId || (card as any).metadata?.leadId) {
              allLeadCards.push({
                id: card.id,
                title: card.title,
                columnId: card.columnId,
                position: card.position,
                leadId: (card as any).leadId,
                metadata: (card as any).metadata,
              });
            }
          });
        });
        
        setAppointments(allAppointments);
        setLeadCards(allLeadCards);
        
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

  const handleRenameColumn = async (columnId: string, newName: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error('Erro ao renomear coluna');
      }

      setStatuses(prev => 
        prev.map(column => 
          column.id === columnId ? { ...column, name: newName } : column
        )
      );

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

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const message =
          (errData &&
            (errData.error ||
              (Array.isArray(errData.message) ? errData.message.join(', ') : errData.message) ||
              errData.message)) ||
          `Erro ao excluir coluna (HTTP ${response.status})`;
        throw new Error(message);
      }

      setStatuses(prev => prev.filter(col => col.id !== columnId));
      setAppointments(prev => prev.filter(app => app.status !== 
        statuses.find(col => col.id === columnId)?.name
      ));
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      throw error;
    }
  };

  const handleStatusChange = async (id: string, newColumnName: string) => {
    try {
      if (effectiveBoardType === 'TREATMENT') {
        setAppointments((prev) =>
          prev.map((app) => (app.id === id ? { ...app, status: newColumnName } : app))
        );
        return;
      }

      const statusMap = COLUMN_TO_STATUS_MAP[effectiveBoardType];
      const isHospitalization = effectiveBoardType === 'HOSPITALIZATION';

      const endpoint = isHospitalization
        ? `/api/hospitalizations/${id}`
        : `/api/appointments/${id}`;

      const erpStatus = statusMap?.[newColumnName] || newColumnName;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: erpStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || "Failed to update status");
      }
      
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newColumnName } : app))
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

  const createConsultation = async (taskData: Omit<Appointment, "id">) => {
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
      throw new Error(errorData.error || "Failed to create consultation");
    }
    
    return response.json();
  };

  const createHospitalization = async (taskData: Omit<Appointment, "id">) => {
    const response = await fetch("/api/hospitalizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tutorId: taskData.tutorId,
        petId: taskData.petId || undefined,
        userId: taskData.userId,
        reason: taskData.description || 'Internação',
        dailyRate: taskData.value || 0,
        notes: taskData.notes,
        priority: 'MEDIUM',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || "Failed to create hospitalization");
    }
    
    return response.json();
  };

  const createTreatment = async (taskData: Omit<Appointment, "id">) => {
    const appointmentResponse = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tutorId: taskData.tutorId,
        petId: taskData.petId || undefined,
        userId: taskData.userId,
        date: taskData.date.toISOString(),
        duration: taskData.duration || 30,
        description: `Consulta para tratamento: ${taskData.description || ''}`,
        notes: taskData.notes,
        value: taskData.value,
        status: 'IN_PROGRESS',
        paymentStatus: 'PENDING',
      }),
    });

    if (!appointmentResponse.ok) {
      const errorData = await appointmentResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || "Falha ao criar consulta para tratamento");
    }

    const appointment = await appointmentResponse.json();

    const treatmentResponse = await fetch("/api/treatments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointment.id,
        petId: appointment.pet?.id || taskData.petId,
        description: taskData.description || 'Tratamento',
        cost: taskData.value || 0,
      }),
    });

    if (!treatmentResponse.ok) {
      const errorData = await treatmentResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || "Falha ao criar tratamento");
    }

    return appointment;
  };

  const handleAddTask = async (taskData: Omit<Appointment, "id">) => {
    try {
      let newRecord: Appointment;
      let cardTitle: string;

      if (effectiveBoardType === 'TREATMENT') {
        newRecord = await createTreatment(taskData);
        cardTitle = `Tratamento - ${newRecord.pet?.name || 'Pet'}`;
      } else if (effectiveBoardType === 'HOSPITALIZATION') {
        newRecord = await createHospitalization(taskData);
        cardTitle = `Internação - ${newRecord.pet?.name || 'Pet'}`;
      } else {
        newRecord = await createConsultation(taskData);
        cardTitle = `Consulta de ${newRecord.pet?.name || 'Pet'}`;
      }
      
      if (!isSystemBoard) {
        const firstColumn = statuses[0];
        if (firstColumn) {
          const cardResponse = await fetch(`/api/columns/${firstColumn.id}/cards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: cardTitle,
              appointmentId: newRecord.id,
              position: appointments.length,
            }),
          });
          
          if (!cardResponse.ok) {
            const errorData = await cardResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(errorData.error || "Failed to create card");
          }
        }
      }
      
      setAppointments((prev) => [...prev, newRecord]);

      if (isSystemBoard) {
        const boardResponse = await fetch(`/api/boards/${boardId}`);
        if (boardResponse.ok) {
          const board = await boardResponse.json();
          setStatuses(board.columns || []);
          const allAppointments: Appointment[] = [];
          board.columns?.forEach((column: KanbanColumn) => {
            column.cards?.forEach((card: KanbanCard) => {
              if (card.appointment) {
                allAppointments.push({
                  ...card.appointment,
                  status: column.name,
                });
              }
            });
          });
          setAppointments(allAppointments);
        }
      }
      
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      const entityName = effectiveBoardType === 'TREATMENT' ? 'tratamento' : effectiveBoardType === 'HOSPITALIZATION' ? 'internação' : 'consulta';
      alert(error instanceof Error ? error.message : `Erro ao criar ${entityName}. Tente novamente.`);
    }
  };

  const handleAddLeadCard = async (leadId: string, leadName: string) => {
    try {
      const firstColumn = statuses[0];
      if (!firstColumn) {
        alert("Crie uma coluna primeiro.");
        return;
      }

      const cardResponse = await fetch(`/api/columns/${firstColumn.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: leadName,
          leadId: leadId,
          position: firstColumn.cards?.length || 0,
          metadata: { leadId },
        }),
      });

      if (!cardResponse.ok) {
        const errorData = await cardResponse.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || "Falha ao criar card");
      }

      const newCard = await cardResponse.json();
      setLeadCards((prev) => [...prev, { id: newCard.id, title: leadName, columnId: firstColumn.id, position: newCard.position, leadId, metadata: { leadId } }]);
      setIsLeadModalOpen(false);

      const boardResponse = await fetch(`/api/boards/${boardId}`);
      if (boardResponse.ok) {
        const board = await boardResponse.json();
        setStatuses(board.columns || []);
      }
    } catch (error) {
      console.error("Erro ao adicionar lead:", error);
      alert(error instanceof Error ? error.message : "Erro ao adicionar lead");
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

  const getEntityLabel = (count: number) => {
    if (isLeadBoard) {
      return count === 1 ? 'lead' : 'leads';
    }
    if (effectiveBoardType === 'HOSPITALIZATION') {
      return count === 1 ? 'internação' : 'internações';
    }
    return count === 1 ? 'consulta' : 'consultas';
  };

  const entityCount = isLeadBoard ? leadCards.length : appointments.length;

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
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
      <div className="w-full">
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
      <div className="min-h-[calc(100vh-4rem)] w-full">
        <div className="w-full py-4 sm:py-6 px-4 sm:px-6">
          <div className="flex flex-col items-start sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{boardName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {!isLeadBoard && (
                  <>
                    Receita Total:{" "}
                    <span className="font-bold text-green-600">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRevenue)}
                    </span>
                    {" • "}
                  </>
                )}
                <span className="text-gray-500">
                  {entityCount} {getEntityLabel(entityCount)}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isLeadBoard && (
                <button
                  onClick={() => setIsLeadModalOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 sm:px-4 py-2 rounded-md hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base flex items-center gap-1.5"
                >
                  <LuPlus className="w-4 h-4" /> Adicionar Lead
                </button>
              )}
              {!isSystemBoard && (
                <button
                  onClick={() => setIsColumnModalOpen(true)}
                  className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  + Nova Coluna
                </button>
              )}
            </div>
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
                  onRenameColumn={handleRenameColumn}
                  isSystemBoard={isSystemBoard}
                />
              ))
            )}
          </div>
          {!isSystemBoard && (
            <NewColumnModal
              isOpen={isColumnModalOpen}
              onClose={() => setIsColumnModalOpen(false)}
              onSubmit={handleAddColumn}
            />
          )}
          {isLeadBoard && (
            <NewLeadCardModal
              isOpen={isLeadModalOpen}
              onClose={() => setIsLeadModalOpen(false)}
              onSubmit={handleAddLeadCard}
            />
          )}
        </div>
      </div>
    </DndProvider>
  );
};

export default KanbanBoard;
