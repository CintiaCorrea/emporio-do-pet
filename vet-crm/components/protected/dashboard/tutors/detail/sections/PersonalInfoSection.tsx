import { LuUser } from 'react-icons/lu';
import { Tutor } from '@/types/tutor-detail';
import { formatCPF, formatDate, getGenderText, getPersonTypeText } from '@/utils/tutor-detail-formatters';

interface PersonalInfoSectionProps {
  tutor: Tutor;
}

export default function PersonalInfoSection({ tutor }: PersonalInfoSectionProps) {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <LuUser className="w-5 h-5 text-blue-500" />
        Informações Pessoais
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Tipo</label>
          <p className="text-gray-900 text-sm sm:text-base">{getPersonTypeText(tutor.type)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Gênero</label>
          <p className="text-gray-900 text-sm sm:text-base">{getGenderText(tutor.gender)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">CPF</label>
          <p className="text-gray-900 text-sm sm:text-base">{formatCPF(tutor.cpf)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">RG</label>
          <p className="text-gray-900 text-sm sm:text-base">{tutor.rg || 'Não informado'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Data de Nascimento</label>
          <p className="text-gray-900 text-sm sm:text-base">{formatDate(tutor.birthDate)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Profissão</label>
          <p className="text-gray-900 text-sm sm:text-base">{tutor.profession || 'Não informado'}</p>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-gray-500">Nacionalidade</label>
          <p className="text-gray-900 text-sm sm:text-base">{tutor.nationality}</p>
        </div>
      </div>
    </div>
  );
}
