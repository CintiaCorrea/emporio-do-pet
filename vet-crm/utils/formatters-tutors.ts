import { Contact } from '@/types/tutor';

export const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};

export const formatCPF = (cpf: string) => {
  if (!cpf) return 'Não informado';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (phone: string) => {
  if (!phone) return 'Não informado';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

export const getPrimaryPhone = (contacts: Contact[]) => {
  const primaryContact = contacts.find(contact => contact.isPrimary);
  return primaryContact ? primaryContact.number : contacts[0]?.number || 'Não informado';
};

export const getGenderDisplay = (gender?: string) => {
  if (!gender) return 'Não informado';
  return gender === 'MALE' ? 'Masculino' : 
         gender === 'FEMALE' ? 'Feminino' : 'Outro';
};
