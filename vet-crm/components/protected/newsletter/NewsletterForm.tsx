'use client';

import { CreateNewsletterInput } from '@/types/newsletter';
import { LuEye } from 'react-icons/lu';

interface NewsletterFormProps {
  newsletter: Partial<CreateNewsletterInput>;
  onTextChange: (field: keyof Pick<CreateNewsletterInput, 'title' | 'subject' | 'content'>) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  preview: boolean;
  onPreviewToggle: () => void;
}

export const NewsletterForm = ({ 
  newsletter, 
  onTextChange, 
  preview, 
  onPreviewToggle 
}: NewsletterFormProps) => {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
      <div className="space-y-6">
        {/* Assunto */}
        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-3">
            Assunto *
          </label>
          <input
            type="text"
            id="subject"
            value={newsletter.subject || ''}
            onChange={onTextChange('subject')}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            placeholder="Digite o assunto do e-mail"
          />
        </div>

        {/* Título */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-3">
            Título da Newsletter *
          </label>
          <input
            type="text"
            id="title"
            value={newsletter.title || ''}
            onChange={onTextChange('title')}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
            placeholder="Digite o título da newsletter"
          />
        </div>

        {/* Conteúdo */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label htmlFor="content" className="block text-sm font-semibold text-gray-700">
              Conteúdo *
            </label>
            <button
              type="button"
              onClick={onPreviewToggle}
              className="group px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all duration-300 flex items-center space-x-2"
            >
              <LuEye className="w-4 h-4" />
              <span>{preview ? 'Editar' : 'Visualizar'}</span>
            </button>
          </div>
          
          {preview ? (
            <div 
              className="min-h-[400px] p-6 bg-white/80 border border-gray-200/80 rounded-2xl shadow-inner"
              dangerouslySetInnerHTML={{ __html: newsletter.content || '<p class="text-gray-500 text-center py-20">Digite algum conteúdo para visualizar...</p>' }}
            />
          ) : (
            <textarea
              id="content"
              value={newsletter.content || ''}
              onChange={onTextChange('content')}
              rows={15}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm font-mono text-sm resize-vertical"
              placeholder="Digite o conteúdo da newsletter (HTML permitido)..."
            />
          )}
        </div>
      </div>
    </div>
  );
};
