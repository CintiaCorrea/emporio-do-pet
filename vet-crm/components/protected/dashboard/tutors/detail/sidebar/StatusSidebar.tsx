import { Tutor } from '@/types/tutor-detail';
import { formatDate } from '@/utils/tutor-detail-formatters';

interface StatusSidebarProps {
  tutor: Tutor;
}

export default function StatusSidebar({ tutor }: StatusSidebarProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <StatusCard tutor={tutor} />
      <PreferencesCard tutor={tutor} />
      <DatesCard tutor={tutor} />
    </div>
  );
}

function StatusCard({ tutor }: { tutor: Tutor }) {
  const petsCount = tutor?._count?.pets ?? 0;
  const appointmentsCount = tutor?._count?.appointments ?? 0;
  const contactsCount = tutor?._count?.contacts ?? 0;

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm sm:text-base">Pets</span>
          <span className="font-semibold text-gray-900 text-sm sm:text-base">{petsCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm sm:text-base">Consultas</span>
          <span className="font-semibold text-gray-900 text-sm sm:text-base">{appointmentsCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm sm:text-base">Contatos</span>
          <span className="font-semibold text-gray-900 text-sm sm:text-base">{contactsCount}</span>
        </div>
      </div>
    </div>
  );
}

function PreferencesCard({ tutor }: { tutor: Tutor }) {
  const preferences = [
    { label: 'E-mail', value: tutor.acceptsEmail },
    { label: 'WhatsApp', value: tutor.acceptsWhatsApp },
    { label: 'SMS', value: tutor.acceptsSMS },
    { label: 'Campanhas SMS', value: tutor.acceptsSmsCampaign },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferências de Contato</h2>
      <div className="space-y-3">
        {preferences.map((pref) => (
          <div key={pref.label} className="flex justify-between items-center">
            <span className="text-gray-600 text-sm sm:text-base">{pref.label}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              pref.value 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {pref.value ? 'Permitido' : 'Não'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DatesCard({ tutor }: { tutor: Tutor }) {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Datas</h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-500">Cadastro</label>
          <p className="text-gray-900 text-sm sm:text-base">{formatDate(tutor.createdAt)}</p>
        </div>
        {tutor.formDate && (
          <div>
            <label className="text-sm font-medium text-gray-500">Data da Ficha</label>
            <p className="text-gray-900 text-sm sm:text-base">{formatDate(tutor.formDate)}</p>
          </div>
        )}
        {tutor.inclusionDate && (
          <div>
            <label className="text-sm font-medium text-gray-500">Data de Inclusão</label>
            <p className="text-gray-900 text-sm sm:text-base">{formatDate(tutor.inclusionDate)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
