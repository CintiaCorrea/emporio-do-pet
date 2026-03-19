import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.fly.dev') ||
        origin.endsWith('.emporiodopet.com.br') ||
        origin === 'https://emporiodopet.com.br'
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  },
  namespace: '/notifications',
  transports: ['polling', 'websocket'],
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Get token from query or handshake
      const token =
        client.handshake.query.token as string ||
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (!payload?.sub) {
        this.logger.warn(`Client ${client.id} has invalid token`);
        client.disconnect();
        return;
      }

      // Store user ID on socket
      const userId = payload.sub as string;
      client.userId = userId;

      // Add socket to user's socket set
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user's room
      client.join(`user:${userId}`);

      this.logger.log(
        `Client ${client.id} connected for user ${client.userId}`,
      );

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to notifications',
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`);
      
      if (error.name === 'TokenExpiredError') {
        this.logger.warn(`Token expired for client ${client.id}`);
        client.emit('error', { 
          code: 'TOKEN_EXPIRED', 
          message: 'Token expired. Please refresh your token and reconnect.' 
        });
      } else if (error.name === 'JsonWebTokenError') {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.emit('error', { 
          code: 'INVALID_TOKEN', 
          message: 'Invalid token. Please login again.' 
        });
      } else {
        this.logger.error(`Unexpected error for client ${client.id}:`, error);
        client.emit('error', { 
          code: 'CONNECTION_ERROR', 
          message: 'Connection failed. Please try again.' 
        });
      }
      
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Subscribe to specific notification types
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { types: string[] },
  ) {
    if (!client.userId) return;

    for (const type of data.types) {
      client.join(`${client.userId}:${type}`);
    }

    return { success: true, subscribed: data.types };
  }

  // Unsubscribe from notification types
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { types: string[] },
  ) {
    if (!client.userId) return;

    for (const type of data.types) {
      client.leave(`${client.userId}:${type}`);
    }

    return { success: true, unsubscribed: data.types };
  }

  // Mark notification as read
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId || !data.notificationId) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      await this.prisma.notification.updateMany({
        where: {
          id: data.notificationId,
          userId: client.userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      return { success: true, notificationId: data.notificationId };
    } catch (error) {
      this.logger.error(`Error marking notification ${data.notificationId} as read:`, error);
      return { success: false, error: 'Database error' };
    }
  }

  // ============================================
  // Event Listeners - Send notifications to clients
  // ============================================

  @OnEvent('notification.created')
  handleNotificationCreated(notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.sendToUser(notification.userId, 'notification', notification);
  }

  @OnEvent('whatsapp.message.received')
  handleWhatsAppMessageReceived(data: {
    userId: string;
    conversationId: string;
    contactPhone: string;
    contactName?: string;
    content: string;
    messageType: string;
  }) {
    this.sendToUser(data.userId, 'whatsapp:message', {
      ...data,
      eventType: 'received',
    });
  }

  @OnEvent('whatsapp.message.sent')
  handleWhatsAppMessageSent(data: {
    userId: string;
    conversationId: string;
    messageId: string;
  }) {
    this.sendToUser(data.userId, 'whatsapp:message', {
      type: 'sent',
      ...data,
    });
  }

  @OnEvent('whatsapp.message.status_updated')
  handleWhatsAppStatusUpdate(data: {
    userId: string;
    waMessageId: string;
    status: string;
    recipientId: string;
  }) {
    // Send only to the conversation owner (not all users)
    if (data.userId) {
      this.sendToUser(data.userId, 'whatsapp:status', data);
    }
  }

  @OnEvent('whatsapp.conversation.takeover')
  handleWhatsAppTakeover(data: {
    conversationId: string;
    userId: string;
    assignedUserId: string;
    assignedUserName: string;
  }) {
    this.sendToUser(data.userId, 'whatsapp:takeover', {
      conversationId: data.conversationId,
      assignedUserId: data.assignedUserId,
      assignedUserName: data.assignedUserName,
    });
  }

  @OnEvent('whatsapp.conversation.released')
  handleWhatsAppReleased(data: {
    conversationId: string;
    userId: string;
  }) {
    this.sendToUser(data.userId, 'whatsapp:released', {
      conversationId: data.conversationId,
    });
  }

  @OnEvent('whatsapp.campaign.completed')
  handleCampaignCompleted(data: {
    campaignId: string;
    userId: string;
    sent: number;
    failed: number;
    total: number;
  }) {
    this.sendToUser(data.userId, 'campaign:completed', data);
  }

  @OnEvent('automation.completed')
  handleAutomationCompleted(data: {
    automationId: string;
    userId: string;
    success: boolean;
    duration: number;
  }) {
    this.sendToUser(data.userId, 'automation:completed', data);
  }

  // ============================================
  // Helper Methods
  // ============================================

  // Send message to specific user
  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Sent ${event} to user ${userId}`);
  }

  // Send message to all connected users
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
    this.logger.debug(`Broadcast ${event} to all users`);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }
}
