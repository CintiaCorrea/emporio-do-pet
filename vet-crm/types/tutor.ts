export interface Contact {
  id: string;
  type: string;
  number: string;
  isWhatsApp: boolean;
  isPrimary: boolean;
}

export interface Tutor {
  id: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  nationality: string;
  gender?: string;
  petsCount?: number;
  status: 'active' | 'inactive';
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  tutors: Tutor[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
