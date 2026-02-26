'use client';

import { TemplateFormData } from '../types';

interface PhonePreviewProps {
  formData: TemplateFormData;
}

export function PhonePreview({ formData }: PhonePreviewProps) {
  let previewBody = formData.category === 'AUTHENTICATION' ? '{{1}} is your verification code.' : formData.bodyText;
  formData.bodyExamples.forEach((example, index) => {
    previewBody = previewBody.replace(`{{${index + 1}}}`, example || `{{${index + 1}}}`);
  });

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Previa do modelo</p>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm max-w-[280px] overflow-hidden">
        {formData.headerFormat === 'TEXT' && formData.headerText && (
          <div className="px-3 pt-3">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{formData.headerText}</p>
          </div>
        )}
        {formData.headerFormat === 'LOCATION' && formData.headerLocation && (
          <div className="px-3 pt-3 text-xs text-gray-600 dark:text-gray-300">
            Local: {formData.headerLocation.name || 'Sem nome'}
          </div>
        )}
        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerFormat) && (
          <div className="bg-gray-200 dark:bg-gray-700 h-24 flex items-center justify-center text-xs text-gray-500">
            Header {formData.headerFormat}
          </div>
        )}

        <div className="p-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {previewBody || 'Digite o corpo da mensagem...'}
          </p>
          {formData.footerText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{formData.footerText}</p>}
          <p className="text-[10px] text-gray-400 text-right mt-1">11:59</p>
        </div>

        {!!formData.buttons.length && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            {formData.buttons.map((button, index) => (
              <button
                key={button.id}
                className={`w-full px-3 py-2.5 text-sm text-blue-500 font-medium flex items-center justify-center gap-2 ${
                  index > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                {button.text || button.type}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
