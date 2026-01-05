export default function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="h-48 sm:h-64 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 sm:h-48 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div className="h-32 sm:h-48 bg-gray-200 rounded-2xl"></div>
          <div className="h-24 sm:h-32 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
}
