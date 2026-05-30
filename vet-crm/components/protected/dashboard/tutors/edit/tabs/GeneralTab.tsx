import { LuUser } from 'react-icons/lu';
import { Tutor, ContactInput } from '@/types/tutor-edit';
import FormField from '../FormField';
import ContactsSection from '../ContactsSection';

interface GeneralTabProps {
  tutor: Tutor;
  onTutorChange: (field: keyof Tutor, value: any) => void;
  onContactChange: (index: number, field: keyof ContactInput, value: any) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
  onSetPrimaryContact: (index: number) => void;
}

export default function GeneralTab({
  tutor,
  onTutorChange,
  onContactChange,
  onAddContact,
  onRemoveContact,
  onSetPrimaryContact
}: GeneralTabProps) {
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
      {/* Informações Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FormField label="Tipo" icon={<LuUser className="w-4 h-4 mr-2 text-blue-500" />}>
          <select 
            value={tutor.type}
            onChange={(e) => onTutorChange('type', e.target.value as 'INDIVIDUAL' | 'LEGAL_ENTITY')}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          >
            <option value="INDIVIDUAL">Pessoa Física</option>
            <option value="LEGAL_ENTITY">Pessoa Jurídica</option>
          </select>
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Nome completo" required icon={<LuUser className="w-4 h-4 mr-2 text-blue-500" />}>
            <input
              type="text"
              value={tutor.name}
              onChange={(e) => onTutorChange('name', e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
              placeholder="Nome completo do tutor"
            />
          </FormField>
        </div>

        <FormField label="Nacionalidade" icon={<LuUser className="w-4 h-4 mr-2 text-blue-500" />}>
          <select 
            value={tutor.nationality}
            onChange={(e) => onTutorChange('nationality', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          >
            <option value="Brasileira">Brasileira</option>
            <option value="Estrangeira">Estrangeira</option>
          </select>
        </FormField>

        <FormField label="Sexo" icon={<LuUser className="w-4 h-4 mr-2 text-blue-500" />}>
          <select 
            value={tutor.gender || ''}
            onChange={(e) => onTutorChange('gender', e.target.value || undefined)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          >
            <option value="">Selecione...</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Feminino</option>
            <option value="OTHER">Outro</option>
          </select>
        </FormField>

        <FormField label="Status" icon={<LuUser className="w-4 h-4 mr-2 text-blue-500" />}>
          <select
            value={tutor.isActive ? 'true' : 'false'}
            onChange={(e) => onTutorChange('isActive', e.target.value === 'true')}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </FormField>
      </div>

      {/* Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField 
          label="E-mail" 
          icon={<span style={{fontSize:"14px"}}>✉</span>}
          description="E-mail principal para comunicação"
        >
          <input
            type="email"
            value={tutor.email || ''}
            onChange={(e) => onTutorChange('email', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            placeholder="email@exemplo.com"
          />
        </FormField>
      </div>

      {/* Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField label="CPF">
          <input
            type="text"
            placeholder="000.000.000-00"
            value={tutor.cpf || ''}
            onChange={(e) => onTutorChange('cpf', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>

        <FormField label="RG">
          <input
            type="text"
            value={tutor.rg || ''}
            onChange={(e) => onTutorChange('rg', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>

        <FormField label="Data de Nascimento">
          <input
            type="date"
            value={formatDateForInput(tutor.birthDate)}
            onChange={(e) => onTutorChange('birthDate', e.target.value || undefined)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </FormField>
      </div>

      {/* Informações Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Como nos conheceu?">
          <input
            type="text"
            value={tutor.howFoundUs || ''}
            onChange={(e) => onTutorChange('howFoundUs', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            placeholder="Indicação, Google, etc."
          />
        </FormField>

        <FormField label="Profissão">
          <input
            type="text"
            value={tutor.profession || ''}
            onChange={(e) => onTutorChange('profession', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            placeholder="Profissão do tutor"
          />
        </FormField>
      </div>

      {/* Preferências de Contato */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Aceita Email?', field: 'acceptsEmail', color: 'blue' },
          { label: 'Aceita WhatsApp?', field: 'acceptsWhatsApp', color: 'green' },
          { label: 'Aceita SMS?', field: 'acceptsSMS', color: 'purple' },
          { label: 'Aceita Campanha SMS?', field: 'acceptsSmsCampaign', color: 'amber' }
        ].map((item, index) => (
          <FormField key={index} label={item.label}>
            <select 
              value={tutor[item.field as keyof Tutor] ? 'true' : 'false'}
              onChange={(e) => onTutorChange(item.field as keyof Tutor, e.target.value === 'true')}
              className={`w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-${item.color}-500/50 focus:border-${item.color}-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm`}
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </FormField>
        ))}
      </div>

      {/* Contatos */}
      <ContactsSection
        contacts={tutor.contacts}
        onContactChange={onContactChange}
        onAddContact={onAddContact}
        onRemoveContact={onRemoveContact}
        onSetPrimaryContact={onSetPrimaryContact}
      />
    </div>
  );
}
