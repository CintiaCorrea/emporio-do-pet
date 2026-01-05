export interface DashboardStats {
  // ERP Stats
  totalTutores: number;
  totalPets: number;
  totalClientes: number;
  agendamentosHoje: number;
  consultasPendentes: number;
  consultasHoje: number;
  internacoesAtivas: number;
  
  // Financeiro
  faturamentoMes: number;
  faturamentoHoje: number;
  ticketMedio: number;
  comissoesPendentes: number;
  
  // CRM Stats
  taxaConversao: number;
  novosLeads: number;
  leadsQualificados: number;
  crescimentoMensal: number;
  
  // Campanhas
  campanhasAtivas: number;
  emailsEnviados: number;
  taxaAbertura: number;
  
  // AI Agents
  agentesAtivos: number;
  interacoesHoje: number;
  taxaSucessoAgentes: number;
  
  // Estoque
  produtosBaixoEstoque: number;
  produtosTotal: number;
}

export interface AtividadeRecente {
  id: string;
  tipo: 'consulta' | 'cadastro' | 'atualizacao' | 'lead' | 'pagamento' | 'agendamento' | 'internacao' | 'campanha' | 'ai_agent';
  descricao: string;
  tutor?: string;
  pet?: string;
  valor?: number;
  data: string;
  origem: 'botconversa' | 'n8n' | 'manual' | 'sistema' | 'whatsapp' | 'ai_agent';
  status?: 'pendente' | 'concluido' | 'agendado' | 'cancelado' | 'em_andamento';
}

export interface IntegrationStatusType {
  nome: string;
  status: 'online' | 'offline' | 'instavel';
  ultimaSincronizacao: string;
  icone: string;
  tipo: 'chatbot' | 'automation' | 'payment' | 'communication' | 'ai';
}

export interface AgendamentoProximo {
  id: string;
  tutor: string;
  pet: string;
  servico: string;
  horario: string;
  status: 'confirmado' | 'pendente' | 'em_atendimento';
}

export interface PipelineStats {
  etapa: string;
  quantidade: number;
  valor: number;
  cor: string;
}
