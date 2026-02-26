'use client';

import { LANGUAGES } from '../constants';
import { TemplateFormData } from '../types';

interface ReviewStepProps {
  formData: TemplateFormData;
}

export function ReviewStep({ formData }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Enviar para analise</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Revise os dados antes de submeter para a Meta.</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nome do template</p>
          <p className="font-medium text-gray-900 dark:text-white">{formData.name || '-'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400">Categoria</p>
            <p className="font-medium text-gray-900 dark:text-white">{formData.category}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400">Idioma</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {LANGUAGES.find((l) => l.value === formData.language)?.label || formData.language}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <p className="font-medium text-amber-800 dark:text-amber-300">Importante</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
          A Meta pode aprovar, recategorizar ou rejeitar seu template com base nas politicas oficiais.
        </p>
      </div>
    </div>
  );
}
