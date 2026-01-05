import { LuMapPin } from 'react-icons/lu';
import { Tutor } from '@/types/tutor-detail';

interface AddressSectionProps {
  tutor: Tutor;
}

export default function AddressSection({ tutor }: AddressSectionProps) {
  if (!tutor.address) return null;

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <LuMapPin className="w-5 h-5 text-red-500" />
        Endereço
      </h2>
      <div className="space-y-2">
        <p className="text-gray-900 text-sm sm:text-base">
          {tutor.address}, {tutor.addressNumber}
          {tutor.complement && ` - ${tutor.complement}`}
        </p>
        <p className="text-gray-600 text-sm sm:text-base">
          {tutor.neighborhood} • {tutor.city} - {tutor.state}
        </p>
        {tutor.cep && (
          <p className="text-sm text-gray-500">CEP: {tutor.cep}</p>
        )}
        {tutor.referencePoint && (
          <div className="mt-3">
            <label className="text-sm font-medium text-gray-500">Ponto de Referência</label>
            <p className="text-gray-900 text-sm sm:text-base">{tutor.referencePoint}</p>
          </div>
        )}
      </div>
      <div className="mt-4">
        <button
          onClick={() => {
            const address = `${tutor.address}, ${tutor.addressNumber}, ${tutor.neighborhood}, ${tutor.city} - ${tutor.state}`;
            window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
          }}
          className="w-full sm:w-auto px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
        >
          <LuMapPin className="w-4 h-4" />
          Ver no Google Maps
        </button>
      </div>
    </div>
  );
}
