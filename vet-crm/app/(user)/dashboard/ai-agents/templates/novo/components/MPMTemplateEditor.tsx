'use client';

import { TemplateFormData } from '../types';

interface MPMTemplateEditorProps {
  formData: TemplateFormData;
  onChange: (updater: (previous: TemplateFormData) => TemplateFormData) => void;
}

export function MPMTemplateEditor({ formData, onChange }: MPMTemplateEditorProps) {
  const addSection = () => {
    if (formData.mpmSections.length >= 10) return;
    onChange((prev) => ({
      ...prev,
      mpmSections: [
        ...prev.mpmSections,
        {
          id: crypto.randomUUID(),
          title: '',
          productRetailerIds: [''],
        },
      ],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Multi-product message (MPM)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Defina secoes e produtos do catalogo.</p>
      </div>

      <button onClick={addSection} className="text-sm text-indigo-600 dark:text-indigo-400">
        Adicionar secao
      </button>

      <div className="space-y-3">
        {formData.mpmSections.map((section, index) => (
          <div key={section.id} className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900 dark:text-white">Secao {index + 1}</p>
              <button
                className="text-red-500 text-sm"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    mpmSections: prev.mpmSections.filter((item) => item.id !== section.id),
                  }))
                }
              >
                Remover
              </button>
            </div>

            <input
              type="text"
              placeholder="Titulo da secao"
              value={section.title}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  mpmSections: prev.mpmSections.map((item) =>
                    item.id === section.id ? { ...item, title: e.target.value } : item,
                  ),
                }))
              }
              className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />

            <div className="space-y-2 mt-2">
              {section.productRetailerIds.map((productId, pIndex) => (
                <input
                  key={`${section.id}-${pIndex}`}
                  type="text"
                  placeholder="product_retailer_id"
                  value={productId}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      mpmSections: prev.mpmSections.map((item) =>
                        item.id === section.id
                          ? {
                              ...item,
                              productRetailerIds: item.productRetailerIds.map((entry, idx) =>
                                idx === pIndex ? e.target.value : entry,
                              ),
                            }
                          : item,
                      ),
                    }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                />
              ))}
            </div>

            <button
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  mpmSections: prev.mpmSections.map((item) =>
                    item.id === section.id
                      ? {
                          ...item,
                          productRetailerIds: [...item.productRetailerIds, ''],
                        }
                      : item,
                  ),
                }))
              }
              className="text-xs text-indigo-600 dark:text-indigo-400 mt-2"
            >
              + Adicionar produto
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
