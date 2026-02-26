'use client';

import { TemplateFormData } from '../types';

interface OrderDetailsEditorProps {
  formData: TemplateFormData;
  onChange: (updater: (previous: TemplateFormData) => TemplateFormData) => void;
}

export function OrderDetailsEditor({ formData, onChange }: OrderDetailsEditorProps) {
  const addItem = () => {
    onChange((prev) => ({
      ...prev,
      orderItems: [
        ...prev.orderItems,
        {
          id: crypto.randomUUID(),
          name: '',
          amount: 0,
          quantity: 1,
        },
      ],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Order details</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Defina itens e valores para templates de detalhes do pedido.
        </p>
      </div>

      <button onClick={addItem} className="text-sm text-indigo-600 dark:text-indigo-400">
        Adicionar item
      </button>

      <div className="space-y-3">
        {formData.orderItems.map((item, index) => (
          <div key={item.id} className="grid grid-cols-4 gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Item"
              value={item.name}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  orderItems: prev.orderItems.map((entry) =>
                    entry.id === item.id ? { ...entry, name: e.target.value } : entry,
                  ),
                }))
              }
              className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Quantidade"
              value={item.quantity}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  orderItems: prev.orderItems.map((entry) =>
                    entry.id === item.id ? { ...entry, quantity: Number(e.target.value) } : entry,
                  ),
                }))
              }
              className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Valor"
              value={item.amount}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  orderItems: prev.orderItems.map((entry) =>
                    entry.id === item.id ? { ...entry, amount: Number(e.target.value) } : entry,
                  ),
                }))
              }
              className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm"
            />
            <button
              className="text-red-500 text-sm"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  orderItems: prev.orderItems.filter((entry) => entry.id !== item.id),
                }))
              }
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      {!!formData.orderItems.length && (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
          Total estimado:{' '}
          <strong>
            {formData.orderItems.reduce((sum, item) => sum + item.amount * item.quantity, 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </strong>
        </div>
      )}
    </div>
  );
}
