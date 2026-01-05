import { LuX } from 'react-icons/lu';

interface AlertMessagesProps {
  error: string | null;
  success: boolean;
  onDismissError: () => void;
}

export default function AlertMessages({ error, success, onDismissError }: AlertMessagesProps) {
  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={onDismissError}
            className="text-red-500 hover:text-red-700 p-1 rounded-lg"
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700">
          ✅ Tutor atualizado com sucesso! Redirecionando...
        </div>
      )}
    </>
  );
}
