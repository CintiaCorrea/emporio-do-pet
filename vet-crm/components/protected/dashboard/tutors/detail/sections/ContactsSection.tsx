import { LuPhone } from 'react-icons/lu';
import { FaWhatsapp } from 'react-icons/fa';
import { Contact } from '@/types/tutor-detail';
import { formatPhone } from '@/utils/tutor-detail-formatters';

interface ContactsSectionProps {
  contacts: Contact[];
}

export default function ContactsSection({ contacts }: ContactsSectionProps) {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <LuPhone className="w-5 h-5 text-green-500" />
        Contatos
      </h2>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div
      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
        contact.isPrimary
          ? 'bg-blue-50 border-blue-200'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {contact.isWhatsApp && (
            <FaWhatsapp className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {formatPhone(contact.number)}
            </p>
            <p className="text-sm text-gray-500 capitalize">
              {contact.type.toLowerCase()} 
              {contact.isPrimary && (
                <span className="ml-2 inline-flex items-center text-blue-600">
                  <span style={{fontSize:"14px"}}>⭐</span>
                  <span className="ml-1 hidden xs:inline">Principal</span>
                </span>
              )}
            </p>
          </div>
        </div>
        {contact.observations && (
          <p className="text-sm text-gray-600 truncate sm:text-right flex-shrink-0">
            {contact.observations}
          </p>
        )}
      </div>
      {contact.isWhatsApp && (
        <ContactActions contact={contact} />
      )}
    </div>
  );
}

function ContactActions({ contact }: { contact: Contact }) {
  return (
    <div className="mt-3 flex flex-col xs:flex-row gap-2">
      <button
        onClick={() => window.open(`https://wa.me/55${contact.number.replace(/\D/g, '')}`, '_blank')}
        className="px-3 py-1 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all duration-300 text-sm flex items-center justify-center gap-1 flex-1"
      >
        <FaWhatsapp className="w-3 h-3" />
        <span className="hidden xs:inline">Enviar WhatsApp</span>
        <span className="xs:hidden">WhatsApp</span>
      </button>
      <button
        onClick={() => window.open(`tel:${contact.number}`, '_blank')}
        className="px-3 py-1 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-300 text-sm flex items-center justify-center gap-1 flex-1"
      >
        <LuPhone className="w-3 h-3" />
        Ligar
      </button>
    </div>
  );
}
