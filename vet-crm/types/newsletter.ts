import { NewsletterStatus, RecipientType } from '@prisma/client';

export { NewsletterStatus, RecipientType };

// Interfaces básicas para evitar dependências circulares
export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: Date;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  pets: Pet[];
}

// NOVO: Interface Tutor
export interface Tutor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  acceptsEmail: boolean;
  acceptsWhatsApp: boolean;
  acceptsSMS: boolean;
  // Outros campos que podem ser úteis
  pets?: Pet[];
}

export interface Newsletter {
  id?: string;
  title: string;
  content: string;
  subject: string;
  scheduledFor?: Date;
  status: NewsletterStatus;
  recipientType: RecipientType;
  userId: string;
  recipients: NewsletterRecipient[];
  sentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ATUALIZADO: NewsletterRecipient para incluir tutorId
export interface NewsletterRecipient {
  id?: string;
  newsletterId: string;
  clientId?: string;
  tutorId?: string;
  leadEmail?: string;
  client?: Client;
  tutor?: Tutor;
}

export interface NewsletterLog {
  id: string;
  newsletterId: string;
  clientId?: string;
  tutorId?: string;
  leadEmail?: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  error?: string;
}

export interface NewsletterTemplate {
  id: string;
  name: string;
  content: string;
  subject: string;
}

// ATUALIZADO: CreateNewsletterInput para incluir tutorId
export interface CreateNewsletterInput {
  title: string;
  subject: string;
  content: string;
  scheduledFor?: Date;
  status: NewsletterStatus;
  recipientType: RecipientType;
  recipients: {
    clientId?: string;
    tutorId?: string;
    leadEmail?: string;
  }[];
}

// ATUALIZADO: NewsletterWithRelations para incluir tutor
export interface NewsletterWithRelations extends Newsletter {
  recipients: (NewsletterRecipient & { client?: Client; tutor?: Tutor })[];
  _count?: {
    recipients: number;
    newsletterLogs: number;
  };
}
