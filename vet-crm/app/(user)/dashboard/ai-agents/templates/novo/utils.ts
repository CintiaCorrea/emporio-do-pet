import { ButtonType, TemplateButton, TemplateCategory, TemplateFormData } from './types';

export function sanitizeTemplateName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function detectBodyVariables(body: string): string[] {
  const numberedMatches = body.match(/\{\{(\d+)\}\}/g) || [];
  const namedMatches = body.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g) || [];
  return [...new Set([...numberedMatches, ...namedMatches])];
}

export function getButtonValidationError(buttons: TemplateButton[], category: TemplateCategory): string | null {
  const quickReplies = buttons.filter((b) => b.type === 'QUICK_REPLY').length;
  const urls = buttons.filter((b) => b.type === 'URL').length;
  const phones = buttons.filter((b) => b.type === 'PHONE_NUMBER').length;
  const flows = buttons.filter((b) => b.type === 'FLOW').length;
  const otp = buttons.filter((b) => b.type === 'OTP').length;
  const mpm = buttons.filter((b) => b.type === 'MPM').length;

  if (quickReplies > 0 && (urls > 0 || phones > 0)) {
    return 'A Meta nao permite misturar Resposta Rapida com URL/Telefone.';
  }
  if (quickReplies > 3) return 'Maximo de 3 botoes de resposta rapida.';
  if (urls > 1) return 'Maximo de 1 botao URL.';
  if (phones > 1) return 'Maximo de 1 botao Telefone.';
  if (urls + phones > 2) return 'Maximo de 2 botoes CTA (URL/Telefone).';
  if (flows > 1) return 'Maximo de 1 botao Flow.';
  if (otp > 0 && category !== 'AUTHENTICATION') {
    return 'Botao OTP so e permitido em templates de autenticacao.';
  }
  if (mpm > 0 && category !== 'MARKETING') {
    return 'Botao MPM so e permitido em templates de marketing.';
  }
  if (mpm > 1) return 'Maximo de 1 botao MPM.';

  return null;
}

export function buildTemplatePayload(formData: TemplateFormData) {
  const components: Array<Record<string, unknown>> = [];

  if (formData.headerFormat !== 'NONE') {
    if (formData.headerFormat === 'LOCATION') {
      components.push({
        type: 'HEADER',
        format: 'LOCATION',
        example: formData.headerLocation
          ? {
              header_location: [formData.headerLocation],
            }
          : undefined,
      });
    } else {
      const header: Record<string, unknown> = {
        type: 'HEADER',
        format: formData.headerFormat,
      };
      if (formData.headerFormat === 'TEXT' && formData.headerText.trim()) {
        header.text = formData.headerText.trim();
        if (formData.headerExamples.length > 0) {
          header.example = { header_text: formData.headerExamples.filter(Boolean) };
        }
      }
      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerFormat) && formData.headerMediaHandle) {
        header.example = { header_handle: [formData.headerMediaHandle] };
      }
      components.push(header);
    }
  }

  if (formData.category === 'AUTHENTICATION') {
    const body: Record<string, unknown> = {
      type: 'BODY',
      text: '{{1}} is your verification code.',
    };
    components.push(body);
  } else {
    const body: Record<string, unknown> = {
      type: 'BODY',
      text: formData.bodyText,
    };
    if (formData.bodyExamples.length > 0) {
      body.example = { body_text: [formData.bodyExamples] };
    }
    components.push(body);
  }

  if (formData.templateType === 'CAROUSEL' && formData.carouselCards.length > 0) {
    components.push({
      type: 'CAROUSEL',
      cards: formData.carouselCards.map((card) => ({
        components: [
          {
            type: 'HEADER',
            format: card.mediaFormat,
            example: { header_handle: card.mediaHandle ? [card.mediaHandle] : [] },
          },
          { type: 'BODY', text: card.bodyText },
          ...(card.buttons.length > 0 ? [{ type: 'BUTTONS', buttons: card.buttons.map(normalizeButton) }] : []),
        ],
      })),
    });
  }

  if (formData.templateType === 'LIMITED_TIME_OFFER') {
    components.push({
      type: 'LIMITED_TIME_OFFER',
      limited_time_offer: {
        text: formData.limitedTimeOfferText || 'Oferta por tempo limitado',
        has_expiration: true,
      },
    });
  }

  if (formData.templateType === 'MPM') {
    components.push({
      type: 'BUTTONS',
      buttons: [{ type: 'MPM', mpm_button_text: 'Ver produtos' }],
      sections: formData.mpmSections.map((section) => ({
        title: section.title,
        product_items: section.productRetailerIds.filter(Boolean).map((id) => ({ product_retailer_id: id })),
      })),
    });
  }

  if (formData.templateType === 'ORDER_DETAILS') {
    components.push({
      type: 'ORDER_DETAILS',
      order: {
        items: formData.orderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          amount: item.amount,
        })),
      },
    });
  }

  if (formData.footerText.trim() && formData.templateType !== 'LIMITED_TIME_OFFER') {
    components.push({ type: 'FOOTER', text: formData.footerText.trim() });
  }

  if (formData.buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: formData.buttons.map(normalizeButton),
    });
  }

  return {
    name: sanitizeTemplateName(formData.name),
    category: formData.category,
    language: formData.language,
    components,
    allow_category_change: true,
    ...(formData.category === 'AUTHENTICATION'
      ? {
          add_security_recommendation: formData.addSecurityRecommendation,
          code_expiration_minutes: formData.codeExpirationMinutes,
        }
      : {}),
  };
}

