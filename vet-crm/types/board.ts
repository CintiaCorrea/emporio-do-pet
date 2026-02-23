// types/board.ts

// Tipos base
export type BoardType = 'APPOINTMENT' | 'CONSULTATION' | 'HOSPITALIZATION' | 'TASK' | 'PROJECT';

export interface Board {
  id: string;
  name: string;
  type: BoardType;
  description: string | null;
  color: string;
  progress: number;
  totalDeals: number;
  favorite: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Tipo para criação de board
export interface CreateBoardInput {
  name: string;
  type?: BoardType;
  description?: string;
  color?: string;
}

// Tipo para Appointment (ajuste conforme seu modelo real)
export interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  customerId?: string | null;
  cardId: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos para as relações
export interface KanbanCard {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  columnId: string;
  appointment?: Appointment | null; // CORRIGIDO - usando o tipo Appointment
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color: string;
  boardId: string;
  cards: KanbanCard[];
  createdAt: string;
  updatedAt: string;
}

// Tipo para resposta da API com relações
export interface BoardWithColumns extends Board {
  columns: KanbanColumn[];
}

// Tipo para card com relações completas
export interface KanbanCardWithAppointment extends KanbanCard {
  appointment: Appointment | null;
}
