'use client';

import { ButtonType, MetaFlow, TemplateButton, TemplateCategory } from '../types';
import { getAllowedButtonTypes, getMaxButtons } from '../utils';

interface ButtonsEditorProps {
  category: TemplateCategory;
  buttons: TemplateButton[];
  flows: MetaFlow[];
  onChange: (buttons: TemplateButton[]) => void;
}

const LABELS: Record<ButtonType, string> = {
  QUICK_REPLY: 'Resposta rapida',
  URL: 'Link URL',
  PHONE_NUMBER: 'Telefone',
  COPY_CODE: 'Copiar codigo',
  FLOW: 'Flow',
  OTP: 'OTP',
  MPM: 'MPM'};

export function ButtonsEditor({ category, buttons, flows, onChange }: ButtonsEditorProps) {
  const allowedTypes = getAllowedButtonTypes(buttons, category);
  const maxButtons = getMaxButtons(buttons);
  const canAdd = buttons.length < maxButtons;

  const addButton = () => {
    if (!canAdd) return;
    const defaultType = allowedTypes[0] || 'QUICK_REPLY';
    onChange([
      ...buttons,
      {
        id: crypto.randomUUID(),
        type: defaultType,
        text: ''},
    ]);
  };

  const updateButton = (id: string, updates: Partial<TemplateButton>) => {
    onChange(buttons.map((button) => (button.id === id ? { ...button, ...updates } : button)));
  };

  const removeButton = (id: string) => {
    onChange(buttons.filter((button) => button.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Botoes (opcional)</label>
        <button
          onClick={addButton}
          disabled={!canAdd}
          className="text-sm text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
        >
          Adicionar botao
        </button>
      </div>

      {!!buttons.length && (
        <div className="space-y-3">
          {buttons.map((button, index) => {
            const itemAllowedTypes = getAllowedButtonTypes(
              buttons.filter((candidate) => candidate.id !== button.id),
              category,
            );
            if (!itemAllowedTypes.includes(button.type)) {
              itemAllowedTypes.push(button.type);
            }
            return (
              <div key={button.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Botao {index + 1}</span>
                  <button onClick={() => removeButton(button.id)} className="text-red-500 hover:text-red-600 p-1">
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <select
                    value={button.type}
                    onChange={(e) =>
                      updateButton(button.id, {
                        type: e.target.value as ButtonType,
                        text: '',
                        url: '',
                        phone_number: '',
                        example: '',
                        flow_id: ''})
                    }
                    className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  >
                    {itemAllowedTypes.map((type) => (
                      <option key={type} value={type}>
                        {LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Texto do botao"
                    maxLength={25}
                    value={button.text}
                    onChange={(e) => updateButton(button.id, { text: e.target.value })}
                    className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>

                {button.type === 'URL' && (
                  <>
                    <input
                      type="url"
                      placeholder="https://exemplo.com"
                      value={button.url || ''}
                      onChange={(e) => updateButton(button.id, { url: e.target.value })}
                      className="w-full px-3 py-2 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Exemplo para variavel de URL (opcional)"
                      value={button.example || ''}
                      onChange={(e) => updateButton(button.id, { example: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                  </>
                )}

                {button.type === 'PHONE_NUMBER' && (
                  <input
                    type="tel"
                    placeholder="+5511999999999"
                    value={button.phone_number || ''}
                    onChange={(e) => updateButton(button.id, { phone_number: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                )}

                {button.type === 'COPY_CODE' && (
                  <input
                    type="text"
                    placeholder="Codigo para copiar"
                    value={button.example || ''}
                    onChange={(e) => updateButton(button.id, { example: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                )}

                {button.type === 'FLOW' && (
                  <>
                    <select
                      value={button.flow_id || ''}
                      onChange={(e) => updateButton(button.id, { flow_id: e.target.value })}
                      className="w-full px-3 py-2 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <option value="">Selecione um flow</option>
                      {flows.map((flow) => (
                        <option key={flow.id} value={flow.id}>
                          {flow.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="navigate_screen (opcional)"
                      value={button.navigate_screen || ''}
                      onChange={(e) => updateButton(button.id, { navigate_screen: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                  </>
                )}

                {button.type === 'OTP' && (
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={button.otp_type || 'COPY_CODE'}
                      onChange={(e) => updateButton(button.id, { otp_type: e.target.value as TemplateButton['otp_type'] })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <option value="COPY_CODE">Copy code</option>
                      <option value="ONE_TAP">One tap</option>
                      <option value="ZERO_TAP">Zero tap</option>
                    </select>
                    <input
                      type="text"
                      placeholder="package_name (Android)"
                      value={button.package_name || ''}
                      onChange={(e) => updateButton(button.id, { package_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="signature_hash (Android)"
                      value={button.signature_hash || ''}
                      onChange={(e) => updateButton(button.id, { signature_hash: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                  </div>
                )}

                {button.type === 'MPM' && (
                  <input
                    type="text"
                    placeholder="Texto do botao MPM"
                    value={button.mpm_button_text || ''}
                    onChange={(e) => updateButton(button.id, { mpm_button_text: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
