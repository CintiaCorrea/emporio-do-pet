import { LuMapPin } from 'react-icons/lu';
import { Tutor } from '@/types/tutor-edit';
import FormField from '../FormField';

interface AddressTabProps {
  tutor: Tutor;
  onTutorChange: (field: keyof Tutor, value: any) => void;
}

export default function AddressTab({ tutor, onTutorChange }: AddressTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-2">
          <FormField label="CEP" icon={<LuMapPin className="w-4 h-4 mr-2 text-blue-500" />}>
            <input
              type="text"
              placeholder="00000-000"
              value={tutor.cep || ''}
              onChange={(e) => onTutorChange('cep', e.target.value)}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            />
          </FormField>
        </div>

        <div className="md:col-span-8">
          <FormField label="Endereço">
            <input
              type="text"
              value={tutor.address || ''}
              onChange={(e) => onTutorChange('address', e.target.value)}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            />
          </FormField>
        </div>

        <div className="md:col-span-2">
          <FormField label="Número">
            <input
              type="text"
              value={tutor.addressNumber || ''}
              onChange={(e) => onTutorChange('addressNumber', e.target.value)}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            />
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Complemento">
          <input
            type="text"
            value={tutor.complement || ''}
            onChange={(e) => onTutorChange('complement', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>

        <FormField label="Ponto de referência">
          <input
            type="text"
            value={tutor.referencePoint || ''}
            onChange={(e) => onTutorChange('referencePoint', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField label="Bairro">
          <input
            type="text"
            value={tutor.neighborhood || ''}
            onChange={(e) => onTutorChange('neighborhood', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>

        <FormField label="Cidade">
          <input
            type="text"
            value={tutor.city || ''}
            onChange={(e) => onTutorChange('city', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>

        <FormField label="Estado">
          <select 
            value={tutor.state || ''}
            onChange={(e) => onTutorChange('state', e.target.value || undefined)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          >
            <option value="">Selecione...</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
        </FormField>
      </div>
    </div>
  );
}
