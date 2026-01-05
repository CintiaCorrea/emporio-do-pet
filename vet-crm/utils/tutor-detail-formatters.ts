export const formatDate = (dateString?: string) => {
  if (!dateString) return 'Não informado';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};

export const formatCPF = (cpf?: string) => {
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

export const getGenderText = (gender?: string) => {
  switch (gender) {
    case 'MALE': return 'Masculino';
    case 'FEMALE': return 'Feminino';
    case 'OTHER': return 'Outro';
    default: return 'Não informado';
  }
};

export const getPersonTypeText = (type: string) => {
  return type === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica';
};
