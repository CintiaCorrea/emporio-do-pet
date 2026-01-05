interface MobileHeaderProps {
  onToggleSidebar: () => void;
}

export default function MobileHeader({ onToggleSidebar }: MobileHeaderProps) {
  return (
    <div className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-white/20 px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <div className="w-4 h-0.5 bg-current mb-1"></div>
            <div className="w-4 h-0.5 bg-current mb-1"></div>
            <div className="w-4 h-0.5 bg-current"></div>
          </div>
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Novo Board</h1>
        <div className="w-8"></div>
      </div>
    </div>
  );
}
