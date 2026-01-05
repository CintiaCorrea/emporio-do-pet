export interface BoardFormData {
  name: string;
  description: string;
  color: string;
  type: 'APPOINTMENT' | 'TASK' | 'PROJECT';
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
