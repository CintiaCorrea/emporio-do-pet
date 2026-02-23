import {
  InsightGenerator,
  InsightTypeEnum,
  InsightPriorityEnum,
  InsightContext,
} from './base.generator';

/**
 * Geradores de insights B2C
 * Cada gerador avalia condições específicas e gera ações recomendadas
 */
export const insightGenerators: InsightGenerator[] = [
  // ============================================
  // ALTA INTENÇÃO - Ação Urgente
  // ============================================
  {
    type: InsightTypeEnum.HIGH_INTENT,
    name: 'Alta Intenção de Compra',
    description: 'Lead demonstrou forte interesse em comprar',
    evaluate: (ctx: InsightContext) => {
      // Já tem esse insight ativo?
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.HIGH_INTENT)) {
        return null;
      }

      // Score alto + comportamento de compra
      if (
        ctx.currentScore >= 70 &&
        ctx.lead.visitedPricing &&
        (ctx.enrichment?.purchaseIntent === 'high' ||
          ctx.enrichment?.purchaseIntent === 'very_high')
      ) {
        return {
          type: InsightTypeEnum.HIGH_INTENT,
          title: '🔥 Alta intenção de compra',
          action: 'Abordar agora — lead pronto para converter',
          description: `${ctx.lead.name || 'Lead'} visitou a página de preços e demonstra alta intenção de compra. Score: ${ctx.currentScore}/100.`,
          priority: InsightPriorityEnum.URGENT,
          confidence: 0.9,
          rule: 'high_intent_combo',
          triggerData: {
            score: ctx.currentScore,
            visitedPricing: ctx.lead.visitedPricing,
            purchaseIntent: ctx.enrichment?.purchaseIntent,
          },
          expiresInHours: 48,
        };
      }

      return null;
    },
  },

  // ============================================
  // CARRINHO ABANDONADO - Recuperação
  // ============================================
  {
    type: InsightTypeEnum.OFFER_DISCOUNT,
    name: 'Recuperação de Carrinho',
    description: 'Lead abandonou checkout - oportunidade de recuperação',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.OFFER_DISCOUNT)) {
        return null;
      }

      if (ctx.lead.abandonedCart || (ctx.enrichment?.checkoutAbandons ?? 0) > 0) {
        const abandonCount = ctx.enrichment?.checkoutAbandons ?? 1;

        return {
          type: InsightTypeEnum.OFFER_DISCOUNT,
          title: '🛒 Carrinho abandonado',
          action:
            abandonCount >= 2
              ? 'Enviar desconto agressivo — já abandonou várias vezes'
              : 'Reengajar com desconto ou benefício',
          description: `${ctx.lead.name || 'Lead'} abandonou o checkout ${abandonCount}x. Oferecer incentivo pode recuperar a venda.`,
          priority: abandonCount >= 2 ? InsightPriorityEnum.URGENT : InsightPriorityEnum.HIGH,
          confidence: 0.85,
          rule: 'cart_abandon_recovery',
          triggerData: {
            abandonCount,
            lastActivity: ctx.lead.lastActivityAt,
          },
          expiresInHours: 72,
        };
      }

      return null;
    },
  },

  // ============================================
  // WHATSAPP - Canal Preferido
  // ============================================
  {
    type: InsightTypeEnum.SEND_WHATSAPP,
    name: 'Contato via WhatsApp',
    description: 'Lead prefere WhatsApp como canal',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.SEND_WHATSAPP)) {
        return null;
      }

      // Lead veio do WhatsApp ou clicou no WhatsApp
      const prefersWhatsApp =
        ctx.lead.source === 'WHATSAPP' ||
        ctx.recentEvents.whatsappClicks > 0 ||
        ctx.enrichment?.primaryChannel === 'whatsapp';

      if (prefersWhatsApp && ctx.lead.phone && ctx.currentScore >= 40) {
        return {
          type: InsightTypeEnum.SEND_WHATSAPP,
          title: '📱 Prefere WhatsApp',
          action: 'Enviar mensagem personalizada no WhatsApp',
          description: `${ctx.lead.name || 'Lead'} demonstrou preferência por WhatsApp. Abordagem direta pode ser mais efetiva.`,
          priority: InsightPriorityEnum.HIGH,
          confidence: 0.8,
          rule: 'whatsapp_preference',
          triggerData: {
            phone: ctx.lead.phone,
            source: ctx.lead.source,
            whatsappClicks: ctx.recentEvents.whatsappClicks,
          },
          expiresInHours: 168, // 7 dias
        };
      }

      return null;
    },
  },

  // ============================================
  // EMAIL NOTURNO - Timing Ideal
  // ============================================
  {
    type: InsightTypeEnum.SEND_EMAIL,
    name: 'Enviar Email à Noite',
    description: 'Lead mais ativo no período noturno',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.SEND_EMAIL)) {
        return null;
      }

      if (
        ctx.enrichment?.preferredTimeSlot === 'night' ||
        ctx.enrichment?.preferredTimeSlot === 'evening'
      ) {
        return {
          type: InsightTypeEnum.SEND_EMAIL,
          title: '📧 Melhor horário: Noite',
          action: 'Enviar email entre 19h e 22h para maior engajamento',
          description: `${ctx.lead.name || 'Lead'} é mais ativo no período noturno. Programar comunicações para este horário.`,
          priority: InsightPriorityEnum.MEDIUM,
          confidence: 0.7,
          rule: 'optimal_send_time',
          triggerData: {
            preferredTimeSlot: ctx.enrichment?.preferredTimeSlot,
          },
          expiresInHours: 336, // 14 dias
        };
      }

      return null;
    },
  },

  // ============================================
  // LEAD FRIO - Nutrição
  // ============================================
  {
    type: InsightTypeEnum.COLD_LEAD,
    name: 'Lead Frio',
    description: 'Lead com baixo engajamento precisa de nutrição',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.COLD_LEAD)) {
        return null;
      }

      if (ctx.currentScore < 30 && (ctx.enrichment?.daysSinceLastVisit ?? 0) > 7) {
        return {
          type: InsightTypeEnum.COLD_LEAD,
          title: '❄️ Lead frio',
          action: 'Nutrir com conteúdo educativo',
          description: `${ctx.lead.name || 'Lead'} está frio (score ${ctx.currentScore}). Enviar conteúdo de valor para reaquecer.`,
          priority: InsightPriorityEnum.LOW,
          confidence: 0.75,
          rule: 'cold_lead_nurture',
          triggerData: {
            score: ctx.currentScore,
            daysSinceLastVisit: ctx.enrichment?.daysSinceLastVisit,
          },
          expiresInHours: 168, // 7 dias
        };
      }

      return null;
    },
  },

  // ============================================
  // RISCO DE CHURN
  // ============================================
  {
    type: InsightTypeEnum.CHURN_RISK,
    name: 'Risco de Churn',
    description: 'Lead que estava quente está esfriando',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.CHURN_RISK)) {
        return null;
      }

      // Lead tinha score alto mas está inativo
      const wasHot = ctx.lead.visitedPricing || ctx.lead.abandonedCart;
      const isInactive = (ctx.enrichment?.daysSinceLastVisit ?? 0) > 10;

      if (wasHot && isInactive && ctx.currentScore >= 30) {
        return {
          type: InsightTypeEnum.CHURN_RISK,
          title: '⚠️ Risco de perda',
          action: 'Reativar com oferta especial ou contato direto',
          description: `${ctx.lead.name || 'Lead'} demonstrou interesse mas está inativo há ${ctx.enrichment?.daysSinceLastVisit} dias. Risco de perder para concorrência.`,
          priority: InsightPriorityEnum.HIGH,
          confidence: 0.8,
          rule: 'churn_risk_detection',
          triggerData: {
            visitedPricing: ctx.lead.visitedPricing,
            abandonedCart: ctx.lead.abandonedCart,
            daysSinceLastVisit: ctx.enrichment?.daysSinceLastVisit,
            score: ctx.currentScore,
          },
          expiresInHours: 72,
        };
      }

      return null;
    },
  },

  // ============================================
  // REENGAGEMENT - Retorno
  // ============================================
  {
    type: InsightTypeEnum.REENGAGEMENT,
    name: 'Oportunidade de Reengajamento',
    description: 'Lead inativo que pode ser reativado',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.REENGAGEMENT)) {
        return null;
      }

      const daysSinceLastVisit = ctx.enrichment?.daysSinceLastVisit ?? 0;

      // Inativo entre 14 e 30 dias
      if (daysSinceLastVisit >= 14 && daysSinceLastVisit <= 30) {
        return {
          type: InsightTypeEnum.REENGAGEMENT,
          title: '🔄 Hora de reengajar',
          action: 'Enviar campanha de reativação',
          description: `${ctx.lead.name || 'Lead'} não interage há ${daysSinceLastVisit} dias. Momento ideal para campanha de reengajamento.`,
          priority: InsightPriorityEnum.MEDIUM,
          confidence: 0.7,
          rule: 'reengagement_window',
          triggerData: {
            daysSinceLastVisit,
            lastSeenAt: ctx.lead.lastSeenAt,
          },
          expiresInHours: 168, // 7 dias
        };
      }

      return null;
    },
  },

  // ============================================
  // HOT LEAD - Ação Imediata
  // ============================================
  {
    type: InsightTypeEnum.HOT_LEAD,
    name: 'Lead Quente',
    description: 'Lead muito engajado que precisa de ação',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.HOT_LEAD)) {
        return null;
      }

      // Score muito alto + retornou recentemente
      if (
        ctx.currentScore >= 80 &&
        ctx.lead.returnedWithin24h &&
        (ctx.enrichment?.daysSinceLastVisit ?? 999) <= 2
      ) {
        return {
          type: InsightTypeEnum.HOT_LEAD,
          title: '🚀 Lead muito quente!',
          action: 'Ligar agora ou enviar proposta',
          description: `${ctx.lead.name || 'Lead'} está extremamente engajado (score ${ctx.currentScore}) e retornou nas últimas 24h. Janela de conversão aberta!`,
          priority: InsightPriorityEnum.URGENT,
          confidence: 0.95,
          rule: 'hot_lead_urgent',
          triggerData: {
            score: ctx.currentScore,
            returnedWithin24h: ctx.lead.returnedWithin24h,
            recentPricingViews: ctx.recentEvents.pricingViews,
          },
          expiresInHours: 24,
        };
      }

      return null;
    },
  },

  // ============================================
  // NUTRIÇÃO DE CONTEÚDO
  // ============================================
  {
    type: InsightTypeEnum.NURTURE_CONTENT,
    name: 'Nutrir com Conteúdo',
    description: 'Lead morno que se beneficia de conteúdo educativo',
    evaluate: (ctx: InsightContext) => {
      if (ctx.existingInsightTypes.includes(InsightTypeEnum.NURTURE_CONTENT)) {
        return null;
      }

      // Score médio, engajamento moderado
      if (
        ctx.currentScore >= 30 &&
        ctx.currentScore < 60 &&
        (ctx.enrichment?.totalSessions ?? 0) >= 2
      ) {
        return {
          type: InsightTypeEnum.NURTURE_CONTENT,
          title: '📚 Nutrir com conteúdo',
          action: 'Enviar material educativo relevante',
          description: `${ctx.lead.name || 'Lead'} está no meio do funil (score ${ctx.currentScore}). Conteúdo educativo pode acelerar decisão.`,
          priority: InsightPriorityEnum.MEDIUM,
          confidence: 0.7,
          rule: 'mid_funnel_nurture',
          triggerData: {
            score: ctx.currentScore,
            sessions: ctx.enrichment?.totalSessions,
          },
          expiresInHours: 336, // 14 dias
        };
      }

      return null;
    },
  },
];

export * from './base.generator';