function normalizeButton(button: TemplateButton) {
  const base: Record<string, unknown> = {
    type: button.type,
  };

  if (button.type !== 'OTP') {
    base.text = button.text;
  }

  if (button.type === 'URL' && button.url) {
    base.url = button.url;
    if (button.example) base.example = button.example;
  }
  if (button.type === 'PHONE_NUMBER' && button.phone_number) {
    base.phone_number = button.phone_number;
  }
  if (button.type === 'COPY_CODE' && button.example) {
    base.example = button.example;
  }
  if (button.type === 'FLOW') {
    if (button.flow_id) base.flow_id = button.flow_id;
    if (button.flow_name) base.flow_name = button.flow_name;
    if (button.flow_json) base.flow_json = button.flow_json;
    if (button.navigate_screen) base.navigate_screen = button.navigate_screen;
    if (button.flow_action) base.flow_action = button.flow_action;
  }
  if (button.type === 'OTP') {
    base.otp_type = button.otp_type || 'COPY_CODE';
    if (button.text) base.text = button.text;
    if (button.package_name) base.package_name = button.package_name;
    if (button.signature_hash) base.signature_hash = button.signature_hash;
  }
  if (button.type === 'MPM') {
    if (button.mpm_button_text) base.mpm_button_text = button.mpm_button_text;
  }

  return base;
}

export function getMaxButtons(currentButtons: TemplateButton[]): number {
  const hasQuickReply = currentButtons.some((b) => b.type === 'QUICK_REPLY');
  if (hasQuickReply) return 3;
  return 2;
}

export function getAllowedButtonTypes(currentButtons: TemplateButton[], category: TemplateCategory): ButtonType[] {
  const hasQuickReply = currentButtons.some((b) => b.type === 'QUICK_REPLY');
  const hasCta = currentButtons.some((b) => b.type === 'URL' || b.type === 'PHONE_NUMBER');
  const hasFlow = currentButtons.some((b) => b.type === 'FLOW');
  const hasOtp = currentButtons.some((b) => b.type === 'OTP');
  const hasMpm = currentButtons.some((b) => b.type === 'MPM');

  if (hasOtp) return ['OTP'];
  if (hasMpm) return ['MPM'];
  if (hasQuickReply) return ['QUICK_REPLY'];
  if (hasCta) return hasFlow ? ['URL', 'PHONE_NUMBER', 'FLOW'] : ['URL', 'PHONE_NUMBER', 'FLOW'];
  if (hasFlow) return ['URL', 'PHONE_NUMBER', 'FLOW'];
  if (category === 'AUTHENTICATION') return ['OTP', 'COPY_CODE'];
  if (category === 'MARKETING') return ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'COPY_CODE', 'FLOW', 'MPM'];
  return ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'COPY_CODE', 'FLOW'];
}
