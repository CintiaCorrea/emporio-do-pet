"use client";

import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { KanbanColumnProps, TaskModalData, Appointment, Tutor, Pet, Treatment, TreatmentInput } from "@/types";
import { STATUS_BG_COLORS, STATUS_TEXT_COLORS } from "@/constants/status";
import { formatCurrency } from "@/utils/formatters";
import KanbanCard from "./KanbanCard";
import NewTaskModal from "./modals/NewTaskModal";
import ConfirmDeleteColumnModal from "./modals/ConfirmDeleteColumnModal";
import { LuTrash2, LuEllipsisVertical, LuPlus, LuPencil, LuCheck, LuX } from "react-icons/lu";

// Função para atribuir cores dinamicamente com base no nome do status
const getColorForStatus = (status: string, colors: { [key: string]: string }) => {
  const colorKeys = Object.keys(colors);
  const index = Math.abs(hashString(status) % colorKeys.length);
  return colors[colorKeys[index]] || "bg-gray-100";
};

// Função simples de hash para strings
const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

interface KanbanColumnExtendedProps extends KanbanColumnProps {
  columnId: string;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, newName: string) => void;
  isSystemBoard?: boolean;
}

const KanbanColumn = ({ 
  index, 
  status, 
  appointments, 
  onStatusChange, 
  onAddTask, 
  onMoveColumn,
  columnId,
  onDeleteColumn,
  onRenameColumn,
  isSystemBoard = false
}: KanbanColumnExtendedProps) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newColumnName, setNewColumnName] = useState(status);
  
  const [{ isColumnDragging }, columnDrag] = useDrag({
    type: "COLUMN",
    item: { index, status },
    collect: (monitor) => ({
      isColumnDragging: monitor.isDragging(),
    }),
  });

  const [{ isColumnOver }, columnDrop] = useDrop({
    accept: "COLUMN",
    hover: (item: { index: number; status: string }) => {
      if (item.index !== index) {
        onMoveColumn(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isColumnOver: monitor.isOver(),
    }),
  });

  const [{ isAppointmentOver }, appointmentDrop] = useDrop({
    accept: "APPOINTMENT",
    drop: (item: { id: string }) => onStatusChange(item.id, status),
    collect: (monitor) => ({ isAppointmentOver: monitor.isOver() }),
  });

  columnDrag(columnDrop(appointmentDrop(columnRef)));

  const statusBgColor = getColorForStatus(status, STATUS_BG_COLORS);
  const statusTextColor = getColorForStatus(status, STATUS_TEXT_COLORS);

  const totalValue = appointments.reduce((sum, appointment) => sum + appointment.value, 0);
  const terminalStatuses = ["CANCELED", "DELETED"];
  const isTerminal = terminalStatuses.includes(status);

  // Função para excluir coluna
  const openDeleteModal = () => {
    setIsMenuOpen(false);
    setIsDeleteModalOpen(true);
  };

  // Função para iniciar a edição do nome
  const handleStartEdit = () => {
    setNewColumnName(status);
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  // Função para salvar o novo nome
  const handleSaveEdit = async () => {
    if (!newColumnName.trim()) {
      alert("O nome da coluna não pode estar vazio");
      return;
    }

    if (newColumnName.trim() === status) {
      setIsEditing(false);
      return;
    }

    try {
      await onRenameColumn(columnId, newColumnName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao renomear coluna:', error);
      alert('Erro ao renomear coluna. Tente novamente.');
    }
  };

  // Função para cancelar a edição
  const handleCancelEdit = () => {
    setNewColumnName(status);
    setIsEditing(false);
  };

  // ✅ CORRIGIDO: Função para criar appointment completo
  const createCompleteAppointment = (taskData: TaskModalData): Omit<Appointment, "id"> => {
    const now = new Date();

    // ✅ VALIDAÇÕES CORRIGIDAS
    if (!taskData.tutorId) {
      throw new Error("Tutor ID é obrigatório");
    }

    if (!taskData.date) {
      throw new Error("Data é obrigatória");
    }

    if (!taskData.value) {
      throw new Error("Valor é obrigatório");
    }

    if (!taskData.userId) {
      throw new Error("Veterinário é obrigatório");
    }

    // ✅ CRIAR TUTOR (mínimo)
    const completeTutor: Tutor = {
      id: taskData.tutorId,
      type: 'INDIVIDUAL',
      name: taskData.client?.name || "Tutor",
      email: taskData.client?.email || "",
      acceptsEmail: true,
      acceptsWhatsApp: true,
      acceptsSMS: true,
      acceptsSmsCampaign: false,
      tags: [],
      contacts: [],
      recipients: [],
      pets: [],
      appointments: [],
      createdAt: now,
      updatedAt: now,
    };

    // ✅ CRIAR PET (mínimo)
    const completePet: Pet = {
      id: taskData.petId || "",
      name: taskData.pet?.name || "Pet",
      species: taskData.pet?.species || 'CANINE',
      breed: taskData.pet?.breed,
      status: 'ACTIVE',
      allergies: [],
      tutorId: taskData.tutorId,
      tutor: completeTutor,
      appointments: [],
      treatments: [],
      createdAt: now,
      updatedAt: now,
    };

    // ✅ CRIAR TRATAMENTOS (se houver)
    const completeTreatments: Treatment[] = (taskData.treatments || []).map((treatment: TreatmentInput) => ({
      id: treatment.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
      appointmentId: "",
      petId: taskData.petId || "",
      description: treatment.description,
      cost: treatment.cost,
      productId: treatment.productId,
      appointment: {} as Appointment,
      pet: completePet,
      product: undefined,
      createdAt: now,
      updatedAt: now,
    }));

    // ✅ RETORNAR APPOINTMENT COMPLETO
    return {
      tutorId: taskData.tutorId,
      petId: taskData.petId || "",
      userId: taskData.userId,
      date: taskData.date,
      duration: taskData.duration || 30,
      description: taskData.description || "",
      notes: taskData.notes || "",
      value: taskData.value,
      status: status, // ✅ Usa o status da coluna atual
      paymentStatus: taskData.paymentStatus || 'PENDING',
      tutor: completeTutor,
      pet: completePet,
      user: {
        id: taskData.userId,
        name: "Veterinário",
        email: "",
        role: 'VETERINARIAN',
        permissions: [],
        accounts: [],
        sessions: [],
        boards: [],
        appointments: [],
        createdAt: now,
        updatedAt: now,
      },
      treatments: completeTreatments,
      createdAt: now,
      updatedAt: now,
    };
  };

  return (
    <div
      ref={columnRef}
      className={`flex-1 w-full sm:min-w-[250px] sm:max-w-[350px] p-3 sm:p-4 rounded-lg ${
        statusBgColor
      } ${
        isColumnDragging 
          ? "opacity-50 scale-95 border-2 border-dashed border-gray-400" 
          : isColumnOver 
            ? "border-2 border-dashed border-blue-500 bg-opacity-80" 
            : isAppointmentOver 
              ? "bg-opacity-80 border-2 border-dashed border-blue-500" 
              : "border border-gray-200"
      } min-h-[300px] sm:min-h-[400px] transition-all duration-200 snap-center cursor-move relative group`}
      role="region"
      aria-label={`Coluna ${status}`}
    >
      <ConfirmDeleteColumnModal
        isOpen={isDeleteModalOpen}
        columnName={status}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          await onDeleteColumn(columnId);
        }}
      />
      {/* Header da Coluna */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className={`text-lg sm:text-xl font-bold ${statusTextColor} bg-transparent border-b-2 border-white border-opacity-50 focus:outline-none focus:border-white w-full`}
                  autoFocus
                  aria-label="Novo nome da coluna"
                />
                <button
                  onClick={handleSaveEdit}
                  className="text-green-600 hover:text-green-800 transition-colors p-1"
                  aria-label="Salvar nome"
                >
                  <LuCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-red-600 hover:text-red-800 transition-colors p-1"
                  aria-label="Cancelar edição"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h2 className={`text-lg sm:text-xl font-bold ${statusTextColor} truncate`}>
                  {status}
                </h2>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </>
            )}
          </div>
          
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-blue-600 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 z-10 flex-shrink-0"
                aria-label={`Adicionar nova tarefa na coluna ${status}`}
              >
                <LuPlus className="w-4 h-4" />
              </button>
              
              {!isSystemBoard && (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-gray-400 hover:text-gray-600 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 z-10 flex-shrink-0"
                    aria-label={`Opções da coluna ${status}`}
                  >
                    <LuEllipsisVertical className="w-4 h-4" />
                  </button>
                  
                  {isMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsMenuOpen(false)}
                      />
                      
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <button
                          onClick={handleStartEdit}
                          className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors rounded-t-lg"
                        >
                          <LuPencil className="w-4 h-4" />
                          <span className="font-medium">Renomear Coluna</span>
                        </button>
                        
                        <div className="border-t border-gray-200">
                          <button
                            onClick={openDeleteModal}
                            className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transition-colors rounded-b-lg"
                          >
                            <LuTrash2 className="w-4 h-4" />
                            <span className="font-medium">
                              Excluir Coluna
                            </span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 font-medium">
            {appointments.length} {appointments.length === 1 ? 'consulta' : 'consultas'}
          </span>
          <span className={`font-bold ${isTerminal ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>

      {/* Lista de Consultas */}
      {appointments.length === 0 ? (
        <div className="text-gray-500 text-xs sm:text-sm text-center py-6 sm:py-8">
          Nenhuma consulta neste status. <br />
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="text-blue-600 hover:underline mt-2"
          >
            Criar uma nova consulta
          </button>
        </div>
      ) : (
        appointments
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((appointment) => (
            <KanbanCard
              key={appointment.id}
              appointment={appointment}
              onStatusChange={onStatusChange}
            />
          ))
      )}
      
      <NewTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={(task) => {
          try {
            const completeAppointment = createCompleteAppointment(task);
            onAddTask(completeAppointment);
            setIsTaskModalOpen(false);
          } catch (error) {
            console.error("Erro ao criar appointment:", error);
            alert(error instanceof Error ? error.message : "Erro ao criar agendamento");
          }
        }}
      />
    </div>
  );
};

export default KanbanColumn;
