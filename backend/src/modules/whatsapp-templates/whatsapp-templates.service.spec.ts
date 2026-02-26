import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppTemplatesService } from './whatsapp-templates.service';
import { TemplateCategory } from './dto/create-whatsapp-template.dto';

describe('WhatsAppTemplatesService', () => {
  let service: WhatsAppTemplatesService;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'WHATSAPP_API_VERSION') return 'v21.0';
        return undefined;
      }),
    } as unknown as ConfigService;

    const prismaService = {} as PrismaService;
    service = new WhatsAppTemplatesService(configService, prismaService);
  });

  describe('validateButtonRules', () => {
    it('should reject mixing quick replies with CTA buttons', () => {
      const result = (service as any).validateButtonRules(
        [
          {
            type: 'BUTTONS',
            buttons: [
              { type: 'QUICK_REPLY', text: 'A' },
              { type: 'URL', text: 'B', url: 'https://example.com' },
            ],
          },
        ],
        TemplateCategory.MARKETING,
      );
      expect(result).toContain('misturar QUICK_REPLY');
    });
  });

  describe('validateTemplateComposition', () => {
    it('should require BODY in every template', () => {
      const result = (service as any).validateTemplateComposition(TemplateCategory.MARKETING, [
        { type: 'BUTTONS', buttons: [] },
      ]);
      expect(result).toContain('componente BODY');
    });

    it('should reject FOOTER for authentication templates', () => {
      const result = (service as any).validateTemplateComposition(TemplateCategory.AUTHENTICATION, [
        { type: 'BODY', text: '{{1}} is your verification code.' },
        { type: 'FOOTER', text: 'not allowed' },
      ]);
      expect(result).toContain('não suportam FOOTER');
    });

    it('should reject mismatched carousel card button signatures', () => {
      const result = (service as any).validateTemplateComposition(TemplateCategory.MARKETING, [
        { type: 'BODY', text: 'Body' },
        {
          type: 'CAROUSEL',
          cards: [
            {
              components: [
                { type: 'HEADER', format: 'IMAGE' },
                { type: 'BODY', text: 'Card 1' },
                { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Open', url: 'https://example.com' }] },
              ],
            },
            {
              components: [
                { type: 'HEADER', format: 'IMAGE' },
                { type: 'BODY', text: 'Card 2' },
                { type: 'BUTTONS', buttons: [{ type: 'PHONE_NUMBER', text: 'Call', phone_number: '+5511999999999' }] },
              ],
            },
          ],
        },
      ]);
      expect(result).toContain('mesmos tipos de botões');
    });

    it('should reject ORDER_DETAILS outside utility category', () => {
      const result = (service as any).validateTemplateComposition(TemplateCategory.MARKETING, [
        { type: 'BODY', text: 'Body' },
        { type: 'ORDER_DETAILS', order: { items: [] } },
      ]);
      expect(result).toContain('ORDER_DETAILS');
    });
  });

  describe('validateTemplateMediaRules', () => {
    it('should reject oversized image', () => {
      const result = (service as any).validateTemplateMediaRules('image/png', 6 * 1024 * 1024);
      expect(result).toContain('5MB');
    });

    it('should reject unsupported mime type', () => {
      const result = (service as any).validateTemplateMediaRules('application/zip', 1024);
      expect(result).toContain('não suportado');
    });

    it('should allow valid document size', () => {
      const result = (service as any).validateTemplateMediaRules('application/pdf', 1024 * 1024);
      expect(result).toBeNull();
    });
  });
});
