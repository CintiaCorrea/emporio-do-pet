import { PrismaClient } from '@prisma/client';
import { sendEmail } from './email-service';
import { NewsletterStatus, RecipientType } from '@/types/newsletter';

const prisma = new PrismaClient();

export interface SendNewsletterResult {
  newsletterId: string;
  totalRecipients: number;
  successful: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    error?: string;
    messageId?: string;
  }>;
}

/**
 * Envia um newsletter para todos os destinatários
 */
export async function sendNewsletterToRecipients(
  newsletterId: string
): Promise<SendNewsletterResult> {
  try {
    // Buscar o newsletter com seus recipients INCLUINDO TUTORES
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId },
      include: {
        recipients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            tutor: {
              select: {
                id: true,
                name: true,
                email: true,
                acceptsEmail: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!newsletter) {
      throw new Error('Newsletter não encontrado');
    }

    if (newsletter.status === NewsletterStatus.SENT) {
      throw new Error('Newsletter já foi enviado');
    }

    // Coletar todos os e-mails dos destinatários
    const emailRecipients: string[] = [];

    // Para recipients do tipo CLIENT
    const clientEmails = newsletter.recipients
      .filter(recipient => recipient.clientId && recipient.client?.email)
      .map(recipient => recipient.client!.email!)
      .filter(email => email && email.trim() !== '');

    emailRecipients.push(...clientEmails);

    // Para recipients do tipo TUTOR
    const tutorEmails = newsletter.recipients
      .filter(recipient => 
        recipient.tutorId && 
        recipient.tutor?.email &&
        recipient.tutor.acceptsEmail !== false
      )
      .map(recipient => recipient.tutor!.email!)
      .filter(email => email && email.trim() !== '');

    emailRecipients.push(...tutorEmails);

    // Para recipients do tipo LEAD (email direto)
    const leadEmails = newsletter.recipients
      .filter(recipient => recipient.leadEmail && recipient.leadEmail.trim() !== '')
      .map(recipient => recipient.leadEmail!);

    emailRecipients.push(...leadEmails);

    if (emailRecipients.length === 0) {
      throw new Error('Nenhum destinatário válido encontrado');
    }

    console.log(`Enviando newsletter para ${emailRecipients.length} destinatários`);
    console.log('📧 Detalhes dos destinatários:', {
      clients: clientEmails.length,
      tutors: tutorEmails.length,
      leads: leadEmails.length,
      total: emailRecipients.length
    });

    // Enviar e-mails
    const results = [];
    
    for (const email of emailRecipients) {
      try {
        const result = await sendEmail({
          to: email,
          subject: newsletter.subject,
          html: newsletter.content,
        });
        
        results.push({
          email,
          success: result.success,
          error: result.error,
          messageId: result.messageId,
        });

        // Pequeno delay para evitar ser marcado como spam
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro ao enviar para ${email}:`, error);
        results.push({
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Atualizar status do newsletter
    const newStatus = failed === 0 ? NewsletterStatus.SENT : NewsletterStatus.FAILED;
    
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        status: newStatus,
        sentAt: new Date(),
      },
    });

    // Criar log do envio
    await prisma.newsletterLog.create({
      data: {
        newsletterId,
        details: {
          totalRecipients: emailRecipients.length,
          successful,
          failed,
          sentAt: new Date().toISOString(),
          breakdown: {
            clients: clientEmails.length,
            tutors: tutorEmails.length,
            leads: leadEmails.length
          }
        },
      },
    });

    return {
      newsletterId,
      totalRecipients: emailRecipients.length,
      successful,
      failed,
      results,
    };

  } catch (error) {
    console.error('Erro ao enviar newsletter:', error);
    
    // Atualizar status para failed em caso de erro
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        status: NewsletterStatus.FAILED,
      },
    });

    throw error;
  }
}

/**
 * Busca destinatários baseado no tipo - VERSÃO ATUALIZADA COM TUTORES
 */
export async function getRecipientsByType(recipientType: RecipientType) {
  switch (recipientType) {
    case RecipientType.CLIENT:
      return await prisma.client.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
        where: {
          email: {
            not: '',
            contains: '@',
          },
        },
      });

    case RecipientType.TUTOR:
      return await prisma.tutor.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          acceptsEmail: true,
        },
        where: {
          email: {
            not: '',
            contains: '@',
          },
          acceptsEmail: true,
        },
      });

    case RecipientType.ALL:
      const [clients, tutors] = await Promise.all([
        prisma.client.findMany({
          select: {
            id: true,
            name: true,
            email: true,
          },
          where: {
            email: {
              not: '',
              contains: '@',
            },
          },
        }),
        prisma.tutor.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            acceptsEmail: true,
          },
          where: {
            email: {
              not: '',
              contains: '@',
            },
            acceptsEmail: true,
          },
        })
      ]);
      
      return [...clients, ...tutors];

    case RecipientType.LEAD:
      // Para leads, você pode ter uma tabela específica ou retornar array vazio
      // e deixar que os emails sejam adicionados manualmente
      return [];

    default:
      return [];
  }
}

/**
 * Função auxiliar para buscar emails válidos de clients
 */
export async function getValidClientEmails() {
  const allClients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return allClients.filter(client => 
    client.email && 
    client.email.trim() !== '' && 
    client.email.includes('@')
  );
}

/**
 * Função auxiliar para buscar emails válidos de tutores
 */
export async function getValidTutorEmails() {
  const allTutors = await prisma.tutor.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      acceptsEmail: true,
    },
  });

  return allTutors.filter(tutor => 
    tutor.email && 
    tutor.email.trim() !== '' && 
    tutor.email.includes('@') &&
    tutor.acceptsEmail !== false
  );
}

/**
 * Versão alternativa usando a sintaxe correta do Prisma
 */
export async function getRecipientsByTypePrisma(recipientType: RecipientType) {
  switch (recipientType) {
    case RecipientType.CLIENT:
      return await prisma.client.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
        where: {
          email: {
            not: '',
            contains: '@',
          },
        },
      });

    case RecipientType.TUTOR:
      return await prisma.tutor.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          acceptsEmail: true,
        },
        where: {
          email: {
            not: '',
            contains: '@',
          },
          acceptsEmail: true,
        },
      });

    case RecipientType.ALL:
      const [clients, tutors] = await Promise.all([
        prisma.client.findMany({
          select: {
            id: true,
            name: true,
            email: true,
          },
          where: {
            email: {
              not: '',
              contains: '@',
            },
          },
        }),
        prisma.tutor.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            acceptsEmail: true,
          },
          where: {
            email: {
              not: '',
              contains: '@',
            },
            acceptsEmail: true,
          },
        })
      ]);
      
      return [...clients, ...tutors];

    case RecipientType.LEAD:
      return [];

    default:
      return [];
  }
}

/**
 * Função para verificar a configuração de e-mail
 */
export async function testEmailConfiguration() {
  try {
    const testResult = await sendEmail({
      to: 'test@example.com',
      subject: 'Teste de Configuração - Emporio do Pet',
      html: '<h1>Teste de Configuração</h1><p>Se você recebeu este e-mail, a configuração está funcionando!</p>'
    });

    return {
      success: testResult.success,
      error: testResult.error,
      message: testResult.success ? 'Configuração de e-mail está funcionando' : 'Erro na configuração de e-mail'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: 'Falha no teste de configuração de e-mail'
    };
  }
}
