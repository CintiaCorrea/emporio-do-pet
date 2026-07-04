import Link from 'next/link';

interface EditTutorHeaderProps {
  tutorName: string;
  tutorId: string;
}

export default function EditTutorHeader({ tutorName, tutorId }: EditTutorHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href={`/dashboard/erp/tutores/${tutorId}`}
          className="flex items-center gap-2 transition-colors duration-300"
          style={{ color: '#009AAC' }}
        >
          <span style={{ fontSize: '18px' }}>⬅️</span>
          <span>Voltar para Detalhes</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl" style={{ fontWeight: 500, color: '#1F2A2E' }}>
            <span className="mr-2">👤</span>Editar Tutor
          </h1>
          <p className="mt-2" style={{ color: '#5C6B70' }}>
            Atualize as informações de {tutorName}
          </p>
        </div>
      </div>
    </div>
  );
}
