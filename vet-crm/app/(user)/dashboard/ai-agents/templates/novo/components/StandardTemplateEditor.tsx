'use client';

import { MediaUploader } from './MediaUploader';
import { ButtonsEditor } from './ButtonsEditor';
import { LanguageSelector } from './LanguageSelector';
import { HeaderFormat, LanguageOption, MetaFlow, TemplateFormData } from '../types';

interface StandardTemplateEditorProps {
  formData: TemplateFormData;
  variablesInBody: string[];
  flows: MetaFlow[];
  languages: LanguageOption[];
  onChange: (updater: (previous: TemplateFormData) => TemplateFormData) => void;
}

export function StandardTemplateEditor({
  formData,
  variablesInBody,
  flows,
  languages,
  onChange}: StandardTemplateEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Editar modelo</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure o conteudo do template.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do modelo *</label>
        <input
          type="text"
          placeholder="ex: promocao_verao"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cabecalho (opcional)</label>
        <div className="flex gap-2 mb-3 flex-wrap">
          {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'] as HeaderFormat[]).map((format) => (
            <button
              key={format}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  headerFormat: format,
                  headerText: ''}))
              }
              className={`px-3 py-2 rounded-lg text-sm ${
                formData.headerFormat === format
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {format}
            </button>
          ))}
        </div>

        {formData.headerFormat === 'TEXT' && (
          <input
            type="text"
            placeholder="Texto do cabecalho (max. 60)"
            maxLength={60}
            value={formData.headerText}
            onChange={(e) => onChange((prev) => ({ ...prev, headerText: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          />
        )}

        {formData.headerFormat === 'LOCATION' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={formData.headerLocation?.latitude ?? ''}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  headerLocation: {
                    ...(prev.headerLocation || { latitude: 0, longitude: 0 }),
                    latitude: Number(e.target.value)}}))
              }
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={formData.headerLocation?.longitude ?? ''}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  headerLocation: {
                    ...(prev.headerLocation || { latitude: 0, longitude: 0 }),
                    longitude: Number(e.target.value)}}))
              }
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
            <input
              type="text"
              placeholder="Nome do local"
              value={formData.headerLocation?.name || ''}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  headerLocation: {
                    ...(prev.headerLocation || { latitude: 0, longitude: 0 }),
                    name: e.target.value}}))
              }
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
            <input
              type="text"
              placeholder="Endereco"
              value={formData.headerLocation?.address || ''}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  headerLocation: {
                    ...(prev.headerLocation || { latitude: 0, longitude: 0 }),
                    address: e.target.value}}))
              }
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>
        )}

        {formData.headerFormat === 'IMAGE' && (
          <MediaUploader
            accept="image/*"
            maxSizeBytes={5 * 1024 * 1024}
            label="Upload de imagem para obter header_handle"
            onUploaded={(handle) => onChange((prev) => ({ ...prev, headerMediaHandle: handle }))}
          />
        )}
        {formData.headerFormat === 'VIDEO' && (
          <MediaUploader
            accept="video/*"
            maxSizeBytes={16 * 1024 * 1024}
            label="Upload de video para obter header_handle"
            onUploaded={(handle) => onChange((prev) => ({ ...prev, headerMediaHandle: handle }))}
          />
        )}
        {formData.headerFormat === 'DOCUMENT' && (
          <MediaUploader
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            maxSizeBytes={100 * 1024 * 1024}
            label="Upload de documento para obter header_handle"
            onUploaded={(handle) => onChange((prev) => ({ ...prev, headerMediaHandle: handle }))}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Corpo da mensagem *</label>
        <textarea
          placeholder="Use {{1}} ou {{nome_variavel}} para variaveis."
          rows={5}
          maxLength={1024}
          value={formData.bodyText}
          onChange={(e) => onChange((prev) => ({ ...prev, bodyText: e.target.value }))}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.bodyText.length}/1024 caracteres</p>

        {variablesInBody.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-3">
              Exemplos para as variaveis (obrigatorio)
            </p>
            <div className="space-y-2">
              {variablesInBody.map((variable, index) => (
                <div key={variable} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-orange-700 dark:text-orange-400 w-20">{variable}</span>
                  <input
                    type="text"
                    placeholder={`Exemplo para ${variable}`}
                    value={formData.bodyExamples[index] || ''}
                    onChange={(e) =>
                      onChange((prev) => {
                        const nextExamples = [...prev.bodyExamples];
                        nextExamples[index] = e.target.value;
                        return { ...prev, bodyExamples: nextExamples };
                      })
                    }
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rodape (opcional)</label>
        <input
          type="text"
          placeholder="Ex: Responda SAIR para cancelar"
          maxLength={60}
          value={formData.footerText}
          onChange={(e) => onChange((prev) => ({ ...prev, footerText: e.target.value }))}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        />
      </div>

      <ButtonsEditor
        category={formData.category}
        buttons={formData.buttons}
        flows={flows}
        onChange={(buttons) => onChange((prev) => ({ ...prev, buttons }))}
      />
    </div>
  );
}
