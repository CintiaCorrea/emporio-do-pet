import { LuLoader } from 'react-icons/lu';

export default function LoadingState() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-3 text-gray-600">
            <LuLoader className="w-6 h-6 animate-spin" />
            <span>Carregando...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
