export interface Contact {
  id: string;
  type: 'MOBILE' | 'PHONE' | 'BUSINESS';
  number: string;
  isWhatsApp: boolean;
  observations?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  status: string;
  gender?: string;
  birthDate?: string;
  avatar?: string;
  _count?: {
    appointments: number;
  };
}

export interface Tutor {
  id: string;
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY';
  name: string;
  isActive: boolean;
  email?: string;
  nationality: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  cpf?: string;
  rg?: string;
  birthDate?: string;
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
  formDate?: string;
  inclusionDate?: string;
  contacts: Contact[];
  pets: Pet[];
  _count: {
    pets: number;
    appointments: number;
    contacts: number;
  };
  createdAt: string;
  updatedAt: string;
}
