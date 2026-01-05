'use client';

import { useState } from 'react';
import { Newsletter, NewsletterStatus } from '@/types/newsletter';

const NewsletterListPage = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([
    {
      id: '1',
      title: 'Newsletter de Boas-vindas',
      subject: 'Bem-vindo à nossa plataforma!',
      status: NewsletterStatus.SENT, // ✅ Usando o enum corretamente
      recipientType: 'CLIENT', // ✅ Adicionei este campo que é obrigatório
      userId: 'user-123', // ✅ Adicionei este campo que é obrigatório
      recipients: [
        { 
          newsletterId: '1',
          clientId: 'client-1',
          client: {
            id: 'client-1',
            name: 'User One',
            email: 'user1@example.com',
            pets: []
          }
        },
        { 
          newsletterId: '1',
          clientId: 'client-2', 
          client: {
            id: 'client-2',
            name: 'User Two',
            email: 'user2@example.com',
            pets: []
          }
        }
      ],
      content: 'Conteúdo da newsletter...',
      createdAt: new Date('2024-01-15'),
      scheduledFor: new Date('2024-01-15'),
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Newsletters</h1>
            <p className="text-gray-600 mt-1">Gerencie suas newsletters enviadas e agendadas</p>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assunto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destinatários
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {newsletters.map((newsletter) => (
                    <tr key={newsletter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {newsletter.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {newsletter.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          newsletter.status === NewsletterStatus.SENT 
                            ? 'bg-green-100 text-green-800'
                            : newsletter.status === NewsletterStatus.SCHEDULED
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {newsletter.status === NewsletterStatus.SENT ? 'Enviado' : 
                           newsletter.status === NewsletterStatus.SCHEDULED ? 'Agendado' : 'Rascunho'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {newsletter.recipientType === 'CLIENT' ? 'Clientes' : 'Leads'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {newsletter.recipients.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {newsletter.createdAt?.toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterListPage;
