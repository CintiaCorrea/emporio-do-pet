export interface ContactInput {
  id?: string;
  type: 'MOBILE' | 'PHONE' | 'BUSINESS';
  number: string;
  isWhatsApp: boolean;
  observations?: string;
  isPrimary: boolean;
}

export interface Tutor {
  id: string;
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY';
  name: string;
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
  contacts: ContactInput[];
  createdAt: string;
  updatedAt: string;
}
