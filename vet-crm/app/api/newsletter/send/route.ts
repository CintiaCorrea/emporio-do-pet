import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { sendNewsletterToRecipients } from '@/lib/newsletter-service';
import { NewsletterStatus, RecipientType } from '@/types/newsletter';

const prisma = new PrismaClient();

interface SendNewsletterRequest {
  newsletterId?: string; // Opcional agora
  // Campos para criação direta
  title?: string;
  content?: string;
  subject?: string;
  status?: NewsletterStatus;
  recipientType?: RecipientType;
  scheduledFor?: string;
  recipients?: any[];
  sentAt?: string;
}

export async function POST(request: NextRequest) {
  console.log('📨 Iniciando requisição POST para /api/newsletter/send');
  
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: SendNewsletterRequest = await request.json();
    const { newsletterId, ...newsletterData } = body;

    console.log('📦 Body recebido:', { newsletterId, hasNewsletterData: !!newsletterData.title });

    let targetNewsletterId = newsletterId;

    // SE não tem newsletterId, mas tem dados para criar um novo
    if (!targetNewsletterId && newsletterData.title) {
      console.log('🆕 Criando novo newsletter antes do envio...');
      
      // Criar o newsletter primeiro
      const newNewsletter = await prisma.newsletter.create({
        data: {
          title: newsletterData.title || 'Sem título',
          content: newsletterData.content || '',
          subject: newsletterData.subject || '',
          status: NewsletterStatus.DRAFT, // Criar como rascunho primeiro
          recipientType: newsletterData.recipientType || RecipientType.ALL,
          scheduledFor: newsletterData.scheduledFor ? new Date(newsletterData.scheduledFor) : null,
          userId: user.id,
          recipients: {
            create: newsletterData.recipients?.map(recipient => ({
              clientId: recipient.clientId,
              tutorId: recipient.tutorId,
              leadEmail: recipient.leadEmail,
            })) || []
          }
        },
        include: {
          recipients: true
        }
      });

      targetNewsletterId = newNewsletter.id;
      console.log('✅ Newsletter criado:', targetNewsletterId);
    }

    if (!targetNewsletterId) {
      console.log('❌ Newsletter ID não fornecido e não foi possível criar um novo');
      return NextResponse.json(
        { error: 'Newsletter ID é obrigatório ou dados de criação incompletos' },
        { status: 400 }
      );
    }

    console.log('🔍 Buscando newsletter:', targetNewsletterId);

    // Verificar se o newsletter pertence ao usuário
    const newsletter = await prisma.newsletter.findFirst({
      where: {
        id: targetNewsletterId,
        userId: user.id,
      },
      include: {
        recipients: {
          include: {
            client: {
              select: { email: true, name: true }
            },
            tutor: {
              select: { email: true, name: true, acceptsEmail: true }
            }
          }
        }
      },
    });

    if (!newsletter) {
      console.log('❌ Newsletter não encontrado ou não pertence ao usuário');
      return NextResponse.json(
        { error: 'Newsletter não encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Newsletter encontrado:', {
      id: newsletter.id,
      title: newsletter.title,
      totalRecipients: newsletter.recipients.length
    });

    // Disparar o newsletter
    const result = await sendNewsletterToRecipients(targetNewsletterId);

    console.log('✅ Disparo concluído:', {
      successful: result.successful,
      failed: result.failed,
      total: result.totalRecipients
    });

    // CORREÇÃO: Remover a propriedade duplicada newsletterId do spread
    const { newsletterId: resultNewsletterId, ...resultWithoutId } = result;

    return NextResponse.json({
      message: 'Newsletter enviado com sucesso',
      newsletterId: targetNewsletterId,
      ...resultWithoutId, // Usar o resultado sem a propriedade duplicada
    });

  } catch (error) {
    console.error('💥 Erro ao enviar newsletter:', error);
    
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
