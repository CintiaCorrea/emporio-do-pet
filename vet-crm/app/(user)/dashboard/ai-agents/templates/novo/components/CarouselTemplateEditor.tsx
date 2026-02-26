'use client';

import { MediaUploader } from './MediaUploader';
import { TemplateFormData } from '../types';

interface CarouselTemplateEditorProps {
  formData: TemplateFormData;
  onChange: (updater: (previous: TemplateFormData) => TemplateFormData) => void;
}

export function CarouselTemplateEditor({ formData, onChange }: CarouselTemplateEditorProps) {
  const addCard = () => {
    if (formData.carouselCards.length >= 10) return;
    onChange((prev) => ({
      ...prev,
      carouselCards: [
        ...prev.carouselCards,
        {
          id: crypto.randomUUID(),
          mediaFormat: 'IMAGE',
          bodyText: '',
          buttons: [],
        },
      ],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Carousel template</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Adicione de 2 a 10 cards com midia e texto.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do modelo *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            }))
          }
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        />
      </div>

      <div>
        <button onClick={addCard} className="text-sm text-indigo-600 dark:text-indigo-400">
          Adicionar card
        </button>
      </div>

      <div className="space-y-3">
        {formData.carouselCards.map((card, index) => (
          <div key={card.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-900 dark:text-white">Card {index + 1}</p>
              <button
                className="text-red-500 text-sm"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    carouselCards: prev.carouselCards.filter((item) => item.id !== card.id),
                  }))
                }
              >
                Remover
              </button>
            </div>
            <select
              value={card.mediaFormat}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  carouselCards: prev.carouselCards.map((item) =>
                    item.id === card.id ? { ...item, mediaFormat: e.target.value as 'IMAGE' | 'VIDEO' } : item,
                  ),
                }))
              }
              className="w-full px-3 py-2 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="IMAGE">Imagem</option>
              <option value="VIDEO">Video</option>
            </select>
            <MediaUploader
              accept={card.mediaFormat === 'IMAGE' ? 'image/*' : 'video/*'}
              maxSizeBytes={card.mediaFormat === 'IMAGE' ? 5 * 1024 * 1024 : 16 * 1024 * 1024}
              label="Upload da midia do card"
              onUploaded={(handle) =>
                onChange((prev) => ({
                  ...prev,
                  carouselCards: prev.carouselCards.map((item) =>
                    item.id === card.id ? { ...item, mediaHandle: handle } : item,
                  ),
                }))
              }
            />
            <textarea
              rows={2}
              maxLength={160}
              placeholder="Texto do card (max 160)"
              value={card.bodyText}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  carouselCards: prev.carouselCards.map((item) =>
                    item.id === card.id ? { ...item, bodyText: e.target.value } : item,
                  ),
                }))
              }
              className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
