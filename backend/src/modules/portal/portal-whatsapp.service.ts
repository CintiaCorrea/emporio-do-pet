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

  /**
   * Nome do modelo aprovado na Meta (categoria Autenticacao).
   * O modelo que existe hoje foi criado pelo assistente da propria Meta
   * ("Autenticacao › Verificacao de identidade") e nasceu com o nome
   * `verify_code_1`. Trocou de modelo? So mudar a variavel de ambiente.
   */
  private get templateName(): string {
    return this.config.get<string>('PORTAL_OTP_TEMPLATE') || 'verify_code_1';
  }

  /** Idioma do modelo. Se nao bater com o cadastrado na Meta, ela recusa o envio. */
  private get idioma(): string {
    return this.config.get<string>('PORTAL_OTP_IDIOMA') || 'pt_BR';
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

    const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;

    const envelope = (comBotao: boolean) => ({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefone,
      type: 'template',
      template: {
        name: this.templateName,
        language: { code: this.idioma },
        components: comBotao
          ? [
              { type: 'body', parameters: [{ type: 'text', text: codigo }] },
              // O botao "copiar codigo" recebe o mesmo codigo do corpo.
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: codigo }],
              },
            ]
          : [{ type: 'body', parameters: [{ type: 'text', text: codigo }] }],
      },
    });

    const tentar = async (comBotao: boolean) => {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(envelope(comBotao)),
      });
      const data: any = await resp.json();
      return { ok: resp.ok, status: resp.status, data };
    };

    try {
      let r = await tentar(true);

      // Se o modelo aprovado nao tiver botao de copiar, a Meta recusa por
      // "numero de parametros" — nesse caso mandamos so o corpo. Assim o portal
      // funciona com as duas formas de modelo, sem precisar reconfigurar nada.
      const erro = r.data?.error;
      const pareceBotaoASobrando =
        !r.ok &&
        (erro?.code === 132000 ||
          /param|button|component/i.test(erro?.error_data?.details || erro?.message || ''));

      if (pareceBotaoASobrando) {
        this.logger.warn('Modelo sem botao de copiar — reenviando so com o corpo.');
        r = await tentar(false);
      }

      if (!r.ok) {
        // Nunca logar o codigo — so o motivo da falha, com o nome do modelo
        // para o erro mais comum (nome/idioma diferente do cadastrado na Meta).
        this.logger.error(
          `Falha ao enviar codigo do portal (modelo "${this.templateName}" / ${this.idioma}): ` +
            `${r.data?.error?.message || r.status}`,
        );
        return false;
      }

      this.logger.log(`Codigo do portal enviado (messageId: ${r.data?.messages?.[0]?.id})`);
      return true;
    } catch (e) {
      this.logger.error(`Erro ao enviar codigo do portal: ${(e as Error).message}`);
      return false;
    }
  }
}
