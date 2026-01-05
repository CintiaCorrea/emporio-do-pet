import { LuFileText, LuUser, LuPlus } from 'react-icons/lu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tutor, Pet } from '@/types/tutor-detail';
import { formatDate } from '@/utils/tutor-detail-formatters';

interface AdditionalSectionsProps {
  tutor: Tutor;
}

export default function AdditionalSections({ tutor }: AdditionalSectionsProps) {
  return (
    <>
      {/* Observações */}
      {tutor.observations && (
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LuFileText className="w-5 h-5 text-purple-500" />
            Observações
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap text-sm sm:text-base break-words">
            {tutor.observations}
          </p>
        </div>
      )}

      {/* Como nos conheceu */}
      {tutor.howFoundUs && (
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LuUser className="w-5 h-5 text-orange-500" />
            Como nos conheceu
          </h2>
          <p className="text-gray-900 text-sm sm:text-base break-words">
            {tutor.howFoundUs}
          </p>
        </div>
      )}

      {/* Pets */}
      {tutor.pets.length > 0 && <PetsSection tutor={tutor} />}

      {/* Tags */}
      {tutor.tags.length > 0 && (
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tutor.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PetsSection({ tutor }: { tutor: Tutor }) {
  const router = useRouter();

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-blue-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Pets</h2>
      <div className="space-y-3">
        {tutor.pets.map((pet) => (
          <div
            key={pet.id}
            className="p-3 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-all duration-300 cursor-pointer"
            onClick={() => router.push(`/dashboard/erp/pets/${pet.id}`)}
          >
            <p className="font-semibold text-gray-900 text-sm sm:text-base">{pet.name}</p>
            <p className="text-sm text-gray-600 capitalize">
              {pet.species.toLowerCase()} • {pet.breed || 'Sem raça definida'}
            </p>
            {pet.birthDate && (
              <p className="text-xs text-gray-500">
                Nascimento: {formatDate(pet.birthDate)}
              </p>
            )}
            {pet._count && pet._count.appointments > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                {pet._count.appointments} consulta{pet._count.appointments !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Link
          href={`/dashboard/erp/pets/novo?tutorId=${tutor.id}`}
          className="w-full text-center px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-all duration-300 text-sm flex items-center justify-center gap-2"
        >
          <LuPlus className="w-4 h-4" />
          Adicionar Pet
        </Link>
      </div>
    </div>
  );
}
