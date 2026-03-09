export type BoardType = 'APPOINTMENT' | 'CONSULTATION' | 'HOSPITALIZATION' | 'TASK' | 'PROJECT' | 'LEAD' | 'CLIENT' | 'SALES';

export interface BoardFormData {
  name: string;
  description: string;
  color: string;
  type: BoardType;
}

export function detectBoardTypeFromName(name: string): BoardType {
  const normalizedName = name.toLowerCase().trim();
  if (normalizedName === 'consultas' || normalizedName === 'consulta') {
    return 'CONSULTATION';
  }
  if (normalizedName === 'internações' || normalizedName === 'internacoes' || 
      normalizedName === 'internação' || normalizedName === 'internacao') {
    return 'HOSPITALIZATION';
  }
  if (normalizedName.includes('lead') || normalizedName.includes('vendas') || normalizedName.includes('sales')) {
    return 'LEAD';
  }
  return 'APPOINTMENT';
}

export interface ColorOption {
  name: string;
  value: string;
}

export const colorOptions: ColorOption[] = [
  { name: 'Azul', value: 'bg-blue-500' },
  { name: 'Verde', value: 'bg-green-500' },
  { name: 'Roxo', value: 'bg-purple-500' },
  { name: 'Laranja', value: 'bg-orange-500' },
  { name: 'Rosa', value: 'bg-pink-500' },
  { name: 'Ciano', value: 'bg-cyan-500' },
];
