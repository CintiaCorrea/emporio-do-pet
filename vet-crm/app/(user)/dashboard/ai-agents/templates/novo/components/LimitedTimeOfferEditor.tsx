'use client';

import { TemplateFormData } from '../types';

interface LimitedTimeOfferEditorProps {
  formData: TemplateFormData;
  onChange: (updater: (previous: TemplateFormData) => TemplateFormData) => void;
}

export function LimitedTimeOfferEditor({ formData, onChange }: LimitedTimeOfferEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Limited-time offer</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Esse formato e restrito a marketing e possui expiracao obrigatoria.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do modelo *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}))
          }
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto da oferta *</label>
        <input
          type="text"
          value={formData.limitedTimeOfferText}
          onChange={(e) => onChange((prev) => ({ ...prev, limitedTimeOfferText: e.target.value }))}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          placeholder="Ex: Use o cupom PET20 ate meia-noite"
        />
      </div>
    </div>
  );
}
