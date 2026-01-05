'use client';

import { NewsletterTemplate } from '@/types/newsletter';
import { LuLayoutTemplate, LuFileText } from 'react-icons/lu';

interface TemplateSelectorProps {
  templates: NewsletterTemplate[];
  onTemplateSelect: (template: NewsletterTemplate) => void;
  isLoading: boolean;
}

export const TemplateSelector = ({ 
  templates, 
  onTemplateSelect, 
  isLoading 
}: TemplateSelectorProps) => {
  if (isLoading) {
    return (
      <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-xl">
            <LuLayoutTemplate className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Escolha um Template</h3>
        </div>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-xl">
          <LuLayoutTemplate className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Escolha um Template</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => onTemplateSelect(template)}
            className="group p-4 bg-white/80 border border-gray-200/80 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-lg transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <LuFileText className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">{template.name}</h4>
            </div>
            <p className="text-sm text-gray-600">Clique para usar este template</p>
          </button>
        ))}
      </div>
    </div>
  );
};
