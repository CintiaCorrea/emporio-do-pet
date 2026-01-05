import { AppointmentData, BotConversaContact } from '@/types/bot-conversa';
import prisma from '@/lib/prisma';
import { PersonType, ContactType, PetStatus } from '@prisma/client';

export async function createAppointmentFromConversation(
  appointmentData: AppointmentData,
  contact: BotConversaContact
) {
  try {
    // 1. Buscar ou criar o tutor
    let tutor = await prisma.tutor.findFirst({
      where: {
        OR: [
          { email: contact.email || '' },
          { contacts: { some: { number: contact.phone } } }
        ]
      },
      include: {
        contacts: true
      }
    });

    if (!tutor) {
      tutor = await prisma.tutor.create({
        data: {
          name: contact.name,
          email: contact.email,
          type: 'INDIVIDUAL',
          contacts: {
            create: {
              number: contact.phone,
              type: 'MOBILE',
              isWhatsApp: true,
              isPrimary: true
            }
          }
        },
        include: {
          contacts: true
        }
      });
    }

    // 2. Buscar ou criar o pet
    let pet = await prisma.pet.findFirst({
      where: {
        name: appointmentData.petName,
        tutorId: tutor.id
      }
    });

    if (!pet) {
      pet = await prisma.pet.create({
        data: {
          name: appointmentData.petName,
          species: appointmentData.petSpecies,
          breed: appointmentData.petBreed || 'Não informada',
          tutorId: tutor.id,
          status: 'ACTIVE'
        }
      });
    }

    // 3. Buscar o board padrão de appointments
    let board = await prisma.board.findFirst({
      where: {
        type: 'APPOINTMENT',
        name: 'Agendamentos'
      },
      include: {
        columns: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!board) {
      board = await prisma.board.create({
        data: {
          name: 'Agendamentos',
          type: 'APPOINTMENT',
          description: 'Agendamentos via BotConversa',
          userId: await getDefaultUserId(),
          columns: {
            create: [
              { name: 'Agendado', position: 0, color: 'bg-blue-500' },
              { name: 'Confirmado', position: 1, color: 'bg-green-500' },
              { name: 'Em Andamento', position: 2, color: 'bg-yellow-500' },
              { name: 'Concluído', position: 3, color: 'bg-purple-500' }
            ]
          }
        },
        include: {
          columns: {
            orderBy: { position: 'asc' }
          }
        }
      });
    }

    const scheduledColumn = board.columns.find(col => col.position === 0);
    if (!scheduledColumn) {
      throw new Error('Column "Agendado" not found');
    }

    // 4. Criar o appointment
    const appointmentDate = new Date(
      `${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`
    );

    const appointment = await prisma.appointment.create({
      data: {
        tutorId: tutor.id,
        petId: pet.id,
        userId: await getDefaultUserId(),
        date: appointmentDate,
        duration: appointmentData.duration,
        description: appointmentData.description,
        status: 'SCHEDULED',
        paymentStatus: 'PENDING',
        value: 0,
        kanbanCard: {
          create: {
            title: `Consulta: ${pet.name} - ${tutor.name}`,
            description: `Motivo: ${appointmentData.description}\nData: ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}\nEspécie: ${appointmentData.petSpecies}`,
            position: await getNextCardPosition(scheduledColumn.id),
            columnId: scheduledColumn.id,
            metadata: {
              source: 'bot-conversa',
              contactPhone: contact.phone,
              petName: pet.name,
              tutorName: tutor.name,
              petSpecies: appointmentData.petSpecies,
              appointmentDate: appointmentData.appointmentDate,
              appointmentTime: appointmentData.appointmentTime
            }
          }
        }
      },
      include: {
        kanbanCard: true,
        tutor: true,
        pet: true
      }
    });

    console.log('Appointment created successfully:', {
      appointmentId: appointment.id,
      cardId: appointment.kanbanCard?.id,
      tutor: tutor.name,
      pet: pet.name
    });
    
    return appointment;

  } catch (error) {
    console.error('Error creating appointment from conversation:', error);
    throw error;
  }
}

async function getDefaultUserId(): Promise<string> {
  const defaultUser = await prisma.user.findFirst({
    where: { role: 'VETERINARIAN' }
  });
  
  if (!defaultUser) {
    // Criar um usuário padrão se não existir
    const newUser = await prisma.user.create({
      data: {
        name: 'Veterinário Padrão',
        email: `vet-${Date.now()}@clinica.com`,
        password: 'temp-password', // Você deve gerar uma senha segura
        role: 'VETERINARIAN'
      }
    });
    
    return newUser.id;
  }
  
  return defaultUser.id;
}

async function getNextCardPosition(columnId: string): Promise<number> {
  const lastCard = await prisma.kanbanCard.findFirst({
    where: { columnId },
    orderBy: { position: 'desc' }
  });
  
  return lastCard ? lastCard.position + 1 : 0;
}
