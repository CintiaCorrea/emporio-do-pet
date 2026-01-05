// types/bot-conversa.ts
import { PetSpecies, Gender, PersonType, ContactType, PetStatus, SterilizationStatus, CoatType } from '@prisma/client';

export interface BotConversaMessage {
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  value: string;
  fromMe?: boolean;
}

export interface BotConversaContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface BotConversaWebhookPayload {
  type: 'message' | 'status' | 'other';
  contact: BotConversaContact;
  message: BotConversaMessage;
  timestamp: string;
}

export interface ConversationFlow {
  step: string;
  data: Record<string, any>;
  appointmentData?: Partial<AppointmentData>;
}

export interface AppointmentData {
  tutorName: string;
  tutorPhone: string;
  tutorEmail?: string;
  petName: string;
  petSpecies: PetSpecies;
  petBreed?: string;
  appointmentDate: string;
  appointmentTime: string;
  description: string;
  duration: number;
}

// Interface para validação
export interface ValidatedAppointmentData {
  tutorName: string;
  tutorPhone: string;
  tutorEmail: string;
  petName: string;
  petSpecies: PetSpecies;
  petBreed: string;
  appointmentDate: string;
  appointmentTime: string;
  description: string;
  duration: number;
}

// Interface para mapeamento de espécies
export interface SpeciesMap {
  [key: string]: PetSpecies;
}
