import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// Event Types
export const EventTypes = {
  // Tutor Events
  TUTOR_CREATED: 'tutor.created',
  TUTOR_UPDATED: 'tutor.updated',
  TUTOR_DELETED: 'tutor.deleted',

  // Pet Events
  PET_CREATED: 'pet.created',
  PET_UPDATED: 'pet.updated',
  PET_DELETED: 'pet.deleted',

  // Appointment Events
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',

  // Product Events
  PRODUCT_LOW_STOCK: 'product.low_stock',
  PRODUCT_OUT_OF_STOCK: 'product.out_of_stock',

  // Lead Events
  LEAD_CREATED: 'lead.created',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_CONVERTED: 'lead.converted',

  // Treatment Events
  TREATMENT_CREATED: 'treatment.created',
  TREATMENT_COMPLETED: 'treatment.completed',

  // Hospitalization Events
  HOSPITALIZATION_STARTED: 'hospitalization.started',
  HOSPITALIZATION_ENDED: 'hospitalization.ended',

  // Payment Events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_OVERDUE: 'payment.overdue',

  // WhatsApp Events
  WHATSAPP_MESSAGE_RECEIVED: 'whatsapp.message.received',
  WHATSAPP_MESSAGE_SENT: 'whatsapp.message.sent',
  WHATSAPP_MESSAGE_DELIVERED: 'whatsapp.message.delivered',
  WHATSAPP_MESSAGE_READ: 'whatsapp.message.read',
  WHATSAPP_MESSAGE_FAILED: 'whatsapp.message.failed',
  WHATSAPP_CONVERSATION_STARTED: 'whatsapp.conversation.started',
  WHATSAPP_CONVERSATION_CLOSED: 'whatsapp.conversation.closed',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// Event Payload Interface
export interface SystemEvent<T = unknown> {
  type: EventType;
  userId: string;
  data: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Specific Event Data Types
export interface TutorEventData {
  tutorId: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface PetEventData {
  petId: string;
  name: string;
  species?: string;
  tutorId: string;
  tutorName?: string;
}

export interface AppointmentEventData {
  appointmentId: string;
  date: Date;
  time?: string;
  status: string;
  petId?: string;
  petName?: string;
  tutorId?: string;
  tutorName?: string;
  tutorPhone?: string;
  tutorEmail?: string;
  serviceType?: string;
}

export interface ProductEventData {
  productId: string;
  name: string;
  currentStock: number;
  minStock?: number;
}

export interface LeadEventData {
  leadId: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  score?: number;
}

export interface WhatsAppMessageEventData {
  messageId: string;
  conversationId: string;
  contactPhone: string;
  contactName?: string;
  content: string;
  type: string;
  direction: 'inbound' | 'outbound';
  waMessageId?: string;
}

export interface WhatsAppConversationEventData {
  conversationId: string;
  contactPhone: string;
  contactName?: string;
  status: string;
  tutorId?: string;
  tutorName?: string;
}

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
    @InjectQueue('automations') private automationsQueue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log('Events service initialized');
  }

  // Emit a system event
  emit<T>(event: SystemEvent<T>) {
    this.logger.debug(`Emitting event: ${event.type}`);
    this.eventEmitter.emit(event.type, event);
    
    // Also emit to a global listener
    this.eventEmitter.emit('system.event', event);
  }

  // Helper methods to emit specific events
  emitTutorCreated(userId: string, data: TutorEventData) {
    this.emit({
      type: EventTypes.TUTOR_CREATED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitPetCreated(userId: string, data: PetEventData) {
    this.emit({
      type: EventTypes.PET_CREATED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitAppointmentCreated(userId: string, data: AppointmentEventData) {
    this.emit({
      type: EventTypes.APPOINTMENT_CREATED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitAppointmentConfirmed(userId: string, data: AppointmentEventData) {
    this.emit({
      type: EventTypes.APPOINTMENT_CONFIRMED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitAppointmentCancelled(userId: string, data: AppointmentEventData) {
    this.emit({
      type: EventTypes.APPOINTMENT_CANCELLED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitAppointmentCompleted(userId: string, data: AppointmentEventData) {
    this.emit({
      type: EventTypes.APPOINTMENT_COMPLETED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitProductLowStock(userId: string, data: ProductEventData) {
    this.emit({
      type: EventTypes.PRODUCT_LOW_STOCK,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitLeadCreated(userId: string, data: LeadEventData) {
    this.emit({
      type: EventTypes.LEAD_CREATED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitTutorUpdated(userId: string, data: TutorEventData) {
    this.emit({ type: EventTypes.TUTOR_UPDATED, userId, data, timestamp: new Date() });
  }

  emitTutorDeleted(userId: string, data: TutorEventData) {
    this.emit({ type: EventTypes.TUTOR_DELETED, userId, data, timestamp: new Date() });
  }

  emitPetUpdated(userId: string, data: PetEventData) {
    this.emit({ type: EventTypes.PET_UPDATED, userId, data, timestamp: new Date() });
  }

  emitPetDeleted(userId: string, data: PetEventData) {
    this.emit({ type: EventTypes.PET_DELETED, userId, data, timestamp: new Date() });
  }

  emitAppointmentRescheduled(userId: string, data: AppointmentEventData) {
    this.emit({ type: EventTypes.APPOINTMENT_RESCHEDULED, userId, data, timestamp: new Date() });
  }

  emitProductOutOfStock(userId: string, data: ProductEventData) {
    this.emit({ type: EventTypes.PRODUCT_OUT_OF_STOCK, userId, data, timestamp: new Date() });
  }

  emitLeadQualified(userId: string, data: LeadEventData) {
    this.emit({ type: EventTypes.LEAD_QUALIFIED, userId, data, timestamp: new Date() });
  }

  emitLeadConverted(userId: string, data: LeadEventData) {
    this.emit({ type: EventTypes.LEAD_CONVERTED, userId, data, timestamp: new Date() });
  }

  emitTreatmentCreated(userId: string, data: { treatmentId: string; petName?: string; tutorName?: string }) {
    this.emit({ type: EventTypes.TREATMENT_CREATED, userId, data, timestamp: new Date() });
  }

  emitTreatmentCompleted(userId: string, data: { treatmentId: string; petName?: string; tutorName?: string }) {
    this.emit({ type: EventTypes.TREATMENT_COMPLETED, userId, data, timestamp: new Date() });
  }

  emitHospitalizationStarted(userId: string, data: { hospitalizationId: string; petName?: string; tutorName?: string }) {
    this.emit({ type: EventTypes.HOSPITALIZATION_STARTED, userId, data, timestamp: new Date() });
  }

  emitHospitalizationEnded(userId: string, data: { hospitalizationId: string; petName?: string; tutorName?: string }) {
    this.emit({ type: EventTypes.HOSPITALIZATION_ENDED, userId, data, timestamp: new Date() });
  }

  emitPaymentReceived(userId: string, data: { amount: number; description?: string; tutorName?: string }) {
    this.emit({ type: EventTypes.PAYMENT_RECEIVED, userId, data, timestamp: new Date() });
  }

  emitPaymentOverdue(userId: string, data: { amount: number; description?: string; tutorName?: string }) {
    this.emit({ type: EventTypes.PAYMENT_OVERDUE, userId, data, timestamp: new Date() });
  }

  // WhatsApp Events
  emitWhatsAppMessageReceived(userId: string, data: WhatsAppMessageEventData) {
    this.emit({
      type: EventTypes.WHATSAPP_MESSAGE_RECEIVED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitWhatsAppMessageSent(userId: string, data: WhatsAppMessageEventData) {
    this.emit({
      type: EventTypes.WHATSAPP_MESSAGE_SENT,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitWhatsAppConversationStarted(userId: string, data: WhatsAppConversationEventData) {
    this.emit({
      type: EventTypes.WHATSAPP_CONVERSATION_STARTED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  emitWhatsAppConversationClosed(userId: string, data: WhatsAppConversationEventData) {
    this.emit({
      type: EventTypes.WHATSAPP_CONVERSATION_CLOSED,
      userId,
      data,
      timestamp: new Date(),
    });
  }

  // Listen to all system events and trigger automations
  @OnEvent('system.event')
  async handleSystemEvent(event: SystemEvent) {
    this.logger.debug(`Handling system event: ${event.type}`);

    try {
      // Find automations that listen to this event type
      const automations = await this.prisma.automation.findMany({
        where: {
          userId: event.userId,
          status: 'ACTIVE',
          trigger: 'EVENT',
        },
      });

      for (const automation of automations) {
        const triggerConfig = automation.triggerConfig as { eventType?: string } | null;
        
        // Check if automation listens to this event type
        if (triggerConfig?.eventType === event.type) {
          this.logger.log(`Triggering automation ${automation.id} for event ${event.type}`);

          await this.automationsQueue.add(
            'execute',
            {
              automationId: automation.id,
              triggeredBy: 'event',
              metadata: {
                eventType: event.type,
                eventData: event.data,
                eventTimestamp: event.timestamp,
              },
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error handling system event ${event.type}:`, error);
    }
  }

  // Get all available event types
  getEventTypes() {
    return Object.entries(EventTypes).map(([key, value]) => ({
      key,
      value,
      label: this.getEventLabel(value),
      description: this.getEventDescription(value),
    }));
  }

  private getEventLabel(eventType: EventType): string {
    const labels: Record<string, string> = {
      'tutor.created': 'Novo Tutor Cadastrado',
      'tutor.updated': 'Tutor Atualizado',
      'tutor.deleted': 'Tutor Removido',
      'pet.created': 'Novo Pet Cadastrado',
      'pet.updated': 'Pet Atualizado',
      'pet.deleted': 'Pet Removido',
      'appointment.created': 'Consulta Agendada',
      'appointment.confirmed': 'Consulta Confirmada',
      'appointment.cancelled': 'Consulta Cancelada',
      'appointment.completed': 'Consulta Finalizada',
      'appointment.rescheduled': 'Consulta Reagendada',
      'product.low_stock': 'Estoque Baixo',
      'product.out_of_stock': 'Produto Esgotado',
      'lead.created': 'Novo Lead',
      'lead.qualified': 'Lead Qualificado',
      'lead.converted': 'Lead Convertido',
      'treatment.created': 'Novo Tratamento',
      'treatment.completed': 'Tratamento Concluído',
      'hospitalization.started': 'Internação Iniciada',
      'hospitalization.ended': 'Internação Finalizada',
      'payment.received': 'Pagamento Recebido',
      'payment.overdue': 'Pagamento em Atraso',
      // WhatsApp Events
      'whatsapp.message.received': 'Mensagem WhatsApp Recebida',
      'whatsapp.message.sent': 'Mensagem WhatsApp Enviada',
      'whatsapp.message.delivered': 'Mensagem WhatsApp Entregue',
      'whatsapp.message.read': 'Mensagem WhatsApp Lida',
      'whatsapp.message.failed': 'Falha no Envio WhatsApp',
      'whatsapp.conversation.started': 'Nova Conversa WhatsApp',
      'whatsapp.conversation.closed': 'Conversa WhatsApp Encerrada',
    };
    return labels[eventType] || eventType;
  }

  private getEventDescription(eventType: EventType): string {
    const descriptions: Record<string, string> = {
      'tutor.created': 'Disparado quando um novo tutor é cadastrado no sistema',
      'pet.created': 'Disparado quando um novo pet é cadastrado',
      'appointment.created': 'Disparado quando uma nova consulta é agendada',
      'appointment.confirmed': 'Disparado quando uma consulta é confirmada',
      'appointment.cancelled': 'Disparado quando uma consulta é cancelada',
      'appointment.completed': 'Disparado quando uma consulta é finalizada',
      'product.low_stock': 'Disparado quando o estoque de um produto atinge o mínimo',
      'lead.created': 'Disparado quando um novo lead é capturado',
      'tutor.updated': 'Disparado quando um tutor é atualizado',
      'tutor.deleted': 'Disparado quando um tutor é removido',
      'pet.updated': 'Disparado quando um pet é atualizado',
      'pet.deleted': 'Disparado quando um pet é removido',
      'appointment.rescheduled': 'Disparado quando uma consulta é reagendada',
      'product.out_of_stock': 'Disparado quando um produto esgota no estoque',
      'lead.qualified': 'Disparado quando um lead é qualificado',
      'lead.converted': 'Disparado quando um lead é convertido em cliente',
      'treatment.created': 'Disparado quando um novo tratamento é criado',
      'treatment.completed': 'Disparado quando um tratamento é concluído',
      'hospitalization.started': 'Disparado quando uma internação é iniciada',
      'hospitalization.ended': 'Disparado quando uma internação é finalizada',
      'payment.received': 'Disparado quando um pagamento é recebido',
      'payment.overdue': 'Disparado quando um pagamento está em atraso',
      // WhatsApp Events
      'whatsapp.message.received': 'Disparado quando uma mensagem WhatsApp é recebida',
      'whatsapp.message.sent': 'Disparado quando uma mensagem WhatsApp é enviada',
      'whatsapp.message.delivered': 'Disparado quando uma mensagem WhatsApp é entregue',
      'whatsapp.message.read': 'Disparado quando uma mensagem WhatsApp é lida',
      'whatsapp.message.failed': 'Disparado quando uma mensagem WhatsApp falha no envio',
      'whatsapp.conversation.started': 'Disparado quando uma nova conversa WhatsApp é iniciada',
      'whatsapp.conversation.closed': 'Disparado quando uma conversa WhatsApp é encerrada',
    };
    return descriptions[eventType] || '';
  }
}
