import { Tutor } from '@/types/tutor-edit';
import FormField from '../FormField';

interface ExtrasTabProps {
  tutor: Tutor;
  onTutorChange: (field: keyof Tutor, value: any) => void;
}

export default function ExtrasTab({ tutor, onTutorChange }: ExtrasTabProps) {
  const formatDateForInput = (dateString? (() => null) : string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-8">
      <FormField label="Observações">
        <textarea
          rows={6}
          value={tutor.observations || ''}
          onChange={(e) => onTutorChange('observations', e.target.value)}
          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
          placeholder="Observações adicionais sobre o tutor..."
        />
      </FormField>

      <FormField 
        label="Marcações (Tags)"
        description="Separe as tags com vírgula"
      >
        <input
          type="text"
          placeholder="Digite o texto e pressione enter para adicionar tags"
          value={tutor.tags.join(', ')}
          onChange={(e) => onTutorChange('tags', e.target.value.split(', ').filter(tag => tag.trim()))}
          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Data da Ficha">
          <input
            type="date"
            value={formatDateForInput(tutor.formDate)}
            onChange={(e) => onTutorChange('formDate', e.target.value || undefined)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>

        <FormField label="Data de Inclusão">
          <input
            type="date"
            value={formatDateForInput(tutor.inclusionDate)}
            onChange={(e) => onTutorChange('inclusionDate', e.target.value || undefined)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>
      </div>
    </div>
  );
}
