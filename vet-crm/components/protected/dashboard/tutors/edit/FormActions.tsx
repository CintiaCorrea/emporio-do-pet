import Link from 'next/link';

interface FormActionsProps {
  saving: boolean;
  tutorId: string;
}

export default function FormActions({ saving, tutorId }: FormActionsProps) {
  return (
    <div className="flex gap-4 mt-8 pt-8" style={{ borderTop: '1px solid #E8E2D6' }}>
      <button
        type="submit"
        disabled={saving}
        className="px-8 py-3 text-sm text-white transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontWeight: 500, background: '#009AAC', borderRadius: '9px' }}
      >
        {saving ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Salvando...</span>
          </div>
        ) : (
          <>
            <span style={{ fontSize: '14px' }}>✅</span>
            <span>Salvar Alterações</span>
          </>
        )}
      </button>

      <Link
        href={`/dashboard/erp/tutores/${tutorId}`}
        className="px-6 py-3 text-sm transition-all duration-300 flex items-center space-x-2"
        style={{ fontWeight: 500, color: '#5C6B70', background: '#fff', border: '1px solid #E8E2D6', borderRadius: '9px' }}
      >
        <span style={{ fontSize: '14px' }}>✕</span>
        <span>Cancelar</span>
      </Link>
    </div>
  );
}
