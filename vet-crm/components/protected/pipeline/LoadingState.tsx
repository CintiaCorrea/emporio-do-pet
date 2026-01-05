import { LuLoader } from 'react-icons/lu';

interface LoadingStateProps {
  sidebarOpen: boolean;
}

export default function LoadingState({ sidebarOpen }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-gray-600">
                <LuLoader className="w-6 h-6 animate-spin" />
                <span>Carregando boards...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
