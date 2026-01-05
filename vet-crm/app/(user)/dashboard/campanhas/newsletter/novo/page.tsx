'use client';

import { useState, useRef, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { 
  NewsletterStatus, 
  RecipientType, 
  Client, 
  NewsletterTemplate,
  CreateNewsletterInput,
  Tutor 
} from '@/types/newsletter';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { TemplateSelector } from '@/components/protected/newsletter/TemplateSelector';
import { NewsletterForm } from '@/components/protected/newsletter/NewsletterForm';
import { RecipientSelector } from '@/components/protected/newsletter/RecipientSelector';
import { ScheduleSection } from '@/components/protected/newsletter/ScheduleSection';
import { ActionButtons } from '@/components/protected/newsletter/ActionButtons';
import { LuEye } from 'react-icons/lu';

const NewsletterPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newsletter, setNewsletter] = useState<Partial<CreateNewsletterInput>>({
    title: '',
    content: '',
    subject: '',
    status: NewsletterStatus.DRAFT,
    recipientType: RecipientType.ALL,
    scheduledFor: new Date(),
    recipients: []
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedTutors, setSelectedTutors] = useState<string[]>([]);
  const [leadEmails, setLeadEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Carregar clientes, tutores e templates do banco
  useEffect(() => {
    loadClients();
    loadTutors();
    loadTemplates();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Erro ao carregar clientes');
      }
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar lista de clientes');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTutors = async () => {
    try {
      const response = await fetch('/api/tutors');
      if (!response.ok) {
        throw new Error('Erro ao carregar tutores');
      }
      const data = await response.json();
      setTutors(data.tutors || []);
    } catch (error) {
      console.error('Erro ao carregar tutores:', error);
      toast.error('Erro ao carregar lista de tutores');
      setTutors([]);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/newsletters/templates');
      if (!response.ok) {
        throw new Error('Erro ao carregar templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      // Se não houver templates na API, usar templates padrão
      setTemplates([
        {
          id: '1',
          name: 'Template de Boas-vindas',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px;">
              <div style="background: white; padding: 30px; border-radius: 12px; color: #333;">
                <h1 style="color: #2563eb; margin-bottom: 16px; font-size: 28px; font-weight: bold;">Bem-vindo à nossa clínica!</h1>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Prezado cliente,</p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Estamos muito felizes em tê-lo conosco! Sua saúde e bem-estar são nossa maior prioridade.</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
                  <p style="margin: 0; font-style: italic;">"Cuidar de você com excelência e carinho"</p>
                </div>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Atenciosamente,<br><strong>Equipe da Clínica</strong></p>
              </div>
            </div>
          `,
          subject: 'Bem-vindo à nossa clínica veterinária!'
        },
        {
          id: '2',
          name: 'Template Promocional',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 16px;">
              <div style="background: white; padding: 30px; border-radius: 12px; color: #333;">
                <h1 style="color: #dc2626; margin-bottom: 20px; font-size: 32px; font-weight: bold; text-align: center;">Oferta Especial! 🎁</h1>
                <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px; text-align: center;">Confira nossas promoções exclusivas para o seu pet:</p>
                <div style="background: #fef2f2; padding: 20px; border-radius: 12px; border: 2px dashed #dc2626; margin: 20px 0;">
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 12px; border-bottom: 1px solid #fecaca; font-size: 16px;">✅ Vacinação com 20% de desconto</li>
                    <li style="padding: 12px; border-bottom: 1px solid #fecaca; font-size: 16px;">✅ Consulta de check-up gratuita</li>
                    <li style="padding: 12px; font-size: 16px;">✅ Banho e tosa com 15% off</li>
                  </ul>
                </div>
                <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">Promoção válida até o final do mês!</p>
              </div>
            </div>
          `,
          subject: 'Promoções especiais para seu pet! 🐾'
        }
      ]);
    }
  };

  // Função específica para campos de string
  const handleTextChange = (field: keyof Pick<CreateNewsletterInput, 'title' | 'subject' | 'content'>) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setNewsletter(prev => ({
        ...prev,
        [field]: e.target.value
      }));
    };

  // Função específica para datetime
  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewsletter(prev => ({
      ...prev,
      scheduledFor: new Date(e.target.value)
    }));
  };

  // Função específica para select de recipientType
  const handleRecipientTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewsletter(prev => ({
      ...prev,
      recipientType: e.target.value as RecipientType
    }));
  };

  const handleTemplateSelect = (template: NewsletterTemplate) => {
    setNewsletter(prev => ({
      ...prev,
      content: template.content,
      subject: template.subject,
      title: template.name
    }));
    toast.success(`Template "${template.name}" aplicado com sucesso!`);
  };

  const handleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleTutorSelection = (tutorId: string) => {
    setSelectedTutors(prev => 
      prev.includes(tutorId) 
        ? prev.filter(id => id !== tutorId)
        : [...prev, tutorId]
    );
  };

  const handleLeadsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const emails = content.split('\n')
          .map(line => line.split(',')[0].trim())
          .filter(email => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return email.includes('@') && emailRegex.test(email);
          });
        
        setLeadEmails(emails);
        if (emails.length > 0) {
          toast.success(`${emails.length} emails carregados com sucesso!`);
        } else {
          toast.error('Nenhum email válido encontrado no arquivo');
        }
      };
      reader.readAsText(file);
    }
  };

  const prepareRecipients = (): { clientId?: string; tutorId?: string; leadEmail?: string }[] => {
    switch (newsletter.recipientType) {
      case RecipientType.ALL:
        return [
          ...clients.map(client => ({ clientId: client.id })),
          ...tutors.map(tutor => ({ tutorId: tutor.id }))
        ];
      case RecipientType.CLIENT:
        return selectedClients.map(clientId => ({ clientId }));
      case RecipientType.TUTOR:
        return selectedTutors.map(tutorId => ({ tutorId }));
      case RecipientType.LEAD:
        return leadEmails.map(email => ({ leadEmail: email }));
      default:
        return [];
    }
  };

  const handleSaveDraft = async () => {
    let toastId: string | undefined;
    
    try {
      setIsSending(true);
      toastId = toast.loading('Salvando rascunho...');
      const recipients = prepareRecipients();
      
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newsletter,
          status: NewsletterStatus.DRAFT,
          recipients
        })
      });

      if (response.ok) {
        if (toastId) toast.dismiss(toastId);
        toast.success('Rascunho salvo com sucesso!');
        resetForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar rascunho');
      }
    } catch (error) {
      console.error('Error:', error);
      if (toastId) toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar rascunho');
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!newsletter.scheduledFor) {
      toast.error('Selecione uma data para agendamento');
      return;
    }

    let toastId: string | undefined;
    
    try {
      setIsSending(true);
      toastId = toast.loading('Agendando newsletter...');
      const recipients = prepareRecipients();
      
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newsletter,
          status: NewsletterStatus.SCHEDULED,
          recipients
        })
      });

      if (response.ok) {
        if (toastId) toast.dismiss(toastId);
        toast.success('Newsletter agendada com sucesso!');
        resetForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao agendar newsletter');
      }
    } catch (error) {
      console.error('Error:', error);
      if (toastId) toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : 'Erro ao agendar newsletter');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendNow = async () => {
    let toastId: string | undefined;
    
    try {
      setIsSending(true);
      toastId = toast.loading('Enviando newsletter...');
      const recipients = prepareRecipients();
      
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newsletter,
          status: NewsletterStatus.SENT,
          recipients,
          sentAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        if (toastId) toast.dismiss(toastId);
        toast.success('Newsletter enviada com sucesso!');
        resetForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar newsletter');
      }
    } catch (error) {
      console.error('Error:', error);
      if (toastId) toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar newsletter');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setNewsletter({
      title: '',
      content: '',
      subject: '',
      status: NewsletterStatus.DRAFT,
      recipientType: RecipientType.ALL,
      scheduledFor: new Date(),
      recipients: []
    });
    setSelectedClients([]);
    setSelectedTutors([]);
    setLeadEmails([]);
  };

  const getRecipientCount = (): number => {
    switch (newsletter.recipientType) {
      case RecipientType.ALL:
        return clients.length + tutors.length;
      case RecipientType.CLIENT:
        return selectedClients.length;
      case RecipientType.TUTOR:
        return selectedTutors.length;
      case RecipientType.LEAD:
        return leadEmails.length;
      default:
        return 0;
    }
  };

  const isFormValid = (): boolean => {
    return !!newsletter.content && 
           !!newsletter.subject && 
           !!newsletter.title && 
           getRecipientCount() > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Toaster Component - Adicionado diretamente aqui */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
          },
          success: {
            duration: 3000,
            style: {
              background: '#22c55e',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#22c55e',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
          loading: {
            style: {
              background: '#3b82f6',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#3b82f6',
            },
          },
        }}
      />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Criar Newsletter
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Envie newsletters personalizadas para clientes, tutores e leads
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPreview(!preview)}
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuEye className="w-4 h-4" />
                    <span>{preview ? 'Editar' : 'Pré-visualizar'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Coluna principal - Editor */}
              <div className="xl:col-span-2 space-y-6">
                <TemplateSelector 
                  templates={templates}
                  onTemplateSelect={handleTemplateSelect}
                  isLoading={isLoading}
                />

                <NewsletterForm 
                  newsletter={newsletter}
                  onTextChange={handleTextChange}
                  preview={preview}
                  onPreviewToggle={() => setPreview(!preview)}
                />
              </div>

              {/* Sidebar - Configurações */}
              <div className="space-y-6">
                <RecipientSelector
                  recipientType={newsletter.recipientType || RecipientType.ALL}
                  onRecipientTypeChange={handleRecipientTypeChange}
                  clients={clients}
                  tutors={tutors}
                  selectedClients={selectedClients}
                  selectedTutors={selectedTutors}
                  leadEmails={leadEmails}
                  onClientSelection={handleClientSelection}
                  onTutorSelection={handleTutorSelection}
                  onLeadsUpload={handleLeadsUpload}
                  isLoading={isLoading}
                />

                <ScheduleSection 
                  scheduledFor={newsletter.scheduledFor || new Date()}
                  onDateTimeChange={handleDateTimeChange}
                />

                <ActionButtons
                  onSaveDraft={handleSaveDraft}
                  onSchedule={handleSchedule}
                  onSendNow={handleSendNow}
                  isSending={isSending}
                  isFormValid={isFormValid()}
                  hasScheduledDate={!!newsletter.scheduledFor}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterPage;
