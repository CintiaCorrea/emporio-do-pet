// Enums
export type Role = 'ADMIN' | 'VETERINARIAN' | 'RECEPTIONIST';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'CONFIRMED' | 'IN_PROGRESS';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
export type ProductType = 'MEDICINE' | 'VACCINE' | 'SERVICE';
export type BoardType = 'APPOINTMENT' | 'TASK' | 'PROJECT';

// Novos Enums para Tutor, Contact e Pet
export type PersonType = 'INDIVIDUAL' | 'LEGAL_ENTITY';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type ContactType = 'MOBILE' | 'PHONE' | 'BUSINESS';
export type PetStatus = 'ACTIVE' | 'DECEASED' | 'TRANSFERRED' | 'INACTIVE';
export type PetSpecies = 'CANINE' | 'FELINE' | 'BIRD' | 'RODENT' | 'REPTILE' | 'OTHER';
export type SterilizationStatus = 'NOT_STERILIZED' | 'STERILIZED' | 'SCHEDULED';
export type CoatType = 'SHORT' | 'LONG' | 'SMOOTH' | 'WAVY' | 'CURLY' | 'GOLDEN' | 'BLACK' | 'WHITE' | 'BROWN' | 'MIXED';

// Tipos para metadata do KanbanCard
export interface KanbanCardMetadata {
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
  dueDate?: Date;
  assignedTo?: string[];
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
  customFields?: Record<string, string | number | boolean | Date>;
}

// User Models
export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  role: Role;
  permissions: string[];
  accounts: Account[];
  sessions: Session[];
  boards: Board[];
  appointments: Appointment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
  user: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  user: User;
  createdAt: Date;
  updatedAt: Date;
}

// CRM Models - Versões mínimas para criação
export interface MinimalClient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MinimalPet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  tutorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MinimalTreatment {
  id: string;
  description: string;
  cost: number;
  createdAt: Date;
  updatedAt: Date;
}

// CRM Models - Versões completas
export interface Tutor {
  id: string;
  type: PersonType;
  name: string;
  email?: string;
  nationality?: string;
  gender?: Gender;
  cpf?: string;
  rg?: string;
  birthDate?: Date;
  profession?: string;
  howFoundUs?: string;
  acceptsEmail: boolean;
  acceptsWhatsApp: boolean;
  acceptsSMS: boolean;
  acceptsSmsCampaign: boolean;
  cep?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  referencePoint?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  observations?: string;
  tags: string[];
  formDate?: Date;
  inclusionDate?: Date;
  contacts: Contact[];
  recipients: any[];
  pets: Pet[];
  appointments: Appointment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  type: ContactType;
  number: string;
  isWhatsApp: boolean;
  observations?: string;
  isPrimary: boolean;
  tutorId: string;
  tutor: Tutor;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  pets: Pet[];
  appointments: Appointment[];
  createdAt: Date;
  updatedAt: Date;
}

// ATUALIZADO: Pet agora relaciona com Tutor
export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  status: PetStatus;
  gender?: Gender;
  sterilization?: SterilizationStatus;
  birthDate?: Date;
  coat?: CoatType;
  coatColor?: string;
  weight?: number;
  microchip?: string;
  avatar?: string;
  observations?: string;
  allergies: string[];
  medicalNotes?: string;
  tutorId: string;
  tutor: Tutor;
  appointments: Appointment[];
  treatments: Treatment[];
  createdAt: Date;
  updatedAt: Date;
}

// ATUALIZADO: Appointment com novos campos
export interface Appointment {
  id: string;
  tutorId: string;
  petId: string;
  userId: string;
  date: Date;
  duration: number;
  description?: string;
  notes?: string;
  value: number;
  status: string; // ✅ MUDOU: string para compatibilidade com colunas livres
  paymentStatus: PaymentStatus;
  tutor: Tutor;
  pet: Pet;
  user: User;
  treatments: Treatment[];
  kanbanCard?: KanbanCard;
  boardId?: string;
  board?: Board;
  createdAt: Date;
  updatedAt: Date;
}

export interface Treatment {
  id: string;
  appointmentId: string;
  petId: string;
  description: string;
  cost: number;
  productId?: string;
  appointment: Appointment;
  pet: Pet;
  product?: Product;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock: number;
  treatments: Treatment[];
  createdAt: Date;
  updatedAt: Date;
}

