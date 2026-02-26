'use client';

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          {currentStep > 1 ? '✓' : '1'}
        </div>
        <span className="font-medium">Configurar modelo</span>
      </div>

      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />

      <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          {currentStep > 2 ? '✓' : '2'}
        </div>
        <span className="font-medium">Editar modelo</span>
      </div>

      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />

      <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          3
        </div>
        <span className="font-medium">Enviar para analise</span>
      </div>
    </div>
  );
}
