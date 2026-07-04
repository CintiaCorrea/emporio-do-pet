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

const inputStyle = { background: '#fff', border: '1px solid #E8E2D6', borderRadius: '9px', color: '#1F2A2E' };
const userIcon = <span style={{ fontSize: '14px', marginRight: '8px' }}>👤</span>;

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
        <FormField label="Tipo" icon={userIcon}>
          <select
            value={tutor.type}
            onChange={(e) => onTutorChange('type', e.target.value as 'INDIVIDUAL' | 'LEGAL_ENTITY')}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
          >
            <option value="INDIVIDUAL">Pessoa Física</option>
            <option value="LEGAL_ENTITY">Pessoa Jurídica</option>
          </select>
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Nome completo" required icon={userIcon}>
            <input
              type="text"
              value={tutor.name}
              onChange={(e) => onTutorChange('name', e.target.value)}
              required
              className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
              style={inputStyle}
              placeholder="Nome completo do tutor"
            />
          </FormField>
        </div>

        <FormField label="Nacionalidade" icon={userIcon}>
          <select
            value={tutor.nationality}
            onChange={(e) => onTutorChange('nationality', e.target.value)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
          >
            <option value="Brasileira">Brasileira</option>
            <option value="Estrangeira">Estrangeira</option>
          </select>
        </FormField>

        <FormField label="Sexo" icon={userIcon}>
          <select
            value={tutor.gender || ''}
            onChange={(e) => onTutorChange('gender', e.target.value || undefined)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
          >
            <option value="">Selecione...</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Feminino</option>
            <option value="OTHER">Outro</option>
          </select>
        </FormField>

        <FormField label="Status" icon={userIcon}>
          <select
            value={tutor.isActive ? 'true' : 'false'}
            onChange={(e) => onTutorChange('isActive', e.target.value === 'true')}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
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
          icon={<span style={{fontSize:"14px", marginRight: '8px'}}>✉️</span>}
          description="E-mail principal para comunicação"
        >
          <input
            type="email"
            value={tutor.email || ''}
            onChange={(e) => onTutorChange('email', e.target.value)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
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
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
          />
        </FormField>

        <FormField label="RG">
          <input
            type="text"
            value={tutor.rg || ''}
            onChange={(e) => onTutorChange('rg', e.target.value)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
          />
        </FormField>

        <FormField label="Data de Nascimento" icon={<span style={{fontSize:"14px", marginRight: '8px'}}>🎂</span>}>
          <input
            type="date"
            value={formatDateForInput(tutor.birthDate)}
            onChange={(e) => onTutorChange('birthDate', e.target.value || undefined)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
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
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
            placeholder="Indicação, Google, etc."
          />
        </FormField>

        <FormField label="Profissão">
          <input
            type="text"
            value={tutor.profession || ''}
            onChange={(e) => onTutorChange('profession', e.target.value)}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
            style={inputStyle}
            placeholder="Profissão do tutor"
          />
        </FormField>
      </div>

      {/* Preferências de Contato */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Aceita Email?', field: 'acceptsEmail' },
          { label: 'Aceita WhatsApp?', field: 'acceptsWhatsApp' },
          { label: 'Aceita SMS?', field: 'acceptsSMS' },
          { label: 'Aceita Campanha SMS?', field: 'acceptsSmsCampaign' }
        ].map((item, index) => (
          <FormField key={index} label={item.label}>
            <select
              value={tutor[item.field as keyof Tutor] ? 'true' : 'false'}
              onChange={(e) => onTutorChange(item.field as keyof Tutor, e.target.value === 'true')}
              className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
              style={inputStyle}
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
