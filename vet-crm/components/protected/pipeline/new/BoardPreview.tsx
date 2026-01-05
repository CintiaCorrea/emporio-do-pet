interface BoardPreviewProps {
  formData: {
    name: string;
    description: string;
    color: string;
  };
}

export default function BoardPreview({ formData }: BoardPreviewProps) {
  return (
    <div className="mt-8 bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 sm:p-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Pré-visualização</h3>
      <div className="bg-white/80 border border-gray-200/80 rounded-2xl p-6 shadow-sm">
        <div className={`h-3 ${formData.color} rounded-t-2xl mb-4`}></div>
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-lg">
            {formData.name || "Nome do Board"}
          </h4>
          <p className="text-gray-600 text-sm">
            {formData.description || "Descrição do board aparecerá aqui..."}
          </p>
          <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t border-gray-100">
            <span>0 deals</span>
            <span>Hoje</span>
          </div>
        </div>
      </div>
    </div>
  );
}
