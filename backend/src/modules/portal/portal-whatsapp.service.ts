/**
 * Envio do codigo de acesso pelo WhatsApp.
 *
 * Por que o portal tem o proprio envio, em vez de chamar o WhatsAppService do CRM:
 * template de AUTENTICACAO exige um componente de BOTAO ("copiar codigo") que o
 * metodo generico do CRM nao monta. Em vez de mexer no servico do vizinho (regra
 * 4: le do vizinho, so escreve no seu), o portal monta o proprio envelope.
 * As credenciais sao lidas da MESMA configuracao — nao ha segunda conta.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PortalWhatsappService {
  private readonly logger = new Logger(PortalWhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  /** Nome do modelo aprovado na Meta (categoria Autenticacao). */
  private get templateName(): string {
    return this.config.get<string>('PORTAL_OTP_TEMPLATE') || 'portal_tutor_codigo';
  }

  /**
   * Manda o codigo. Devolve `false` em vez de estourar: quem chama registra o
   * ocorrido e responde a mesma coisa pro tutor, para nao vazar pela mensagem de
   * erro se o numero existe ou nao.
   */
  async enviarCodigo(telefone: string, codigo: string): Promise<boolean> {
    const token = this.config.get<string>('whatsapp.accessToken');
    const phoneId = this.config.get<string>('whatsapp.phoneNumberId');
    const apiVersion = this.config.get<string>('whatsapp.apiVersion') || 'v21.0';

    if (!token || !phoneId) {
      this.logger.error('WhatsApp nao configurado — codigo do portal nao enviado');
      return false;
    }

    // Template de autenticacao: o codigo vai no corpo E no botao de copiar.
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefone,
      type: 'template',
      template: {
        name: this.templateName,
        language: { code: 'pt_BR' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: codigo }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: codigo }],
          },
        ],
      },
    };

    try {
      const resp = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data: any = await resp.json();
      if (!resp.ok) {
        // Nunca logar o codigo — so o motivo da falha.
        this.logger.error(
          `Falha ao enviar codigo do portal: ${data?.error?.message || resp.status}`,
        );
        return false;
      }
      this.logger.log(`Codigo do portal enviado (messageId: ${data?.messages?.[0]?.id})`);
      return true;
    } catch (e) {
      this.logger.error(`Erro ao enviar codigo do portal: ${(e as Error).message}`);
      return false;
    }
  }
}