// Kanban Models
export interface Board {
  id: string;
  name: string;
  type: BoardType;
  description?: string;
  color: string;
  progress: number;
  totalDeals: number;
  favorite: boolean;
  userId: string;
  user: User;
  columns: KanbanColumn[];
  appointments: Appointment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color?: string;
  boardId: string;
  board: Board;
  cards: KanbanCard[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  position: number;
  columnId: string;
  column: KanbanColumn;
  appointmentId?: string;
  appointment?: Appointment;
  metadata?: KanbanCardMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Props para componentes
export interface KanbanCardProps {
  appointment: Appointment;
  onStatusChange: (id: string, status: string) => void; // ✅ MUDOU: status como string
}

export interface KanbanColumnProps {
  index: number;
  status: string; // ✅ MUDOU: status como string para colunas livres
  appointments: Appointment[];
  onStatusChange: (id: string, status: string) => void; // ✅ MUDOU: status como string
  onAddTask: (task: Omit<Appointment, "id">) => void;
  onMoveColumn: (fromIndex: number, toIndex: number) => void;
}

// ✅ CORRIGIDO: Tipos para formulários e modais - ATUALIZADOS para novo schema
export interface NewTaskData {
  date: Date;
  notes?: string;
  value: number;
  tutorId: string;
  petId?: string;
  userId: string;
  description?: string;
  duration?: number;
  status?: string; // ✅ MUDOU: string para compatibilidade
  paymentStatus?: PaymentStatus;
  pet?: {
    name: string;
    species: PetSpecies;
    breed?: string;
    tutorId: string;
  };
  treatments?: TreatmentInput[];
  columnId?: string;
}

export interface TreatmentInput {
  id?: string; // ✅ ADICIONADO: id opcional
  description: string;
  cost: number;
  productId?: string;
}

// ✅ CORRIGIDO: TaskModalData sem conflitos
export interface TaskModalData {
  // Campos obrigatórios com valores padrão
  date: Date;
  value: number;
  tutorId: string;
  userId: string;
  
  // Campos opcionais
  notes?: string;
  petId?: string;
  description?: string;
  duration?: number;
  status?: string;
  paymentStatus?: PaymentStatus;
  columnId?: string;
  
  // Para criação de pet
  pet?: {
    name: string;
    species: PetSpecies;
    breed?: string;
    tutorId: string;
  };
  
  treatments?: TreatmentInput[];
  
  // Campos legados para compatibilidade
  client?: MinimalClient;
  clientId?: string;
}

export interface CreateAppointmentData {
  tutorId: string;
  petId: string;
  userId: string;
  date: Date;
  description?: string;
  notes?: string;
  value: number;
  duration?: number;
  status?: string;
  paymentStatus?: PaymentStatus;
}

export interface UpdateAppointmentData {
  date?: Date;
  description?: string;
  notes?: string;
  value?: number;
  status?: string;
  paymentStatus?: PaymentStatus;
  duration?: number;
  userId?: string;
}

// Para drag and drop
export interface DragItem {
  type: 'APPOINTMENT' | 'COLUMN';
  id: string;
  index?: number;
  status?: string;
}

// Para filtros e busca
export interface AppointmentFilter {
  status?: string[];
  paymentStatus?: PaymentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  tutorId?: string;
  petId?: string;
  userId?: string;
}

// Para estatísticas
export interface DashboardStats {
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

// Tipos utilitários
export type StatusType = string;

// ✅ CORRIGIDO: Função utilitária para criar appointment com valores padrão - ATUALIZADA
export const createDefaultAppointment = (data: Partial<Appointment> = {}): Omit<Appointment, 'id'> => {
  const now = new Date();
  
  return {
    tutorId: data.tutorId || '',
    petId: data.petId || '',
    userId: data.userId || '',
    date: data.date || now,
    duration: data.duration || 30,
    description: data.description || '',
    notes: data.notes || '',
    value: data.value || 0,
    status: data.status || 'SCHEDULED',
    paymentStatus: data.paymentStatus || 'PENDING',
    tutor: data.tutor || {
      id: data.tutorId || '',
      type: 'INDIVIDUAL',
      name: 'Tutor',
      email: '',
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
      updatedAt: now
    } as Tutor,
    pet: data.pet || {
      id: data.petId || '',
      name: 'Pet',
      species: 'CANINE',
      status: 'ACTIVE',
      allergies: [],
      tutorId: data.tutorId || '',
      tutor: {} as Tutor,
      appointments: [],
      treatments: [],
      createdAt: now,
      updatedAt: now
    } as Pet,
    user: data.user || {
      id: data.userId || '',
      name: 'Veterinário',
      email: '',
      role: 'VETERINARIAN',
      permissions: [],
      accounts: [],
      sessions: [],
      boards: [],
      appointments: [],
      createdAt: now,
      updatedAt: now
    } as User,
    treatments: data.treatments || [],
    createdAt: now,
    updatedAt: now
  };
};

// ✅ NOVO: Tipo para resposta da API de appointments
export interface AppointmentsResponse {
  appointments: Appointment[];
  totals: {
    value: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ✅ NOVO: Tipo para criação de pet
export interface CreatePetData {
  name: string;
  species: PetSpecies;
  breed?: string;
  tutorId: string;
  gender?: Gender;
  birthDate?: Date;
  weight?: number;
  observations?: string;
}

// ✅ NOVO: Tipo para criação de tutor
export interface CreateTutorData {
  name: string;
  email?: string;
  type?: PersonType;
  contacts: {
    number: string;
    type: ContactType;
    isWhatsApp?: boolean;
    isPrimary?: boolean;
  }[];
}

// ✅ NOVO: Tipo para resposta da API de tutores
export interface TutorsResponse {
  tutors: Tutor[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ✅ NOVO: Tipo para resposta da API de pets
export interface PetsResponse {
  pets: Pet[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ✅ NOVO: Tipo para resposta da API de usuários
export interface UsersResponse {
  users: User[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
