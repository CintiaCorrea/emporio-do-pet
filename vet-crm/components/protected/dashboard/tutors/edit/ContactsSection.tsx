import { ContactInput } from '@/types/tutor-edit';
import FormField from './FormField';

interface ContactsSectionProps {
  contacts: ContactInput[];
  onContactChange: (index: number, field: keyof ContactInput, value: any) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
  onSetPrimaryContact: (index: number) => void;
}

const inputStyle = { background: '#fff', border: '1px solid #E8E2D6', borderRadius: '9px', color: '#1F2A2E' };

export default function ContactsSection({
  contacts,
  onContactChange,
  onAddContact,
  onRemoveContact,
  onSetPrimaryContact
}: ContactsSectionProps) {
  return (
    <div className="pt-8" style={{ borderTop: '1px solid #E8E2D6' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg flex items-center gap-2" style={{ fontWeight: 500, color: '#014D5E' }}>
          <span>📞</span>Contatos *
        </h3>
        <button
          type="button"
          onClick={onAddContact}
          className="flex items-center gap-2 px-4 py-2 text-sm transition-all duration-300"
          style={{ fontWeight: 500, color: '#009AAC', background: '#E0F4F6', borderRadius: '9px' }}
        >
          <span style={{ fontSize: '14px' }}>➕</span>
          Adicionar Contato
        </button>
      </div>

      {contacts.map((contact, index) => (
        <div
          key={contact.id || index}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-4 transition-all duration-300"
          style={{ background: '#FBF9F4', borderRadius: '12px', border: '1px solid #E8E2D6' }}
        >
          <div className="md:col-span-2">
            <FormField label="Tipo">
              <select
                value={contact.type}
                onChange={(e) => onContactChange(index, 'type', e.target.value as 'MOBILE' | 'PHONE' | 'BUSINESS')}
                className="w-full px-3 py-2 focus:outline-none focus:ring-2 transition-all duration-300"
                style={inputStyle}
              >
                <option value="MOBILE">Celular</option>
                <option value="PHONE">Telefone</option>
                <option value="BUSINESS">Comercial</option>
              </select>
            </FormField>
          </div>

          <div className="md:col-span-3">
            <FormField label="Número" required>
              <input
                type="text"
                placeholder="Número *"
                value={contact.number}
                onChange={(e) => onContactChange(index, 'number', e.target.value)}
                className="w-full px-3 py-2 focus:outline-none focus:ring-2 transition-all duration-300"
                style={inputStyle}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="WhatsApp">
              <select
                value={contact.isWhatsApp ? 'true' : 'false'}
                onChange={(e) => onContactChange(index, 'isWhatsApp', e.target.value === 'true')}
                className="w-full px-3 py-2 focus:outline-none focus:ring-2 transition-all duration-300"
                style={inputStyle}
              >
                <option value="true">Tem WhatsApp</option>
                <option value="false">Sem WhatsApp</option>
              </select>
            </FormField>
          </div>

          <div className="md:col-span-4">
            <FormField label="Observações">
              <input
                type="text"
                placeholder="Observações"
                value={contact.observations || ''}
                onChange={(e) => onContactChange(index, 'observations', e.target.value)}
                className="w-full px-3 py-2 focus:outline-none focus:ring-2 transition-all duration-300"
                style={inputStyle}
              />
            </FormField>
          </div>

          <div className="md:col-span-1 flex gap-2 items-center">
            <button
              type="button"
              onClick={() => onSetPrimaryContact(index)}
              className="p-2 transition-all duration-300 hover:scale-110"
              style={{
                borderRadius: '9px',
                background: contact.isPrimary ? '#FBEDE6' : 'transparent',
                opacity: contact.isPrimary ? 1 : 0.5,
              }}
              title="Definir como principal"
            >
              <span style={{fontSize:"14px"}}>⭐</span>
            </button>
            <button
              type="button"
              onClick={() => onRemoveContact(index)}
              className="p-2 transition-all duration-300 hover:scale-110"
              style={{ borderRadius: '9px' }}
              disabled={contacts.length === 1}
            >
              <span style={{ fontSize: '14px' }}>🗑️</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
