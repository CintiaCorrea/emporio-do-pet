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
   * Confirmado ATIVO no Gerenciador do WhatsApp em 29/07/2026.
   */
  private get templateName(): string {
    return this.config.get<string>('PORTAL_OTP_TEMPLATE') || 'portal_tutor_codigo';
  }

  /** Idioma preferido. Se nao existir traducao, cai no reserva (ver enviarCodigo). */
  private get idioma(): string {
    return this.config.get<string>('PORTAL_OTP_IDIOMA') || 'pt_BR';
  }

  /**
   * Idioma reserva. O modelo nasceu so em English (US); enquanto a traducao em
   * portugues nao for adicionada na Meta, e melhor o tutor receber o codigo em
   * ingles do que nao conseguir entrar. Sai do ar sozinho quando o pt_BR existir.
   */
  private get idiomaReserva(): string {
    return this.config.get<string>('PORTAL_OTP_IDIOMA_RESERVA') || 'en_US';
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

    const envelope = (comBotao: boolean, idioma: string) => ({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefone,
      type: 'template',
      template: {
        name: this.templateName,
        language: { code: idioma },
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

    const tentar = async (comBotao: boolean, idioma: string) => {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(envelope(comBotao, idioma)),
      });
      const data: any = await resp.json();
      return { ok: resp.ok, status: resp.status, data };
    };

    /** Erro em que insistir com outro formato/idioma faz sentido. */
    const motivo = (r: { ok: boolean; data: any }) => {
      if (r.ok) return null;
      const erro = r.data?.error;
      const texto = `${erro?.message || ''} ${erro?.error_data?.details || ''}`;
      // 132000 = numero de parametros nao bate (modelo sem botao de copiar)
      if (erro?.code === 132000 || /param|button|component/i.test(texto)) return 'BOTAO';
      // 132001 = nao existe modelo com esse nome NESSE idioma
      if (erro?.code === 132001 || /translation|does not exist/i.test(texto)) return 'IDIOMA';
      return 'OUTRO';
    };

    try {
      let idioma = this.idioma;
      let comBotao = true;
      let r = await tentar(comBotao, idioma);

      // 1) Modelo sem botao de copiar: reenvia so com o corpo.
      if (motivo(r) === 'BOTAO') {
        this.logger.warn('Modelo sem botao de copiar — reenviando so com o corpo.');
        comBotao = false;
        r = await tentar(comBotao, idioma);
      }

      // 2) Idioma inexistente: cai no reserva (hoje o modelo so tem English (US)).
      if (motivo(r) === 'IDIOMA' && this.idiomaReserva && this.idiomaReserva !== idioma) {
        this.logger.warn(
          `Modelo "${this.templateName}" nao tem traducao em ${idioma} — usando ${this.idiomaReserva}. ` +
            'Adicionar o idioma na Meta para o tutor receber em portugues.',
        );
        idioma = this.idiomaReserva;
        r = await tentar(comBotao, idioma);
        // O reserva pode ter formato diferente do preferido.
        if (motivo(r) === 'BOTAO') r = await tentar(false, idioma);
      }

      if (!r.ok) {
        // Nunca logar o codigo — so o motivo da falha, com o modelo tentado.
        this.logger.error(
          `Falha ao enviar codigo do portal (modelo "${this.templateName}" / ${idioma}): ` +
            `${r.data?.error?.message || r.status}`,
        );
        return false;
      }

      this.logger.log(
        `Codigo do portal enviado em ${idioma} (messageId: ${r.data?.messages?.[0]?.id})`,
      );
      return true;
    } catch (e) {
      this.logger.error(`Erro ao enviar codigo do portal: ${(e as Error).message}`);
      return false;
    }
  }
}
