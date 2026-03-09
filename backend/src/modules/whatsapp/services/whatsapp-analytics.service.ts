import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ConversationMetrics {
  totalConversations: number;
  activeConversations: number;
  newConversations: number;
  resolvedConversations: number;
  averageResponseTime: number; // in seconds
  averageMessagesPerConversation: number;
}

export interface MessageMetrics {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  deliveredMessages: number;
  readMessages: number;
  failedMessages: number;
  deliveryRate: number;
  readRate: number;
  messagesByType: Record<string, number>;
  messagesByHour: Array<{ hour: number; count: number }>;
  messagesByDay: Array<{ date: string; inbound: number; outbound: number }>;
}

export interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalRecipients: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  averageDeliveryRate: number;
  averageReadRate: number;
  campaignPerformance: Array<{
    id: string;
    name: string;
    status: string;
    recipients: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
  }>;
}

export interface AgentMetrics {
  totalAgentConversations: number;
  averageAgentResponseTime: number;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    conversations: number;
    messagesHandled: number;
    averageResponseTime: number;
    satisfactionScore?: number;
  }>;
}

export interface WhatsAppDashboard {
  overview: {
    totalConversations: number;
    activeToday: number;
    messagesSentToday: number;
    messagesReceivedToday: number;
    deliveryRate: number;
    responseRate: number;
  };
  trends: {
    conversationsLastWeek: Array<{ date: string; count: number }>;
    messagesLastWeek: Array<{ date: string; sent: number; received: number }>;
  };
  topContacts: Array<{
    phone: string;
    name: string | null;
    messageCount: number;
    lastMessageAt: Date | null;
  }>;
  recentActivity: Array<{
    type: 'message' | 'campaign' | 'conversation';
    description: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class WhatsAppAnalyticsService {
  private readonly logger = new Logger(WhatsAppAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get conversation metrics
   */
  async getConversationMetrics(
    userId: string,
    dateRange?: DateRange,
  ): Promise<ConversationMetrics> {
    const where: Prisma.WhatsAppConversationWhereInput = { userId };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const [
      totalConversations,
      statusCounts,
      newConversations,
      averageMessages,
    ] = await Promise.all([
      this.prisma.whatsAppConversation.count({ where: { userId } }),
      this.prisma.whatsAppConversation.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      dateRange
        ? this.prisma.whatsAppConversation.count({
            where: {
              userId,
              createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
            },
          })
        : this.prisma.whatsAppConversation.count({
            where: {
              userId,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
      this.prisma.whatsAppMessage.groupBy({
        by: ['conversationId'],
        where: { conversation: { userId } },
        _count: true,
      }),
    ]);

    const statusMap = statusCounts.reduce(
      (acc, s) => {
        acc[s.status] = s._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate average response time (time between inbound and first outbound response)
    const responseTimeResult = await this.prisma.$queryRaw<
      Array<{ avg_response_time: number }>
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM (
          SELECT MIN(om."createdAt") - im."createdAt"
          FROM whatsapp_messages om
          WHERE om."conversationId" = im."conversationId"
            AND om.direction = 'OUTBOUND'
            AND om."createdAt" > im."createdAt"
        ))
      ) as avg_response_time
      FROM whatsapp_messages im
      JOIN whatsapp_conversations c ON c.id = im."conversationId"
      WHERE im.direction = 'INBOUND'
        AND c."userId" = ${userId}
        ${dateRange ? Prisma.sql`AND im."createdAt" >= ${dateRange.startDate} AND im."createdAt" <= ${dateRange.endDate}` : Prisma.sql``}
    `;

    const avgResponseTime = responseTimeResult[0]?.avg_response_time || 0;

    return {
      totalConversations,
      activeConversations: (statusMap['OPEN'] || 0) + (statusMap['ASSIGNED'] || 0),
      newConversations,
      resolvedConversations: statusMap['CLOSED'] || 0,
      averageResponseTime: Math.round(avgResponseTime),
      averageMessagesPerConversation:
        averageMessages.length > 0
          ? Math.round(
              averageMessages.reduce((sum, m) => sum + m._count, 0) /
                averageMessages.length,
            )
          : 0,
    };
  }

  /**
   * Get message metrics
   */
  async getMessageMetrics(
    userId: string,
    dateRange?: DateRange,
  ): Promise<MessageMetrics> {
    const now = new Date();
    const startDate = dateRange?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate || now;

    const where: Prisma.WhatsAppMessageWhereInput = {
      conversation: { userId },
      createdAt: { gte: startDate, lte: endDate },
    };

    const [
      totalMessages,
      directionCounts,
      statusCounts,
      typeCounts,
      hourlyDistribution,
      dailyDistribution,
    ] = await Promise.all([
      this.prisma.whatsAppMessage.count({ where }),
      this.prisma.whatsAppMessage.groupBy({
        by: ['direction'],
        where,
        _count: true,
      }),
      this.prisma.whatsAppMessage.groupBy({
        by: ['status'],
        where: { ...where, direction: 'OUTBOUND' },
        _count: true,
      }),
      this.prisma.whatsAppMessage.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM m."createdAt") as hour, COUNT(*) as count
        FROM whatsapp_messages m
        JOIN whatsapp_conversations c ON c.id = m."conversationId"
        WHERE c."userId" = ${userId}
          AND m."createdAt" >= ${startDate}
          AND m."createdAt" <= ${endDate}
        GROUP BY EXTRACT(HOUR FROM m."createdAt")
        ORDER BY hour
      `,
      this.prisma.$queryRaw<Array<{ date: string; direction: string; count: bigint }>>`
        SELECT DATE(m."createdAt") as date, m.direction, COUNT(*) as count
        FROM whatsapp_messages m
        JOIN whatsapp_conversations c ON c.id = m."conversationId"
        WHERE c."userId" = ${userId}
          AND m."createdAt" >= ${startDate}
          AND m."createdAt" <= ${endDate}
        GROUP BY DATE(m."createdAt"), m.direction
        ORDER BY date
      `,
    ]);

    const directionMap = directionCounts.reduce(
      (acc, d) => {
        acc[d.direction] = d._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const statusMap = statusCounts.reduce(
      (acc, s) => {
        acc[s.status] = s._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const outboundTotal = directionMap['OUTBOUND'] || 0;
    const delivered = statusMap['DELIVERED'] || 0;
    const read = statusMap['READ'] || 0;
    const failed = statusMap['FAILED'] || 0;

    // Process daily distribution
    const dailyMap = new Map<string, { inbound: number; outbound: number }>();
    for (const row of dailyDistribution) {
      const dateStr = row.date.toString().split('T')[0];
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { inbound: 0, outbound: 0 });
      }
      const entry = dailyMap.get(dateStr)!;
      if (row.direction === 'INBOUND') {
        entry.inbound = Number(row.count);
      } else {
        entry.outbound = Number(row.count);
      }
    }

    return {
      totalMessages,
      inboundMessages: directionMap['INBOUND'] || 0,
      outboundMessages: outboundTotal,
      deliveredMessages: delivered + read,
      readMessages: read,
      failedMessages: failed,
      deliveryRate: outboundTotal > 0 ? ((delivered + read) / outboundTotal) * 100 : 100,
      readRate: outboundTotal > 0 ? (read / outboundTotal) * 100 : 0,
      messagesByType: typeCounts.reduce(
        (acc, t) => {
          acc[t.type] = t._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      messagesByHour: hourlyDistribution.map(h => ({
        hour: Number(h.hour),
        count: Number(h.count),
      })),
      messagesByDay: Array.from(dailyMap.entries()).map(([date, counts]) => ({
        date,
        inbound: counts.inbound,
        outbound: counts.outbound,
      })),
    };
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(
    userId: string,
    dateRange?: DateRange,
  ): Promise<CampaignMetrics> {
    const where: Prisma.WhatsAppCampaignWhereInput = { userId };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const campaigns = await this.prisma.whatsAppCampaign.findMany({
      where,
      include: {
        recipients: {
          select: { status: true },
        },
      },
    });

    const statusCounts = campaigns.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    let totalRecipients = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalFailed = 0;

    const campaignPerformance = campaigns.map(c => {
      const recipients = c.recipients.length;
      const delivered = c.recipients.filter(
        r => r.status === 'DELIVERED' || r.status === 'READ',
      ).length;
      const read = c.recipients.filter(r => r.status === 'READ').length;
      const failed = c.recipients.filter(r => r.status === 'FAILED').length;

      totalRecipients += recipients;
      totalDelivered += delivered;
      totalRead += read;
      totalFailed += failed;

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        recipients,
        delivered,
        read,
        failed,
        deliveryRate: recipients > 0 ? (delivered / recipients) * 100 : 0,
        readRate: recipients > 0 ? (read / recipients) * 100 : 0,
      };
    });

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: (statusCounts['ACTIVE'] || 0) + (statusCounts['SCHEDULED'] || 0),
      completedCampaigns: statusCounts['COMPLETED'] || 0,
      totalRecipients,
      totalDelivered,
      totalRead,
      totalFailed,
      averageDeliveryRate:
        totalRecipients > 0 ? (totalDelivered / totalRecipients) * 100 : 0,
      averageReadRate: totalRecipients > 0 ? (totalRead / totalRecipients) * 100 : 0,
      campaignPerformance: campaignPerformance.slice(0, 10), // Top 10 campaigns
    };
  }

  /**
   * Get AI agent metrics for WhatsApp conversations
   */
  async getAgentMetrics(
    userId: string,
    dateRange?: DateRange,
  ): Promise<AgentMetrics> {
    const where: Prisma.WhatsAppConversationWhereInput = {
      userId,
      assignedAgentId: { not: null },
    };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const agentConversations = await this.prisma.whatsAppConversation.findMany({
      where,
      include: {
        assignedAgent: {
          select: { id: true, name: true },
        },
        messages: {
          where: { direction: 'OUTBOUND' },
          select: { createdAt: true },
        },
      },
    });

    // Group by agent
    const agentMap = new Map<
      string,
      {
        name: string;
        conversations: number;
        messages: number;
        responseTimes: number[];
      }
    >();

    for (const conv of agentConversations) {
      if (!conv.assignedAgent) continue;

      const agentId = conv.assignedAgent.id;
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          name: conv.assignedAgent.name,
          conversations: 0,
          messages: 0,
          responseTimes: [],
        });
      }

      const agent = agentMap.get(agentId)!;
      agent.conversations++;
      agent.messages += conv.messages.length;
    }

    // Calculate average response time for each agent (simplified)
    const agentPerformance = Array.from(agentMap.entries()).map(
      ([agentId, data]) => ({
        agentId,
        agentName: data.name,
        conversations: data.conversations,
        messagesHandled: data.messages,
        averageResponseTime:
          data.responseTimes.length > 0
            ? Math.round(
                data.responseTimes.reduce((a, b) => a + b, 0) /
                  data.responseTimes.length,
              )
            : 0,
      }),
    );

    return {
      totalAgentConversations: agentConversations.length,
      averageAgentResponseTime: 0, // Would need more complex query
      agentPerformance,
    };
  }

  /**
   * Get complete WhatsApp dashboard
   */
  async getDashboard(userId: string): Promise<WhatsAppDashboard> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalConversations,
      activeToday,
      messagesSentToday,
      messagesReceivedToday,
      outboundStatusToday,
      conversationsLastWeek,
      messagesLastWeek,
      topContacts,
      recentMessages,
    ] = await Promise.all([
      this.prisma.whatsAppConversation.count({ where: { userId } }),
      this.prisma.whatsAppConversation.count({
        where: { userId, lastMessageAt: { gte: todayStart } },
      }),
      this.prisma.whatsAppMessage.count({
        where: {
          conversation: { userId },
          direction: 'OUTBOUND',
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.whatsAppMessage.count({
        where: {
          conversation: { userId },
          direction: 'INBOUND',
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.whatsAppMessage.groupBy({
        by: ['status'],
        where: {
          conversation: { userId },
          direction: 'OUTBOUND',
          createdAt: { gte: todayStart },
        },
        _count: true,
      }),
      this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM whatsapp_conversations
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${weekAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      this.prisma.$queryRaw<Array<{ date: string; direction: string; count: bigint }>>`
        SELECT DATE(m."createdAt") as date, m.direction, COUNT(*) as count
        FROM whatsapp_messages m
        JOIN whatsapp_conversations c ON c.id = m."conversationId"
        WHERE c."userId" = ${userId}
          AND m."createdAt" >= ${weekAgo}
        GROUP BY DATE(m."createdAt"), m.direction
        ORDER BY date
      `,
      this.prisma.whatsAppConversation.findMany({
        where: { userId },
        orderBy: [
          { lastMessageAt: 'desc' },
        ],
        take: 10,
        include: {
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.whatsAppMessage.findMany({
        where: { conversation: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { conversation: true },
      }),
    ]);

    // Calculate delivery rate
    const statusMap = outboundStatusToday.reduce(
      (acc, s) => {
        acc[s.status] = s._count;
        return acc;
      },
      {} as Record<string, number>,
    );
    const delivered =
      (statusMap['DELIVERED'] || 0) + (statusMap['READ'] || 0) + (statusMap['SENT'] || 0);
    const deliveryRate =
      messagesSentToday > 0 ? (delivered / messagesSentToday) * 100 : 100;

    // Calculate response rate (messages responded to / messages received)
    const responseRate = messagesReceivedToday > 0
      ? Math.min(100, (messagesSentToday / messagesReceivedToday) * 100)
      : 100;

    // Process weekly messages
    const messagesWeekMap = new Map<string, { sent: number; received: number }>();
    for (const row of messagesLastWeek) {
      const dateStr = row.date.toString().split('T')[0];
      if (!messagesWeekMap.has(dateStr)) {
        messagesWeekMap.set(dateStr, { sent: 0, received: 0 });
      }
      const entry = messagesWeekMap.get(dateStr)!;
      if (row.direction === 'OUTBOUND') {
        entry.sent = Number(row.count);
      } else {
        entry.received = Number(row.count);
      }
    }

    return {
      overview: {
        totalConversations,
        activeToday,
        messagesSentToday,
        messagesReceivedToday,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        responseRate: Math.round(responseRate * 10) / 10,
      },
      trends: {
        conversationsLastWeek: conversationsLastWeek.map(c => ({
          date: c.date.toString().split('T')[0],
          count: Number(c.count),
        })),
        messagesLastWeek: Array.from(messagesWeekMap.entries()).map(
          ([date, counts]) => ({
            date,
            sent: counts.sent,
            received: counts.received,
          }),
        ),
      },
      topContacts: topContacts.map(c => ({
        phone: c.contactPhone,
        name: c.contactName,
        messageCount: c._count.messages,
        lastMessageAt: c.lastMessageAt,
      })),
      recentActivity: recentMessages.map(m => ({
        type: 'message' as const,
        description: `${m.direction === 'INBOUND' ? 'Recebido' : 'Enviado'}: ${m.content.substring(0, 50)}${m.content.length > 50 ? '...' : ''}`,
        timestamp: m.createdAt,
      })),
    };
  }

  /**
   * Get hourly message distribution for a specific day
   */
  async getHourlyDistribution(
    userId: string,
    date: Date,
  ): Promise<Array<{ hour: number; inbound: number; outbound: number }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.prisma.$queryRaw<
      Array<{ hour: number; direction: string; count: bigint }>
    >`
      SELECT EXTRACT(HOUR FROM m."createdAt") as hour, m.direction, COUNT(*) as count
      FROM whatsapp_messages m
      JOIN whatsapp_conversations c ON c.id = m."conversationId"
      WHERE c."userId" = ${userId}
        AND m."createdAt" >= ${startOfDay}
        AND m."createdAt" <= ${endOfDay}
      GROUP BY EXTRACT(HOUR FROM m."createdAt"), m.direction
      ORDER BY hour
    `;

    const hourMap = new Map<number, { inbound: number; outbound: number }>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { inbound: 0, outbound: 0 });
    }

    for (const row of result) {
      const hour = Number(row.hour);
      const entry = hourMap.get(hour)!;
      if (row.direction === 'INBOUND') {
        entry.inbound = Number(row.count);
      } else {
        entry.outbound = Number(row.count);
      }
    }

    return Array.from(hourMap.entries()).map(([hour, counts]) => ({
      hour,
      inbound: counts.inbound,
      outbound: counts.outbound,
    }));
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    userId: string,
    dateRange: DateRange,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const [conversationMetrics, messageMetrics, campaignMetrics] =
      await Promise.all([
        this.getConversationMetrics(userId, dateRange),
        this.getMessageMetrics(userId, dateRange),
        this.getCampaignMetrics(userId, dateRange),
      ]);

    const data = {
      exportedAt: new Date().toISOString(),
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
      conversationMetrics,
      messageMetrics,
      campaignMetrics,
    };

    if (format === 'csv') {
      // Create CSV for message daily distribution
      const csvRows = [
        'Date,Inbound Messages,Outbound Messages',
        ...messageMetrics.messagesByDay.map(
          d => `${d.date},${d.inbound},${d.outbound}`,
        ),
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify(data, null, 2);
  }
}
