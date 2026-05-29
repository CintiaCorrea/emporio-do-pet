'use client';

import { ButtonsEditor } from './ButtonsEditor';
import { LanguageSelector } from './LanguageSelector';
import { LanguageOption, MetaFlow, TemplateFormData } from '../types';

interface AuthenticationTemplateEditorProps {
  formData: TemplateFormData;
  flows: MetaFlow[];
  languages: LanguageOption[];
  onChange: (updater: (previous: TemplateFormData) => TemplateFormData) => void;
}

export function AuthenticationTemplateEditor({ formData, flows, languages, onChange }: AuthenticationTemplateEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Template de autenticacao</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Esse formato segue as regras da Meta para OTP e validacao de identidade.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do modelo *</label>
        <input
          type="text"
          placeholder="ex: otp_login"
          value={formData.name}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}))
          }
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        />
      </div>

      <LanguageSelector
        value={formData.language}
        languages={languages}
        onChange={(value) => onChange((prev) => ({ ...prev, language: value }))}
      />

      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-300">Texto fixo da Meta:</p>
        <p className="font-medium text-gray-900 dark:text-white mt-1">{'{{1}} is your verification code.'}</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={formData.addSecurityRecommendation}
          onChange={(e) => onChange((prev) => ({ ...prev, addSecurityRecommendation: e.target.checked }))}
        />
        Adicionar recomendacao de seguranca
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiracao do codigo (minutos)</label>
        <input
          type="number"
          min={1}
          max={90}
          value={formData.codeExpirationMinutes ?? ''}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              codeExpirationMinutes: e.target.value ? Number(e.target.value) : undefined}))
          }
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        />
      </div>

      <ButtonsEditor
        category="AUTHENTICATION"
        buttons={formData.buttons}
        flows={flows}
        onChange={(buttons) => onChange((prev) => ({ ...prev, buttons }))}
      />
    </div>
  );
}
