import { LuPlus, LuStar, LuTrash2 } from 'react-icons/lu';
import { ContactInput } from '@/types/tutor-edit';
import FormField from './FormField';

interface ContactsSectionProps {
  contacts: ContactInput[];
  onContactChange: (index: number, field: keyof ContactInput, value: any) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
  onSetPrimaryContact: (index: number) => void;
}

export default function ContactsSection({
  contacts,
  onContactChange,
  onAddContact,
  onRemoveContact,
  onSetPrimaryContact
}: ContactsSectionProps) {
  return (
    <div className="border-t border-white/20 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Contatos *</h3>
        <button
          type="button"
          onClick={onAddContact}
          className="group flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-semibold bg-blue-50/50 rounded-2xl hover:bg-blue-100/50 transition-all duration-300 hover:scale-105"
        >
          <LuPlus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Adicionar Contato
        </button>
      </div>

      {contacts.map((contact, index) => (
        <div key={contact.id || index} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-4 bg-gray-50/50 rounded-2xl hover:bg-gray-100/50 transition-all duration-300">
          <div className="md:col-span-2">
            <FormField label="Tipo">
              <select 
                value={contact.type}
                onChange={(e) => onContactChange(index, 'type', e.target.value as 'MOBILE' | 'PHONE' | 'BUSINESS')}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
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
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="WhatsApp">
              <select 
                value={contact.isWhatsApp ? 'true' : 'false'}
                onChange={(e) => onContactChange(index, 'isWhatsApp', e.target.value === 'true')}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300"
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
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all duration-300"
              />
            </FormField>
          </div>

          <div className="md:col-span-1 flex gap-2 items-center">
            <button
              type="button"
              onClick={() => onSetPrimaryContact(index)}
              className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
                contact.isPrimary 
                  ? 'text-orange-500 bg-orange-50' 
                  : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
              }`}
            >
              <LuStar className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveContact(index)}
              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
              disabled={contacts.length === 1}
            >
              <LuTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
