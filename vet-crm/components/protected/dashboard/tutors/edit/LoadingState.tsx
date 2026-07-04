export default function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="h-8 rounded w-1/4 mb-4" style={{ background: '#EFE9DD' }}></div>
      <div className="h-4 rounded w-1/2 mb-8" style={{ background: '#EFE9DD' }}></div>
      <div className="h-96 rounded-2xl" style={{ background: '#EFE9DD' }}></div>
    </div>
  );
}
