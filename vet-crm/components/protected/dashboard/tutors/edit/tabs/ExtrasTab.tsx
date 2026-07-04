import { Tutor } from '@/types/tutor-edit';
import FormField from '../FormField';

interface ExtrasTabProps {
  tutor: Tutor;
  onTutorChange: (field: keyof Tutor, value: any) => void;
}

const inputStyle = { background: '#fff', border: '1px solid #E8E2D6', borderRadius: '9px', color: '#1F2A2E' };

export default function ExtrasTab({ tutor, onTutorChange }: ExtrasTabProps) {
  const formatDateForInput = (dateString?: string) => {
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
          className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300 resize-none"
          style={inputStyle}
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
          className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
          style={inputStyle}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Data da Ficha">
          <input
            type="date"
            value={formatDateForInput(tutor.formDate)}
            onChange={(e) => onTutorChange('formDate', e.target.value || undefined)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
          />
        </FormField>

        <FormField label="Data de Inclusão">
          <input
            type="date"
            value={formatDateForInput(tutor.inclusionDate)}
            onChange={(e) => onTutorChange('inclusionDate', e.target.value || undefined)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
          />
        </FormField>
      </div>
    </div>
  );
}
