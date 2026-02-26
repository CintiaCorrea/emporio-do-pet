'use client';

import { TEMPLATE_TYPES } from '../constants';
import { TemplateCategory, TemplateType } from '../types';

interface CategorySelectorProps {
  category: TemplateCategory;
  templateType: TemplateType;
  onCategoryChange: (category: TemplateCategory) => void;
  onTemplateTypeChange: (templateType: TemplateType) => void;
}

export function CategorySelector({
  category,
  templateType,
  onCategoryChange,
  onTemplateTypeChange,
}: CategorySelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configurar seu modelo</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Escolha categoria e tipo de template para seguir com a criacao.
        </p>
      </div>

      <div className="flex gap-2">
        {(['MARKETING', 'UTILITY', 'AUTHENTICATION'] as TemplateCategory[]).map((item) => (
          <button
            key={item}
            onClick={() => onCategoryChange(item)}
            className={`flex-1 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
              category === item
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {item === 'MARKETING' ? 'Marketing' : item === 'UTILITY' ? 'Utilidade' : 'Autenticacao'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {TEMPLATE_TYPES[category].map((type) => (
          <label
            key={type.value}
            className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
              templateType === type.value
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="templateType"
                value={type.value}
                checked={templateType === type.value}
                onChange={() => onTemplateTypeChange(type.value)}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
