
interface AlertMessagesProps {
  error: string | null;
  success: boolean;
  onDismissError: () => void;
}

export default function AlertMessages({ error, success, onDismissError }: AlertMessagesProps) {
  return (
    <>
      {error && (
        <div
          className="mb-6 p-4 rounded-2xl flex items-center justify-between"
          style={{ background: '#FDECEC', border: '1px solid #F5D0D0', color: '#b23b39' }}
        >
          <span className="flex items-center gap-2">
            <span style={{ fontSize: '16px' }}>⚠️</span>
            {error}
          </span>
          <button
            onClick={onDismissError}
            className="p-1 rounded-lg"
            style={{ color: '#b23b39' }}
          >
            <span style={{fontSize:"14px"}}>✕</span>
          </button>
        </div>
      )}

      {success && (
        <div
          className="mb-6 p-4 rounded-2xl"
          style={{ background: '#E1F5EE', border: '1px solid #C7EBDD', color: '#0F6E56' }}
        >
          ✅ Tutor atualizado com sucesso! Redirecionando...
        </div>
      )}
    </>
  );
}
