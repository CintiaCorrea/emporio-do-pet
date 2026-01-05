export default function LoadingState() {
  return (
    <div className="p-12 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Carregando tutores...</p>
    </div>
  );
}
