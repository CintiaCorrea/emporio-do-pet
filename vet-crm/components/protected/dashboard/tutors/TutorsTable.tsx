import Link from 'next/link';
import { LuUser, LuPhone, LuEye, LuPencil, LuTrash } from 'react-icons/lu';
import { Tutor } from '@/types/tutor';
import { formatDate, formatCPF, formatPhone, getPrimaryPhone, getGenderDisplay } from '@/utils/formatters-tutors';

interface TutorsTableProps {
  tutors: Tutor[];
  onDeleteTutor: (tutor: Tutor) => void;
}

export default function TutorsTable({ tutors, onDeleteTutor }: TutorsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tutor</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contato</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Documento</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cadastro</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {tutors.map((tutor) => (
            <tr key={tutor.id} className="hover:bg-gray-50/50 transition-colors duration-200">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <LuUser className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-semibold text-gray-900">{tutor.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <span style={{fontSize:"14px"}}>📍</span>
                      {tutor.nationality}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 flex items-center gap-1">
                  <LuPhone className="w-3 h-3 text-gray-400" />
                  {formatPhone(getPrimaryPhone(tutor.contacts || []))}
                </div>
                <div className="text-sm text-gray-500">
                  {tutor.contacts?.filter(c => c.isWhatsApp).length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                      WhatsApp
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{formatCPF(tutor.cpf || '')}</div>
                <div className="text-sm text-gray-500 capitalize">
                  {getGenderDisplay(tutor.gender)}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {formatDate(tutor.createdAt)}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  tutor.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tutor.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <Link
                    href={`/dashboard/erp/tutores/${tutor.id}`}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                    title="Visualizar"
                  >
                    <LuEye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/dashboard/erp/tutores/${tutor.id}/editar`}
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                    title="Editar"
                  >
                    <LuPencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => onDeleteTutor(tutor)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                    title="Excluir"
                  >
                    <LuTrash className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
