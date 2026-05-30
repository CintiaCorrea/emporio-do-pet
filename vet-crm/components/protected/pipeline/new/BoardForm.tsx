import { BoardFormData } from '@/types/board-form';
import FormField from './FormField';
import ColorPicker from './ColorPicker';
import FormActions from './FormActions';

interface BoardFormProps {
  formData: BoardFormData;
  isLoading: boolean;
  error: string | null;
  onFormDataChange: (data: BoardFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit? (() => null) : boolean;
}

export default function BoardForm({
  formData,
  isLoading,
  error,
  onFormDataChange,
  onSubmit,
  onCancel,
  isEdit = false
}: BoardFormProps) {
  const handleInputChange = (field: keyof BoardFormData, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 sm:p-8">
      <form onSubmit={onSubmit} className="space-y-8">
        {/* Nome do Board */}
        <FormField label="Nome do Board" htmlFor="name" required>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-4 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm text-lg"
            placeholder="Ex: Pipeline de Vendas"
            required
            disabled={isLoading}
          />
        </FormField>

        {/* Descrição */}
        <FormField label="Descrição" htmlFor="description">
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-4 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm text-lg resize-none"
            placeholder="Descreva o propósito deste board..."
            disabled={isLoading}
          />
        </FormField>

        {/* Cor do Board */}
        <ColorPicker
          selectedColor={formData.color}
          onColorChange={(color) => handleInputChange('color', color)}
          isLoading={isLoading}
        />

        {/* Botões de Ação */}
        <FormActions 
          isLoading={isLoading} 
          onCancel={onCancel} 
          isEdit={isEdit}
        />
      </form>
    </div>
  );
}
