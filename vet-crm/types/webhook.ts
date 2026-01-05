export interface BotConversaWebhook {
  type: 'botconversa';
  data: {
    name: string;
    phone: string;
    email?: string;
    fields: {
      nome_animal?: string;
      especie?: string;
      raca?: string;
      idade?: string;
      sintomas?: string;
      data_consulta?: string;
    };
  };
}

export interface N8NWebhook {
  type: 'n8n';
  data: {
    paciente: {
      nome: string;
      especie: string;
      raca: string;
      idade: number;
    };
    proprietario: {
      nome: string;
      telefone: string;
      email: string;
    };
    consulta: {
      data: string;
      sintomas: string;
      observacoes?: string;
    };
  };
}

export type WebhookPayload = BotConversaWebhook | N8NWebhook;
