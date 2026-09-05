-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VETERINARIAN', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED', 'CONFIRMED', 'IN_PROGRESS', 'MISSED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTA', 'RETORNO', 'AVALIACAO', 'EMERGENCIA', 'PROCEDIMENTO', 'VACINACAO', 'CIRURGIA', 'SESSAO_FISIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('MEDICINE', 'VACCINE', 'SERVICE', 'PACOTE', 'KIT');

-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('APPOINTMENT', 'CONSULTATION', 'HOSPITALIZATION', 'TREATMENT', 'TASK', 'PROJECT', 'LEAD', 'CLIENT', 'SALES');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('CLIENT', 'LEAD', 'TUTOR', 'ALL');

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceEntryStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "FinancePaymentMethod" AS ENUM ('CASH', 'PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'LEGAL_ENTITY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('MOBILE', 'PHONE', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('ACTIVE', 'DECEASED', 'TRANSFERRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('CANINE', 'FELINE', 'BIRD', 'RODENT', 'REPTILE', 'OTHER');

-- CreateEnum
CREATE TYPE "SterilizationStatus" AS ENUM ('NOT_STERILIZED', 'STERILIZED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "CoatType" AS ENUM ('SHORT', 'LONG', 'SMOOTH', 'WAVY', 'CURLY', 'GOLDEN', 'BLACK', 'WHITE', 'BROWN', 'MIXED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LandingPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClinicalDocumentType" AS ENUM ('ANAMNESIS', 'PRESCRIPTION', 'DIAGNOSIS', 'TUTOR_REPORT', 'MEDICAL_CERTIFICATE', 'EXAM_REQUEST', 'SURGICAL_REPORT', 'DISCHARGE_SUMMARY', 'VACCINATION_CARD', 'GENERAL');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('RECORDING', 'PROCESSING', 'TRANSCRIBED', 'ANALYZED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TutorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "TutorClassificacao" AS ENUM ('Cliente', 'Fornecedor', 'Parceiro', 'Candidato_a_vaga', 'Engano', 'Indicacao_nao_cliente', 'Ex_cliente');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'GEMINI', 'DEEPSEEK');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('CHATBOT', 'AUTOMATION', 'ASSISTANT', 'SCHEDULER');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT', 'ERROR');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('ATENDIMENTO', 'VENDAS', 'MARKETING', 'SUPORTE', 'AGENDAMENTO', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('PUBLISHED', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationCategory" AS ENUM ('ATENDIMENTO', 'MARKETING', 'NOTIFICACAO', 'INTEGRACAO', 'AGENDAMENTO');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('SCHEDULE', 'WEBHOOK', 'EVENT', 'MANUAL', 'LEAD_CREATED', 'LEAD_SCORE_CHANGED', 'LEAD_STATUS_CHANGED', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'CLIENT_CREATED', 'CLIENT_STATUS_CHANGED', 'WHATSAPP_MESSAGE_RECEIVED', 'WHATSAPP_CONVERSATION_STARTED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'RUNNING');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'LOCATION', 'TEMPLATE', 'INTERACTIVE', 'BUTTON', 'STICKER', 'CONTACTS');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'PENDING', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "WhatsAppCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ALERT', 'WHATSAPP_MESSAGE', 'APPOINTMENT_REMINDER', 'AUTOMATION_COMPLETE', 'CAMPAIGN_COMPLETE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'PUSH');

-- CreateEnum
CREATE TYPE "ProfissionalTipo" AS ENUM ('VETERINARIO', 'RECEPCIONISTA', 'ESTAGIARIO', 'GERENTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoEtiqueta" AS ENUM ('CLINICA', 'STATUS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ComissaoBase" AS ENUM ('VALOR_CHEIO', 'MARGEM', 'SEM_COMISSAO', 'HERDAR');

-- CreateEnum
CREATE TYPE "EspecieRaca" AS ENUM ('CAO', 'GATO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PipelineEscopo" AS ENUM ('LEAD', 'CLIENTE', 'PROJETO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CategoriaEmail" AS ENUM ('TRANSACIONAL', 'BOAS_VINDAS', 'EDUCATIVO', 'PROMOCIONAL', 'ANIVERSARIO', 'REENGAJAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CadenciaGatilho" AS ENUM ('AGENDAMENTO_CRIADO', 'AGENDAMENTO_CONFIRMADO', 'ATENDIMENTO_FINALIZADO', 'EXAME_SOLICITADO', 'EXAME_PRONTO', 'LEAD_NOVO', 'LEAD_INATIVO_7D', 'PACOTE_ATIVADO', 'PACOTE_PROXIMO_DO_FIM', 'CLIENTE_INATIVO_90D', 'POS_CIRURGICO', 'CLIENTE_NOVO', 'PET_PALIATIVO', 'PET_FALECEU', 'NIVER_PET', 'NIVER_TUTOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "TipoPasso" AS ENUM ('WHATSAPP', 'EMAIL', 'TAREFA_INTERNA', 'AGUARDAR');

-- CreateEnum
CREATE TYPE "UnidadeTempo" AS ENUM ('MINUTOS', 'HORAS', 'DIAS');

-- CreateEnum
CREATE TYPE "StatusInscricaoCadencia" AS ENUM ('ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FornecedorTipo" AS ENUM ('LABORATORIO', 'PROFISSIONAL', 'PARCEIRO', 'FORNECEDOR', 'OUTRO');

-- CreateEnum
CREATE TYPE "ModeloPagamento" AS ENUM ('LOTE_MENSAL', 'DIRETO_CLIENTE', 'REPASSE_VIA_CLINICA');

-- CreateEnum
CREATE TYPE "ComissaoTipo" AS ENUM ('PERCENTUAL', 'VALOR_FIXO', 'VARIAVEL');

-- CreateEnum
CREATE TYPE "CategoriaExame" AS ENUM ('HEMATOLOGIA', 'BIOQUIMICA', 'IMAGEM', 'CITOLOGIA', 'MICROBIOLOGIA', 'ENDOCRINOLOGIA', 'HISTOPATOLOGIA', 'OUTROS');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('WHATSAPP', 'LIGACAO', 'WALK_IN', 'EMAIL', 'OUTRO');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('AGUARDANDO_TRIAGEM', 'NEW', 'ENRICHING', 'ENRICHED', 'QUALIFIED', 'CONTACTED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('ORGANIC', 'GOOGLE_ADS', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'REFERRAL', 'LANDING_PAGE', 'WHATSAPP', 'EMAIL', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'DESKTOP', 'TABLET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('HIGH_INTENT', 'REENGAGEMENT', 'CHURN_RISK', 'COLD_LEAD', 'HOT_LEAD', 'SEND_WHATSAPP', 'SEND_EMAIL', 'OFFER_DISCOUNT', 'NURTURE_CONTENT');

-- CreateEnum
CREATE TYPE "InsightPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PlataformaCampanha" AS ENUM ('GOOGLE_ADS', 'META_ADS_FACEBOOK', 'META_ADS_INSTAGRAM', 'TIKTOK_ADS', 'OUTRAS');

-- CreateEnum
CREATE TYPE "TipoCampanha" AS ENUM ('CONVERSAO', 'TRAFEGO', 'ENGAJAMENTO', 'MENSAGEM_WHATSAPP', 'RECONHECIMENTO');

-- CreateEnum
CREATE TYPE "StatusCampanha" AS ENUM ('ATIVA', 'PAUSADA', 'ENCERRADA', 'EM_TESTE', 'PLANEJADA');

-- CreateEnum
CREATE TYPE "TipoMeta" AS ENUM ('FATURAMENTO_GERAL', 'FATURAMENTO_INDIVIDUAL', 'ATENDIMENTOS', 'SERVICO_ESPECIFICO', 'CONVERSOES', 'NPS');

-- CreateEnum
CREATE TYPE "PeriodicidadeMeta" AS ENUM ('SEMANAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusMeta" AS ENUM ('EM_ANDAMENTO', 'ATINGIDA', 'NAO_ATINGIDA');

-- CreateEnum
CREATE TYPE "CategoriaAlvoNPS" AS ENUM ('VET', 'RECEPCAO', 'CLINICA_GERAL');

-- CreateEnum
CREATE TYPE "ClassificacaoNPS" AS ENUM ('PROMOTOR', 'NEUTRO', 'DETRATOR');

-- CreateEnum
CREATE TYPE "CanalColetaNPS" AS ENUM ('PRESENCIAL', 'WHATSAPP', 'EMAIL', 'TELEFONE', 'FORMULARIO');

-- CreateEnum
CREATE TYPE "StatusAvaliacaoGoogle" AS ENUM ('PERGUNTA_ENVIADA', 'NAO_GOSTOU', 'LINK_ENVIADO', 'VOTOU', 'NAO_VOTOU', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoUnidade" AS ENUM ('PROPRIA', 'PARCERIA');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "NaturezaCategoria" AS ENUM ('OPERACIONAL', 'INVESTIMENTO', 'FINANCIAMENTO', 'NAO_OPERACIONAL');

-- CreateEnum
CREATE TYPE "ComportamentoCusto" AS ENUM ('FIXO', 'VARIAVEL', 'NAO_APLICAVEL');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('DINHEIRO', 'CONTA_CORRENTE', 'CARTAO_CREDITO', 'CONTAS_A_RECEBER', 'APLICACAO_FINANCEIRA', 'EMPRESTIMO_CONTRATADO', 'IMOBILIZADO', 'CAPITAL_SOCIAL');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CONCILIADO');

-- CreateEnum
CREATE TYPE "OrigemDado" AS ENUM ('MEU_DINHEIRO', 'SIMPLESVET', 'FINPET', 'MANUAL', 'CRM');

-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('MENSAL', 'SEMANAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EscopoRegra" AS ENUM ('RECEITA', 'DESPESA', 'AMBOS');

-- CreateEnum
CREATE TYPE "ItemTipo" AS ENUM ('PRODUTO', 'SERVICO', 'EXAME', 'VACINA', 'PACOTE', 'KIT');

-- CreateEnum
CREATE TYPE "PropositoItem" AS ENUM ('VENDA', 'CONSUMO_INTERNO', 'AMBOS');

-- CreateEnum
CREATE TYPE "ComissaoTipoItem" AS ENUM ('PERCENTUAL', 'VALOR_FIXO');

-- CreateEnum
CREATE TYPE "DescontoModo" AS ENUM ('LIMITE_GERAL', 'LIMITE_ITEM', 'SEM_DESCONTO', 'ATE_100');

-- CreateEnum
CREATE TYPE "MovEstoqueTipo" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'INVENTARIO');

-- CreateEnum
CREATE TYPE "InventarioStatus" AS ENUM ('ABERTO', 'FECHADO');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "signatureUrl" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VETERINARIAN',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "styles" JSONB,
    "settings" JSONB,
    "thumbnail" TEXT,
    "status" "LandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutors" (
    "id" TEXT NOT NULL,
    "codigo" INTEGER,
    "rankingAbc" TEXT,
    "nivelRelacionamento" TEXT,
    "nps" INTEGER,
    "ticketMedio" DOUBLE PRECISION,
    "primeiraCompraAt" TIMESTAMP(3),
    "ultimaVendaAt" TIMESTAMP(3),
    "estadoRelacionamento" TEXT,
    "proximoFollowupAt" TIMESTAMP(3),
    "resumoIa" TEXT,
    "resumoIaUpdatedAt" TIMESTAMP(3),
    "type" "PersonType" NOT NULL DEFAULT 'INDIVIDUAL',
    "name" TEXT NOT NULL,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'Brasileira',
    "gender" "Gender",
    "cpf" TEXT,
    "rg" TEXT,
    "birthDate" TIMESTAMP(3),
    "profession" TEXT,
    "howFoundUs" TEXT,
    "acceptsEmail" BOOLEAN NOT NULL DEFAULT true,
    "acceptsWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "acceptsSMS" BOOLEAN NOT NULL DEFAULT true,
    "acceptsSmsCampaign" BOOLEAN NOT NULL DEFAULT false,
    "cep" TEXT,
    "address" TEXT,
    "addressNumber" TEXT,
    "complement" TEXT,
    "referencePoint" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "observations" TEXT,
    "notaCliente" TEXT,
    "tags" TEXT[],
    "formDate" TIMESTAMP(3),
    "inclusionDate" TIMESTAMP(3),
    "status" "TutorStatus" NOT NULL DEFAULT 'ACTIVE',
    "classificacao" TEXT NOT NULL DEFAULT 'Cliente',
    "companyName" TEXT,
    "cnpj" TEXT,
    "convertedFromLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'MOBILE',
    "number" TEXT NOT NULL,
    "isWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "tutorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "codigo" INTEGER,
    "pedigree" TEXT,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL DEFAULT 'CANINE',
    "breed" TEXT,
    "status" "PetStatus" NOT NULL DEFAULT 'ACTIVE',
    "cuidadoPaliativo" BOOLEAN NOT NULL DEFAULT false,
    "gender" "Gender",
    "sterilization" "SterilizationStatus" DEFAULT 'NOT_STERILIZED',
    "birthDate" TIMESTAMP(3),
    "coat" "CoatType",
    "coatColor" TEXT,
    "weight" DOUBLE PRECISION,
    "microchip" TEXT,
    "avatar" TEXT,
    "observations" TEXT,
    "allergies" TEXT[],
    "medicalNotes" TEXT,
    "insurancePlan" TEXT,
    "temperament" TEXT,
    "secondaryTutorId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pipelineClinicoEtapa" TEXT,
    "pipelineFisioEtapa" TEXT,
    "proximoFollowupAt" TIMESTAMP(3),
    "tutorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_clinico" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "tutorCodigo" INTEGER,
    "tipo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "titulo" TEXT,
    "texto" TEXT,
    "resumo" TEXT,
    "autor" TEXT,
    "valorNum" DOUBLE PRECISION,
    "arquivoKey" TEXT,
    "arquivoNome" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'SIMPLESVET',
    "codigoExterno" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_clinico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "description" TEXT,
    "notes" TEXT,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'CONSULTA',
    "chiefComplaint" TEXT,
    "anamnesis" TEXT,
    "physicalExam" TEXT,
    "diagnosis" TEXT,
    "conduct" TEXT,
    "prescription" TEXT,
    "examsRequested" TEXT,
    "followUpNotes" TEXT,
    "nextReturnDate" TIMESTAMP(3),
    "petWeight" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "codigoExterno" TEXT,
    "numeroVenda" INTEGER,
    "origem" TEXT,
    "agendaAvulsa" TEXT,
    "confirmacaoStatus" TEXT,
    "confirmacaoEnviadaAt" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "observacaoCancelamento" TEXT,
    "boardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "codigo" INTEGER,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "custoPadrao" DOUBLE PRECISION,
    "comissaoBaseDefault" "ComissaoBase" NOT NULL DEFAULT 'VALOR_CHEIO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "codigoBarras" TEXT,
    "unidadeVenda" TEXT,
    "marca" TEXT,
    "proposito" TEXT,
    "markup" DOUBLE PRECISION,
    "exibeListaPreco" BOOLEAN NOT NULL DEFAULT true,
    "permiteAlterarPreco" BOOLEAN NOT NULL DEFAULT false,
    "controlaEstoque" BOOLEAN NOT NULL DEFAULT true,
    "estoqueMin" INTEGER,
    "estoqueMax" INTEGER,
    "controlaValidade" BOOLEAN NOT NULL DEFAULT false,
    "validadeMaisAntiga" TIMESTAMP(3),
    "comissionado" BOOLEAN NOT NULL DEFAULT false,
    "comissaoTipo" TEXT,
    "comissaoValor" DOUBLE PRECISION,
    "descontoControle" TEXT,
    "fornecedorId" TEXT,
    "ncm" TEXT,
    "exTipi" TEXT,
    "perfilTributario" TEXT,
    "origem" TEXT,
    "formaAquisicao" TEXT,
    "cest" TEXT,
    "nve" TEXT,
    "pacoteValidadeQtd" INTEGER,
    "pacoteValidadeUnidade" TEXT,
    "pacoteTermos" TEXT,
    "planoTipo" TEXT,
    "planoUnidades" INTEGER,
    "planoIntervaloDias" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto_composicao" (
    "id" TEXT NOT NULL,
    "paiId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "precoUnitario" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produto_composicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "est_movimentos" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldoAntes" INTEGER NOT NULL,
    "saldoDepois" INTEGER NOT NULL,
    "custoUnitario" DOUBLE PRECISION,
    "motivo" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "refId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "est_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "est_pedidos_compra" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "fornecedorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "observacao" TEXT,
    "previsao" TIMESTAMP(3),
    "recebidoEm" TIMESTAMP(3),
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "est_pedidos_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "est_pedidos_compra_itens" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custoUnitario" DOUBLE PRECISION,

    CONSTRAINT "est_pedidos_compra_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_recordings" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioUrl" TEXT,
    "audioFileName" TEXT,
    "audioDuration" INTEGER,
    "transcription" TEXT,
    "aiAnalysis" TEXT,
    "aiSummary" TEXT,
    "status" "RecordingStatus" NOT NULL DEFAULT 'RECORDING',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_documents" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordingId" TEXT,
    "type" "ClinicalDocumentType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "htmlContent" TEXT,
    "pdfUrl" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT,
    "aiPromptUsed" TEXT,
    "sharedVia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sharedAt" TIMESTAMP(3),
    "sharedTo" TEXT,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "signedBy" TEXT,
    "crmv" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BoardType" NOT NULL DEFAULT 'TASK',
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'bg-blue-500',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanban_cards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "columnId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "leadId" TEXT,
    "tutorId" TEXT,
    "metadata" JSONB,
    "priority" TEXT DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanban_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL DEFAULT 'INCOME',
    "status" "FinanceEntryStatus" NOT NULL DEFAULT 'PENDING',
    "method" "FinancePaymentMethod" DEFAULT 'OTHER',
    "counterpartyName" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "recipientType" "RecipientType" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Geral',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "tutorId" TEXT,
    "leadEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterLog" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappConfig" TEXT,
    "openaiConfig" TEXT,
    "geminiConfig" TEXT,
    "deepseekConfig" TEXT,
    "emailConfig" TEXT,
    "aiMonthlyBudgetUsd" DOUBLE PRECISION,
    "aiCurrentMonthCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiLastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AgentType" NOT NULL DEFAULT 'CHATBOT',
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" "AIProvider" NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "templateId" TEXT,
    "whatsappTemplateId" TEXT,
    "whatsappTemplateName" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappAutoReply" BOOLEAN NOT NULL DEFAULT true,
    "whatsappGreeting" TEXT,
    "whatsappOfflineMessage" TEXT,
    "whatsappBusinessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "crmEnabled" BOOLEAN NOT NULL DEFAULT false,
    "crmAutoCreateLead" BOOLEAN NOT NULL DEFAULT true,
    "crmAutoUpdateLead" BOOLEAN NOT NULL DEFAULT true,
    "crmLeadScoring" BOOLEAN NOT NULL DEFAULT false,
    "crmNotifyOnHighScore" BOOLEAN NOT NULL DEFAULT false,
    "crmAssignToBoard" TEXT,
    "knowledgeBaseId" TEXT,
    "knowledgeBaseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ragEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ragTopK" INTEGER NOT NULL DEFAULT 5,
    "ragThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "voiceId" TEXT NOT NULL DEFAULT 'nova',
    "voiceSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "voiceModel" TEXT NOT NULL DEFAULT 'tts-1',
    "rateLimitRequests" INTEGER NOT NULL DEFAULT 100,
    "rateLimitWindow" INTEGER NOT NULL DEFAULT 3600,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_versions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" "AIProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "voiceEnabled" BOOLEAN NOT NULL,
    "voiceId" TEXT NOT NULL,
    "voiceSpeed" DOUBLE PRECISION NOT NULL,
    "voiceModel" TEXT NOT NULL,
    "publishedBy" TEXT,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL DEFAULT 'PERSONALIZADO',
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider" "AIProvider",
    "model" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "whatsappTemplateName" TEXT,
    "whatsappTemplateLanguage" TEXT DEFAULT 'pt_BR',
    "whatsappTemplateId" TEXT,
    "isWhatsAppLinked" BOOLEAN NOT NULL DEFAULT false,
    "defaultVoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultVoiceId" TEXT NOT NULL DEFAULT 'nova',
    "defaultVoiceSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "defaultVoiceModel" TEXT NOT NULL DEFAULT 'tts-1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "input" TEXT,
    "output" TEXT,
    "usage" JSONB,
    "latencyMs" INTEGER,
    "error" TEXT,
    "metadata" JSONB,
    "costUsd" DOUBLE PRECISION,
    "costBreakdown" JSONB,
    "voiceGenerated" BOOLEAN NOT NULL DEFAULT false,
    "voiceCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AutomationCategory" NOT NULL DEFAULT 'ATENDIMENTO',
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "trigger" "AutomationTrigger" NOT NULL DEFAULT 'MANUAL',
    "triggerConfig" JSONB,
    "executions" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_steps" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "duration" INTEGER,
    "triggeredBy" TEXT,
    "stepsExecuted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "waMessageId" TEXT,
    "direction" "WhatsAppMessageDirection" NOT NULL DEFAULT 'INBOUND',
    "type" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaCaption" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "reaction" TEXT,
    "myReaction" TEXT,
    "mediaCloudUrl" TEXT,
    "mediaCloudId" TEXT,
    "mediaStorageType" TEXT,
    "mediaDownloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_stickers" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "url" TEXT NOT NULL,
    "cloudId" TEXT,
    "storageType" TEXT,
    "mime" TEXT NOT NULL DEFAULT 'image/webp',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "origem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_stickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPushName" TEXT,
    "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAgentId" TEXT,
    "tutorId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "manualUnread" BOOLEAN NOT NULL DEFAULT false,
    "isAutoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "assignedUserId" TEXT,
    "humanTakeoverAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WhatsAppCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "templateName" TEXT,
    "templateLanguage" TEXT DEFAULT 'pt_BR',
    "messageContent" TEXT NOT NULL,
    "messageType" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "audienceType" TEXT NOT NULL DEFAULT 'all',
    "audienceFilter" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "tutorId" TEXT,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
    "waMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_push" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "ultimoEnvio" TIMESTAMP(3),
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_push_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_scheduled_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_notes" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "conversationId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissionais" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "nomeExibicao" TEXT,
    "iniciais" TEXT,
    "tipo" "ProfissionalTipo" NOT NULL DEFAULT 'VETERINARIO',
    "especialidade" TEXT,
    "crmv" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "fotoUrl" TEXT,
    "corAvatar" TEXT,
    "comissaoPercentual" DOUBLE PRECISION,
    "userId" TEXT,
    "dataInicio" TIMESTAMP(3),
    "observacoes" TEXT,
    "escala" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_categories" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiqueta_templates" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "TipoEtiqueta" NOT NULL DEFAULT 'CUSTOM',
    "cor" TEXT,
    "descricao" TEXT,
    "aplicaEm" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "svc_categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "comissaoBasePadrao" "ComissaoBase" NOT NULL DEFAULT 'VALOR_CHEIO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "svc_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorPadrao" DOUBLE PRECISION,
    "custoPadrao" DOUBLE PRECISION,
    "comissaoBaseDefault" "ComissaoBase" NOT NULL DEFAULT 'HERDAR',
    "categoryId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especie" "EspecieRaca" NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "racas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_tipos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lista_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_itens" (
    "id" TEXT NOT NULL,
    "lista" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lista_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_definitions" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escopo" "PipelineEscopo" NOT NULL DEFAULT 'CUSTOM',
    "descricao" TEXT,
    "cor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "isPadrao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_estagios" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL,
    "ehInicial" BOOLEAN NOT NULL DEFAULT false,
    "ehGanho" BOOLEAN NOT NULL DEFAULT false,
    "ehPerda" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "diasMaxParar" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_estagios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpoHtml" TEXT NOT NULL,
    "corpoTexto" TEXT,
    "categoria" "CategoriaEmail" NOT NULL DEFAULT 'TRANSACIONAL',
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "vezesEnviado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_variables" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "descricao" TEXT,
    "exemplo" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'Geral',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadencia_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "gatilho" "CadenciaGatilho" NOT NULL DEFAULT 'MANUAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadencia_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadencia_passos" (
    "id" TEXT NOT NULL,
    "cadenciaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" "TipoPasso" NOT NULL DEFAULT 'WHATSAPP',
    "titulo" TEXT,
    "conteudo" TEXT NOT NULL,
    "atrasoValor" INTEGER NOT NULL DEFAULT 0,
    "atrasoUnidade" "UnidadeTempo" NOT NULL DEFAULT 'DIAS',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadencia_passos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadencia_inscricoes" (
    "id" TEXT NOT NULL,
    "cadenciaId" TEXT NOT NULL,
    "tutorId" TEXT,
    "petId" TEXT,
    "phone" TEXT NOT NULL,
    "status" "StatusInscricaoCadencia" NOT NULL DEFAULT 'ATIVA',
    "passoOrdem" INTEGER NOT NULL DEFAULT 1,
    "proximoEm" TIMESTAMP(3) NOT NULL,
    "vars" JSONB,
    "origemId" TEXT,
    "gatilho" "CadenciaGatilho",
    "iniciadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausadaEm" TIMESTAMP(3),
    "concluidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadencia_inscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_categories" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "emoji" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "descricao" TEXT,
    "variaveis" TEXT[],
    "categoryId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "vezesUsado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forn_fornecedores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "FornecedorTipo" NOT NULL DEFAULT 'LABORATORIO',
    "especialidade" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "contatoResponsavel" TEXT,
    "modeloPagamento" "ModeloPagamento" NOT NULL DEFAULT 'LOTE_MENSAL',
    "comissaoTipo" "ComissaoTipo",
    "comissaoValor" DOUBLE PRECISION,
    "diaFechamentoLote" INTEGER,
    "percExamePadrao" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forn_fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exa_catalogo" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" "CategoriaExame" NOT NULL DEFAULT 'OUTROS',
    "valorFornecedor" DOUBLE PRECISION,
    "valorClienteSugerido" DOUBLE PRECISION,
    "tempoResultadoDias" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exa_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "sourceDetail" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "metaCampaignId" TEXT,
    "metaAdsetId" TEXT,
    "metaAdId" TEXT,
    "metaPageId" TEXT,
    "ctwaClid" TEXT,
    "segmento" TEXT,
    "referrer" TEXT,
    "landingPage" TEXT,
    "device" "DeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "userAgent" TEXT,
    "ip" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "pipelineComercialEtapa" TEXT,
    "proximoFollowupAt" TIMESTAMP(3),
    "resumoIa" TEXT,
    "resumoIaUpdatedAt" TIMESTAMP(3),
    "currentScore" INTEGER NOT NULL DEFAULT 0,
    "scoreUpdatedAt" TIMESTAMP(3),
    "visitedPricing" BOOLEAN NOT NULL DEFAULT false,
    "abandonedCart" BOOLEAN NOT NULL DEFAULT false,
    "returnedWithin24h" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB,
    "notes" TEXT,
    "channel" "CommunicationChannel",
    "qualSituacaoPet" TEXT,
    "qualQueMaisIncomoda" TEXT,
    "qualTentouOutroVet" TEXT,
    "qualOQueMudaResolver" TEXT,
    "qualQuemDecide" TEXT,
    "convertedToTutorId" TEXT,
    "whatsappConversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "page" TEXT,
    "sessionId" TEXT,
    "duration" INTEGER,
    "device" "DeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_enrichments" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "emailProvider" TEXT,
    "emailValid" BOOLEAN NOT NULL DEFAULT true,
    "emailDisposable" BOOLEAN NOT NULL DEFAULT false,
    "emailRisk" TEXT,
    "totalPageViews" INTEGER NOT NULL DEFAULT 0,
    "uniquePages" INTEGER NOT NULL DEFAULT 0,
    "pricingPageViews" INTEGER NOT NULL DEFAULT 0,
    "checkoutStarts" INTEGER NOT NULL DEFAULT 0,
    "checkoutAbandons" INTEGER NOT NULL DEFAULT 0,
    "formSubmissions" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "avgSessionDuration" INTEGER NOT NULL DEFAULT 0,
    "totalTimeOnSite" INTEGER NOT NULL DEFAULT 0,
    "preferredTimeSlot" TEXT,
    "preferredDayOfWeek" TEXT,
    "mostActiveHour" INTEGER,
    "daysActive" INTEGER NOT NULL DEFAULT 0,
    "daysSinceFirstVisit" INTEGER NOT NULL DEFAULT 0,
    "daysSinceLastVisit" INTEGER NOT NULL DEFAULT 0,
    "visitFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "primaryChannel" TEXT,
    "purchaseIntent" TEXT NOT NULL DEFAULT 'unknown',
    "rawData" JSONB,
    "enrichedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lead_enrichments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_scores" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "algorithm" TEXT NOT NULL DEFAULT 'rules_v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_insights" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "InsightPriority" NOT NULL DEFAULT 'MEDIUM',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "rule" TEXT NOT NULL,
    "triggerData" JSONB,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "actedOn" BOOLEAN NOT NULL DEFAULT false,
    "actedOnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_history" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" JSONB,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "totalSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "localPath" TEXT,
    "cloudUrl" TEXT,
    "publicId" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "source" TEXT,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plataforma" "PlataformaCampanha" NOT NULL DEFAULT 'OUTRAS',
    "tipo" "TipoCampanha" NOT NULL DEFAULT 'CONVERSAO',
    "tagOrigem" TEXT,
    "inicio" DATE,
    "fim" DATE,
    "status" "StatusCampanha" NOT NULL DEFAULT 'ATIVA',
    "investimento" DOUBLE PRECISION,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMeta" NOT NULL,
    "periodicidade" "PeriodicidadeMeta" NOT NULL DEFAULT 'MENSAL',
    "profissionalId" TEXT,
    "servicoId" TEXT,
    "dataInicio" DATE NOT NULL,
    "valorMeta" DOUBLE PRECISION NOT NULL,
    "valorRealizado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusMeta" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes_nps" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT,
    "petId" TEXT,
    "atendimentoId" TEXT,
    "categoriaAlvo" "CategoriaAlvoNPS" NOT NULL,
    "profissionalId" TEXT,
    "score" INTEGER NOT NULL,
    "classificacao" "ClassificacaoNPS" NOT NULL,
    "comentario" TEXT,
    "canalColeta" "CanalColetaNPS" NOT NULL DEFAULT 'PRESENCIAL',
    "dataColeta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coletadoPor" TEXT,
    "observacoes" TEXT,
    "tutorNome" TEXT,
    "petNome" TEXT,
    "profissionalNome" TEXT,
    "categoriaLivre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avaliacoes_nps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes_google" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT,
    "petId" TEXT,
    "atendimentoId" TEXT,
    "profissionalId" TEXT,
    "coletadoPor" TEXT,
    "dataPergunta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gostou" BOOLEAN,
    "comentarioNegativo" TEXT,
    "canalEnvio" TEXT,
    "dataEnvioLink" TIMESTAMP(3),
    "linkEnviado" TEXT,
    "dataVoto" TIMESTAMP(3),
    "notaDada" INTEGER,
    "votoConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusAvaliacaoGoogle" NOT NULL DEFAULT 'PERGUNTA_ENVIADA',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avaliacoes_google_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_items" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "servicoId" TEXT,
    "productId" TEXT,
    "catalogoItemId" TEXT,
    "convenioId" TEXT,
    "descricao" TEXT,
    "executorUserId" TEXT,
    "fornecedorId" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "valorUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comissaoBase" TEXT,
    "comissaoTipo" TEXT,
    "comissaoValor" DOUBLE PRECISION,
    "comissaoCalculada" DOUBLE PRECISION,
    "comissaoExtratoId" TEXT,
    "observacoes" TEXT,
    "grupo" TEXT,
    "marca" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissao_fechamentos" (
    "id" TEXT NOT NULL,
    "baixadasAte" TIMESTAMP(3) NOT NULL,
    "referencia" TEXT,
    "base" TEXT NOT NULL DEFAULT 'MARGEM',
    "configSnapshot" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissao_fechamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissao_extratos" (
    "id" TEXT NOT NULL,
    "fechamentoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itens" INTEGER NOT NULL DEFAULT 0,
    "base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comissao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'A_PAGAR',
    "pagoAt" TIMESTAMP(3),
    "linhas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissao_extratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacoes" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "tutorId" TEXT,
    "petId" TEXT,
    "autorUserId" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'NOTA',
    "texto" TEXT NOT NULL,
    "proximaAcao" TEXT,
    "proximoFollowupAt" TIMESTAMP(3),
    "canal" TEXT,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "tutorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "validade" TIMESTAMP(3),
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "createdById" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_itens" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "servicoId" TEXT,
    "productId" TEXT,
    "descricao" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "valorUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolo_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "variante" TEXT,
    "doses" INTEGER NOT NULL DEFAULT 1,
    "intervaloDias" INTEGER,
    "reforcoMeses" INTEGER,
    "indicacaoIdade" TEXT,
    "idadeMinDias" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocolo_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolos_aplicados" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "tutorId" TEXT,
    "tipo" TEXT NOT NULL,
    "templateId" TEXT,
    "nomeProtocolo" TEXT NOT NULL,
    "marca" TEXT,
    "dataInicial" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
    "observacao" TEXT,
    "createdById" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocolos_aplicados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolo_doses" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT 1,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataAplicada" TIMESTAMP(3),
    "lote" TEXT,
    "fabricante" TEXT,
    "aplicadaPorId" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocolo_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixa_sessoes" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "abertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suprimento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechamento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorEsperado" DOUBLE PRECISION,
    "valorContado" DOUBLE PRECISION,
    "diferenca" DOUBLE PRECISION,
    "obsFechamento" TEXT,

    CONSTRAINT "caixa_sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos" (
    "id" TEXT NOT NULL,
    "caixaSessaoId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "troco" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "formas" JSONB NOT NULL,
    "observacao" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recebimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixa_movimentos" (
    "id" TEXT NOT NULL,
    "caixaSessaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forma" TEXT,
    "conta" TEXT,
    "descricao" TEXT,
    "observacao" TEXT,
    "createdById" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caixa_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credito_movimentos" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descricao" TEXT,
    "caixaSessaoId" TEXT,
    "appointmentId" TEXT,
    "recebimentoId" TEXT,
    "createdById" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credito_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boxes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'CANINO',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_ocupacoes" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "entradaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "box_ocupacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "method" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "entityId" TEXT,
    "statusCode" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_unidades" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoUnidade" NOT NULL DEFAULT 'PROPRIA',
    "cidade" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "percentualNos" DECIMAL(5,4),
    "marcaPadraoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_marcas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_linhas_servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_linhas_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_grupos_categoria" (
    "id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_grupos_categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "subgrupo" TEXT,
    "tipo" "TipoCategoria" NOT NULL,
    "natureza" "NaturezaCategoria" NOT NULL DEFAULT 'OPERACIONAL',
    "comportamento" "ComportamentoCusto" NOT NULL DEFAULT 'NAO_APLICAVEL',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "codigoContabil" TEXT,
    "grupoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_contas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoConta" NOT NULL DEFAULT 'CONTA_CORRENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "banco" TEXT,
    "agencia" TEXT,
    "numeroConta" TEXT,
    "titular" TEXT,
    "pixChave" TEXT,
    "saldoInicialCentavos" INTEGER NOT NULL DEFAULT 0,
    "saldoInicialData" TIMESTAMP(3),
    "unidadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_lancamentos" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "dataEmissao" TIMESTAMP(3),
    "vencimento" TIMESTAMP(3),
    "dataPagamento" TIMESTAMP(3),
    "tipo" "TipoLancamento" NOT NULL,
    "status" "StatusLancamento" NOT NULL DEFAULT 'CONFIRMADO',
    "descricao" TEXT,
    "numeroDocumento" TEXT,
    "valorCentavos" INTEGER NOT NULL,
    "jurosCentavos" INTEGER NOT NULL DEFAULT 0,
    "multaCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "origem" "OrigemDado" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "unidadeId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "linhaServicoId" TEXT,
    "marcaId" TEXT,
    "contaId" TEXT NOT NULL,
    "contaDestinoId" TEXT,
    "recorrenciaId" TEXT,
    "contatoId" TEXT,
    "formaPagamentoId" TEXT,
    "tutorId" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_recorrencias" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "frequencia" "FrequenciaRecorrencia" NOT NULL DEFAULT 'MENSAL',
    "dia" INTEGER NOT NULL,
    "mesReferencia" INTEGER,
    "antecedenciaDias" INTEGER NOT NULL DEFAULT 30,
    "terminaEm" TIMESTAMP(3),
    "maxOcorrencias" INTEGER,
    "geradas" INTEGER NOT NULL DEFAULT 0,
    "ultimoVencimentoGerado" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "categoriaId" TEXT,
    "contaId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "marcaId" TEXT,
    "linhaServicoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_recorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_faturamentos_bruto" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "brutoCentavos" INTEGER NOT NULL,
    "taxaCartaoCentavos" INTEGER NOT NULL DEFAULT 0,
    "parceiraCentavos" INTEGER NOT NULL DEFAULT 0,
    "nosCentavos" INTEGER NOT NULL,
    "lancamentoLiquidoId" TEXT,
    "origem" "OrigemDado" NOT NULL DEFAULT 'FINPET',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_faturamentos_bruto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_codigos" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "telefone8" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ACESSO',
    "codigo_hash" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_codigos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_sessoes" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogada_em" TIMESTAMP(3),
    "revogada_por" TEXT,
    "ultimo_acesso" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_acessos" (
    "id" TEXT NOT NULL,
    "telefone8" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "tutor_id" TEXT,
    "detalhe" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_acessos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_alteracoes" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "entidade_nome" TEXT,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_alteracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_agenda_config" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "antecedencia_min_horas" INTEGER NOT NULL DEFAULT 12,
    "janela_dias" INTEGER NOT NULL DEFAULT 30,
    "prazo_cancelar_horas" INTEGER NOT NULL DEFAULT 24,
    "max_por_dia" INTEGER NOT NULL DEFAULT 2,
    "desmarcacoes_para_taxa" INTEGER NOT NULL DEFAULT 2,
    "taxa_centavos" INTEGER NOT NULL DEFAULT 0,
    "mensagem_travado" TEXT,
    "atualizado_por" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_agenda_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_agenda_servico" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "duracao_min" INTEGER NOT NULL DEFAULT 30,
    "agendas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "restricao" TEXT NOT NULL DEFAULT 'TODOS',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "responsavel_user_id" TEXT,
    "responsavel_por_dia" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_agenda_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_agendamentos" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "agenda_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "duracao_min" INTEGER NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'MARCADO',
    "desmarcado_em" TIMESTAMP(3),
    "remarcado_para_id" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_liberacoes" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "liberado_por" TEXT,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_liberacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietas" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "tutorId" TEXT,
    "prescritorNome" TEXT,
    "prescritorUserId" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "itens" JSONB NOT NULL DEFAULT '[]',
    "variacoes" JSONB NOT NULL DEFAULT '[]',
    "evitar" JSONB NOT NULL DEFAULT '[]',
    "observacao" TEXT,
    "anexoKey" TEXT,
    "anexoNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dietas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_push" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "ultimo_envio" TIMESTAMP(3),
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_push_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_push_enviados" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "titulo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_push_enviados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_emprestimos_internos" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidadeTomadoraId" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "contaOrigemId" TEXT,
    "contaDestinoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_emprestimos_internos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_parcelas_emprestimo" (
    "id" TEXT NOT NULL,
    "emprestimoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "lancamentoId" TEXT,

    CONSTRAINT "fin_parcelas_emprestimo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_contatos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "tipo" TEXT,
    "crmv" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "pixChave" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_formas_pagamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_taxas_contratadas" (
    "id" TEXT NOT NULL,
    "adquirente" TEXT NOT NULL DEFAULT 'InfinityPay',
    "bandeira" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "parcelas" INTEGER NOT NULL,
    "aliquotaBps" INTEGER NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_taxas_contratadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_vendas_cartao" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "brutoCentavos" INTEGER NOT NULL,
    "liquidoCentavos" INTEGER NOT NULL,
    "taxaCentavos" INTEGER NOT NULL,
    "taxaBps" INTEGER NOT NULL,
    "planoExtrato" TEXT,
    "adquirente" TEXT,
    "bandeira" TEXT,
    "forma" TEXT,
    "parcelas" INTEGER,
    "plano" TEXT,
    "unidadeId" TEXT,
    "origem" "OrigemDado" NOT NULL DEFAULT 'FINPET',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_vendas_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_regras" (
    "id" TEXT NOT NULL,
    "termo" TEXT NOT NULL,
    "escopo" "EscopoRegra" NOT NULL DEFAULT 'AMBOS',
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "categoriaId" TEXT,
    "unidadeId" TEXT,
    "marcaId" TEXT,
    "linhaServicoId" TEXT,
    "contaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_regras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_faturas_fornecedor" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "fornecedorNome" TEXT NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "diaFechamento" INTEGER,
    "vencimento" TIMESTAMP(3),
    "totalCentavos" INTEGER NOT NULL DEFAULT 0,
    "qtdItens" INTEGER NOT NULL DEFAULT 0,
    "unidadeId" TEXT,
    "lancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_faturas_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_fatura_itens" (
    "id" TEXT NOT NULL,
    "faturaId" TEXT,
    "appointmentItemId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "tipoFornecedor" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataServico" TIMESTAMP(3) NOT NULL,
    "custoCentavos" INTEGER NOT NULL,
    "lancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_fatura_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_grupos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "paiId" TEXT,
    "agrupador" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cat_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_marcas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cat_marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_itens" (
    "id" TEXT NOT NULL,
    "codigo" INTEGER,
    "tipo" "ItemTipo" NOT NULL,
    "nome" TEXT NOT NULL,
    "grupoId" TEXT,
    "custo" DOUBLE PRECISION,
    "fornecedorId" TEXT,
    "markup" DOUBLE PRECISION,
    "preco" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precosPorte" TEXT,
    "ehCaucao" BOOLEAN NOT NULL DEFAULT false,
    "exibeListaPreco" BOOLEAN NOT NULL DEFAULT true,
    "permiteAlterarPreco" BOOLEAN NOT NULL DEFAULT true,
    "codigoBarras" TEXT,
    "unidadeVenda" TEXT,
    "marcaId" TEXT,
    "proposito" "PropositoItem" NOT NULL DEFAULT 'VENDA',
    "duracaoMin" INTEGER,
    "controlaEstoque" BOOLEAN NOT NULL DEFAULT false,
    "estoqueAtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estoqueMin" DOUBLE PRECISION,
    "estoqueMax" DOUBLE PRECISION,
    "controlaValidade" BOOLEAN NOT NULL DEFAULT false,
    "validadeMaisAntiga" TIMESTAMP(3),
    "comissionado" BOOLEAN NOT NULL DEFAULT false,
    "comissaoTipo" "ComissaoTipoItem",
    "comissaoValor" DOUBLE PRECISION,
    "descontoModo" "DescontoModo" NOT NULL DEFAULT 'LIMITE_GERAL',
    "descontoLimite" DOUBLE PRECISION,
    "protocoloTemplateId" TEXT,
    "controlePlano" TEXT,
    "planoUnidades" INTEGER,
    "planoIntervaloDias" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "arquivado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cat_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_item_exame" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fornecedorId" TEXT,
    "custoLab" DOUBLE PRECISION,
    "prazoResultadoDias" INTEGER,
    "categoria" TEXT,
    "externo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cat_item_exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_composicao" (
    "id" TEXT NOT NULL,
    "paiId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "cat_composicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_comissao_override" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comissaoTipo" "ComissaoTipoItem" NOT NULL,
    "comissaoValor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cat_comissao_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_historico" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "detalhe" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_motivos_saida" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cat_motivos_saida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_estoque_movimentos" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tipo" "MovEstoqueTipo" NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "saldoAntes" DOUBLE PRECISION NOT NULL,
    "saldoDepois" DOUBLE PRECISION NOT NULL,
    "custoUnitario" DOUBLE PRECISION,
    "motivoId" TEXT,
    "motivoNome" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "refId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_estoque_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_inventarios" (
    "id" TEXT NOT NULL,
    "responsavelId" TEXT,
    "responsavelNome" TEXT,
    "status" "InventarioStatus" NOT NULL DEFAULT 'ABERTO',
    "totalItens" INTEGER NOT NULL DEFAULT 0,
    "totalCorretos" INTEGER NOT NULL DEFAULT 0,
    "totalCorrigidos" INTEGER NOT NULL DEFAULT 0,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadoAt" TIMESTAMP(3),

    CONSTRAINT "cat_inventarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_inventario_itens" (
    "id" TEXT NOT NULL,
    "inventarioId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemNome" TEXT NOT NULL,
    "quantidadeSistema" DOUBLE PRECISION NOT NULL,
    "quantidadeContada" DOUBLE PRECISION NOT NULL,
    "aplicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_inventario_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_convenios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "diaFechamento" INTEGER,
    "contato" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cat_convenios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_convenio_precos" (
    "id" TEXT NOT NULL,
    "convenioId" TEXT NOT NULL,
    "itemNome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "precosPorte" TEXT,
    "codigoConvenio" TEXT,

    CONSTRAINT "cat_convenio_precos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_faturas_convenio" (
    "id" TEXT NOT NULL,
    "convenioId" TEXT NOT NULL,
    "convenioNome" TEXT NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "diaFechamento" INTEGER,
    "vencimento" TIMESTAMP(3),
    "totalCentavos" INTEGER NOT NULL DEFAULT 0,
    "qtdItens" INTEGER NOT NULL DEFAULT 0,
    "lancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_faturas_convenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_fatura_convenio_itens" (
    "id" TEXT NOT NULL,
    "faturaId" TEXT,
    "appointmentItemId" TEXT NOT NULL,
    "convenioId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataServico" TIMESTAMP(3) NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_fatura_convenio_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_slug_key" ON "landing_pages"("slug");

-- CreateIndex
CREATE INDEX "landing_pages_userId_idx" ON "landing_pages"("userId");

-- CreateIndex
CREATE INDEX "landing_pages_status_idx" ON "landing_pages"("status");

-- CreateIndex
CREATE INDEX "landing_pages_slug_idx" ON "landing_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_codigo_key" ON "tutors"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_email_key" ON "tutors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_cpf_key" ON "tutors"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_cnpj_key" ON "tutors"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "pets_codigo_key" ON "pets"("codigo");

-- CreateIndex
CREATE INDEX "historico_clinico_petId_data_idx" ON "historico_clinico"("petId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "historico_clinico_tipo_codigoExterno_key" ON "historico_clinico"("tipo", "codigoExterno");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_numeroVenda_key" ON "Appointment"("numeroVenda");

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "Appointment"("date");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");

-- CreateIndex
CREATE INDEX "Appointment_codigoExterno_idx" ON "Appointment"("codigoExterno");

-- CreateIndex
CREATE UNIQUE INDEX "Product_codigo_key" ON "Product"("codigo");

-- CreateIndex
CREATE INDEX "Product_ativo_idx" ON "Product"("ativo");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_fornecedorId_idx" ON "Product"("fornecedorId");

-- CreateIndex
CREATE INDEX "Product_type_idx" ON "Product"("type");

-- CreateIndex
CREATE INDEX "produto_composicao_paiId_idx" ON "produto_composicao"("paiId");

-- CreateIndex
CREATE INDEX "est_movimentos_productId_idx" ON "est_movimentos"("productId");

-- CreateIndex
CREATE INDEX "est_movimentos_createdAt_idx" ON "est_movimentos"("createdAt");

-- CreateIndex
CREATE INDEX "est_pedidos_compra_status_idx" ON "est_pedidos_compra"("status");

-- CreateIndex
CREATE INDEX "est_pedidos_compra_fornecedorId_idx" ON "est_pedidos_compra"("fornecedorId");

-- CreateIndex
CREATE INDEX "est_pedidos_compra_itens_pedidoId_idx" ON "est_pedidos_compra_itens"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_recordings_appointmentId_key" ON "consultation_recordings"("appointmentId");

-- CreateIndex
CREATE INDEX "consultation_recordings_userId_idx" ON "consultation_recordings"("userId");

-- CreateIndex
CREATE INDEX "consultation_recordings_status_idx" ON "consultation_recordings"("status");

-- CreateIndex
CREATE INDEX "clinical_documents_appointmentId_idx" ON "clinical_documents"("appointmentId");

-- CreateIndex
CREATE INDEX "clinical_documents_petId_idx" ON "clinical_documents"("petId");

-- CreateIndex
CREATE INDEX "clinical_documents_tutorId_idx" ON "clinical_documents"("tutorId");

-- CreateIndex
CREATE INDEX "clinical_documents_userId_idx" ON "clinical_documents"("userId");

-- CreateIndex
CREATE INDEX "clinical_documents_type_idx" ON "clinical_documents"("type");

-- CreateIndex
CREATE INDEX "clinical_documents_status_idx" ON "clinical_documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Board_userId_name_key" ON "Board"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumn_boardId_name_key" ON "KanbanColumn"("boardId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumn_boardId_position_key" ON "KanbanColumn"("boardId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "kanban_cards_appointmentId_key" ON "kanban_cards"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "kanban_cards_leadId_key" ON "kanban_cards"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "kanban_cards_tutorId_key" ON "kanban_cards"("tutorId");

-- CreateIndex
CREATE INDEX "kanban_cards_leadId_idx" ON "kanban_cards"("leadId");

-- CreateIndex
CREATE INDEX "kanban_cards_tutorId_idx" ON "kanban_cards"("tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "kanban_cards_columnId_position_key" ON "kanban_cards"("columnId", "position");

-- CreateIndex
CREATE INDEX "FinanceEntry_userId_date_idx" ON "FinanceEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "FinanceEntry_userId_status_idx" ON "FinanceEntry"("userId", "status");

-- CreateIndex
CREATE INDEX "FinanceEntry_userId_type_idx" ON "FinanceEntry"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_templates_name_key" ON "newsletter_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_newsletterId_leadEmail_key" ON "Recipient"("newsletterId", "leadEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_newsletterId_tutorId_key" ON "Recipient"("newsletterId", "tutorId");

-- CreateIndex
CREATE INDEX "NewsletterLog_newsletterId_idx" ON "NewsletterLog"("newsletterId");

-- CreateIndex
CREATE INDEX "NewsletterLog_sentAt_idx" ON "NewsletterLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "integration_settings_userId_key" ON "integration_settings"("userId");

-- CreateIndex
CREATE INDEX "ai_agents_userId_status_idx" ON "ai_agents"("userId", "status");

-- CreateIndex
CREATE INDEX "ai_agents_type_idx" ON "ai_agents"("type");

-- CreateIndex
CREATE INDEX "agent_versions_agentId_createdAt_idx" ON "agent_versions"("agentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_versions_agentId_version_key" ON "agent_versions"("agentId", "version");

-- CreateIndex
CREATE INDEX "agent_templates_userId_category_idx" ON "agent_templates"("userId", "category");

-- CreateIndex
CREATE INDEX "agent_templates_status_idx" ON "agent_templates"("status");

-- CreateIndex
CREATE INDEX "agent_templates_whatsappTemplateName_idx" ON "agent_templates"("whatsappTemplateName");

-- CreateIndex
CREATE UNIQUE INDEX "agent_templates_userId_name_key" ON "agent_templates"("userId", "name");

-- CreateIndex
CREATE INDEX "agent_executions_agentId_createdAt_idx" ON "agent_executions"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_executions_status_idx" ON "agent_executions"("status");

-- CreateIndex
CREATE INDEX "automations_userId_status_idx" ON "automations"("userId", "status");

-- CreateIndex
CREATE INDEX "automations_category_idx" ON "automations"("category");

-- CreateIndex
CREATE UNIQUE INDEX "automation_steps_automationId_position_key" ON "automation_steps"("automationId", "position");

-- CreateIndex
CREATE INDEX "automation_logs_automationId_createdAt_idx" ON "automation_logs"("automationId", "createdAt");

-- CreateIndex
CREATE INDEX "automation_logs_status_idx" ON "automation_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_waMessageId_key" ON "whatsapp_messages"("waMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversationId_createdAt_idx" ON "whatsapp_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_waMessageId_idx" ON "whatsapp_messages"("waMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_direction_idx" ON "whatsapp_messages"("direction");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_userId_status_idx" ON "whatsapp_conversations"("userId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_userId_lastMessageAt_idx" ON "whatsapp_conversations"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_contactPhone_idx" ON "whatsapp_conversations"("contactPhone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_userId_contactPhone_key" ON "whatsapp_conversations"("userId", "contactPhone");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_userId_status_idx" ON "whatsapp_campaigns"("userId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_scheduledFor_idx" ON "whatsapp_campaigns"("scheduledFor");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_status_idx" ON "whatsapp_campaigns"("status");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_campaignId_status_idx" ON "whatsapp_campaign_recipients"("campaignId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_phone_idx" ON "whatsapp_campaign_recipients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_recipients_campaignId_phone_key" ON "whatsapp_campaign_recipients"("campaignId", "phone");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE UNIQUE INDEX "staff_push_endpoint_key" ON "staff_push"("endpoint");

-- CreateIndex
CREATE INDEX "staff_push_userId_idx" ON "staff_push"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_scheduled_messages_status_scheduledFor_idx" ON "whatsapp_scheduled_messages"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "whatsapp_scheduled_messages_userId_idx" ON "whatsapp_scheduled_messages"("userId");

-- CreateIndex
CREATE INDEX "internal_notes_toUserId_readAt_idx" ON "internal_notes"("toUserId", "readAt");

-- CreateIndex
CREATE INDEX "internal_notes_conversationId_idx" ON "internal_notes"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "profissionais_email_key" ON "profissionais"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profissionais_userId_key" ON "profissionais"("userId");

-- CreateIndex
CREATE INDEX "profissionais_tipo_idx" ON "profissionais"("tipo");

-- CreateIndex
CREATE INDEX "profissionais_ativo_idx" ON "profissionais"("ativo");

-- CreateIndex
CREATE INDEX "tag_categories_ativo_ordem_idx" ON "tag_categories"("ativo", "ordem");

-- CreateIndex
CREATE INDEX "etiqueta_templates_ativo_tipo_idx" ON "etiqueta_templates"("ativo", "tipo");

-- CreateIndex
CREATE INDEX "etiqueta_templates_categoryId_idx" ON "etiqueta_templates"("categoryId");

-- CreateIndex
CREATE INDEX "svc_categorias_ativo_idx" ON "svc_categorias"("ativo");

-- CreateIndex
CREATE INDEX "servicos_ativo_idx" ON "servicos"("ativo");

-- CreateIndex
CREATE INDEX "servicos_categoryId_idx" ON "servicos"("categoryId");

-- CreateIndex
CREATE INDEX "racas_especie_ativo_ordem_idx" ON "racas"("especie", "ativo", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "racas_nome_especie_key" ON "racas"("nome", "especie");

-- CreateIndex
CREATE UNIQUE INDEX "lista_tipos_nome_key" ON "lista_tipos"("nome");

-- CreateIndex
CREATE INDEX "lista_tipos_ativo_ordem_idx" ON "lista_tipos"("ativo", "ordem");

-- CreateIndex
CREATE INDEX "lista_itens_lista_ativo_ordem_idx" ON "lista_itens"("lista", "ativo", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "lista_itens_lista_valor_key" ON "lista_itens"("lista", "valor");

-- CreateIndex
CREATE INDEX "pipeline_definitions_escopo_ativo_idx" ON "pipeline_definitions"("escopo", "ativo");

-- CreateIndex
CREATE INDEX "pipeline_estagios_pipelineId_ordem_idx" ON "pipeline_estagios"("pipelineId", "ordem");

-- CreateIndex
CREATE INDEX "email_templates_categoria_ativo_idx" ON "email_templates"("categoria", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "email_variables_chave_key" ON "email_variables"("chave");

-- CreateIndex
CREATE INDEX "email_variables_categoria_ativo_idx" ON "email_variables"("categoria", "ativo");

-- CreateIndex
CREATE INDEX "cadencia_templates_gatilho_ativo_idx" ON "cadencia_templates"("gatilho", "ativo");

-- CreateIndex
CREATE INDEX "cadencia_passos_cadenciaId_ordem_idx" ON "cadencia_passos"("cadenciaId", "ordem");

-- CreateIndex
CREATE INDEX "cadencia_inscricoes_status_proximoEm_idx" ON "cadencia_inscricoes"("status", "proximoEm");

-- CreateIndex
CREATE INDEX "cadencia_inscricoes_tutorId_idx" ON "cadencia_inscricoes"("tutorId");

-- CreateIndex
CREATE INDEX "cadencia_inscricoes_origemId_idx" ON "cadencia_inscricoes"("origemId");

-- CreateIndex
CREATE UNIQUE INDEX "script_categories_nome_key" ON "script_categories"("nome");

-- CreateIndex
CREATE INDEX "script_templates_categoryId_ativo_idx" ON "script_templates"("categoryId", "ativo");

-- CreateIndex
CREATE INDEX "script_templates_ativo_ordem_idx" ON "script_templates"("ativo", "ordem");

-- CreateIndex
CREATE INDEX "forn_fornecedores_tipo_ativo_idx" ON "forn_fornecedores"("tipo", "ativo");

-- CreateIndex
CREATE INDEX "exa_catalogo_fornecedorId_ativo_idx" ON "exa_catalogo"("fornecedorId", "ativo");

-- CreateIndex
CREATE INDEX "exa_catalogo_categoria_ativo_idx" ON "exa_catalogo"("categoria", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_currentScore_idx" ON "leads"("currentScore");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "leads"("source");

-- CreateIndex
CREATE INDEX "leads_lastSeenAt_idx" ON "leads"("lastSeenAt");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_convertedToTutorId_idx" ON "leads"("convertedToTutorId");

-- CreateIndex
CREATE INDEX "lead_events_leadId_eventType_idx" ON "lead_events"("leadId", "eventType");

-- CreateIndex
CREATE INDEX "lead_events_leadId_createdAt_idx" ON "lead_events"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_events_sessionId_idx" ON "lead_events"("sessionId");

-- CreateIndex
CREATE INDEX "lead_events_eventType_idx" ON "lead_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "lead_enrichments_leadId_key" ON "lead_enrichments"("leadId");

-- CreateIndex
CREATE INDEX "lead_enrichments_emailDisposable_idx" ON "lead_enrichments"("emailDisposable");

-- CreateIndex
CREATE INDEX "lead_enrichments_purchaseIntent_idx" ON "lead_enrichments"("purchaseIntent");

-- CreateIndex
CREATE INDEX "lead_scores_leadId_createdAt_idx" ON "lead_scores"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_scores_score_idx" ON "lead_scores"("score");

-- CreateIndex
CREATE INDEX "lead_insights_leadId_dismissed_idx" ON "lead_insights"("leadId", "dismissed");

-- CreateIndex
CREATE INDEX "lead_insights_type_idx" ON "lead_insights"("type");

-- CreateIndex
CREATE INDEX "lead_insights_priority_idx" ON "lead_insights"("priority");

-- CreateIndex
CREATE INDEX "lead_insights_expiresAt_idx" ON "lead_insights"("expiresAt");

-- CreateIndex
CREATE INDEX "lead_history_leadId_createdAt_idx" ON "lead_history"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_history_action_idx" ON "lead_history"("action");

-- CreateIndex
CREATE INDEX "webhook_events_userId_status_idx" ON "webhook_events"("userId", "status");

-- CreateIndex
CREATE INDEX "webhook_events_status_nextRetryAt_idx" ON "webhook_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "webhook_events_eventType_idx" ON "webhook_events"("eventType");

-- CreateIndex
CREATE INDEX "knowledge_bases_userId_idx" ON "knowledge_bases"("userId");

-- CreateIndex
CREATE INDEX "knowledge_documents_knowledgeBaseId_idx" ON "knowledge_documents"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- CreateIndex
CREATE INDEX "media_files_userId_idx" ON "media_files"("userId");

-- CreateIndex
CREATE INDEX "media_files_source_sourceId_idx" ON "media_files"("source", "sourceId");

-- CreateIndex
CREATE INDEX "media_files_storageProvider_idx" ON "media_files"("storageProvider");

-- CreateIndex
CREATE INDEX "campanhas_status_plataforma_idx" ON "campanhas"("status", "plataforma");

-- CreateIndex
CREATE INDEX "metas_tipo_status_idx" ON "metas"("tipo", "status");

-- CreateIndex
CREATE INDEX "metas_dataInicio_idx" ON "metas"("dataInicio");

-- CreateIndex
CREATE INDEX "avaliacoes_nps_dataColeta_idx" ON "avaliacoes_nps"("dataColeta");

-- CreateIndex
CREATE INDEX "avaliacoes_nps_classificacao_idx" ON "avaliacoes_nps"("classificacao");

-- CreateIndex
CREATE INDEX "avaliacoes_google_status_idx" ON "avaliacoes_google"("status");

-- CreateIndex
CREATE INDEX "avaliacoes_google_dataPergunta_idx" ON "avaliacoes_google"("dataPergunta");

-- CreateIndex
CREATE INDEX "appointment_items_appointmentId_idx" ON "appointment_items"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_items_servicoId_idx" ON "appointment_items"("servicoId");

-- CreateIndex
CREATE INDEX "appointment_items_productId_idx" ON "appointment_items"("productId");

-- CreateIndex
CREATE INDEX "appointment_items_fornecedorId_idx" ON "appointment_items"("fornecedorId");

-- CreateIndex
CREATE INDEX "appointment_items_comissaoExtratoId_idx" ON "appointment_items"("comissaoExtratoId");

-- CreateIndex
CREATE INDEX "comissao_extratos_userId_idx" ON "comissao_extratos"("userId");

-- CreateIndex
CREATE INDEX "comissao_extratos_fechamentoId_idx" ON "comissao_extratos"("fechamentoId");

-- CreateIndex
CREATE INDEX "interacoes_leadId_idx" ON "interacoes"("leadId");

-- CreateIndex
CREATE INDEX "interacoes_tutorId_idx" ON "interacoes"("tutorId");

-- CreateIndex
CREATE INDEX "interacoes_petId_idx" ON "interacoes"("petId");

-- CreateIndex
CREATE INDEX "interacoes_createdAt_idx" ON "interacoes"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_appointmentId_key" ON "orcamentos"("appointmentId");

-- CreateIndex
CREATE INDEX "orcamentos_petId_idx" ON "orcamentos"("petId");

-- CreateIndex
CREATE INDEX "orcamentos_status_idx" ON "orcamentos"("status");

-- CreateIndex
CREATE INDEX "orcamento_itens_orcamentoId_idx" ON "orcamento_itens"("orcamentoId");

-- CreateIndex
CREATE INDEX "orcamento_itens_servicoId_idx" ON "orcamento_itens"("servicoId");

-- CreateIndex
CREATE INDEX "orcamento_itens_productId_idx" ON "orcamento_itens"("productId");

-- CreateIndex
CREATE INDEX "protocolo_templates_tipo_idx" ON "protocolo_templates"("tipo");

-- CreateIndex
CREATE INDEX "protocolos_aplicados_petId_idx" ON "protocolos_aplicados"("petId");

-- CreateIndex
CREATE INDEX "protocolos_aplicados_status_idx" ON "protocolos_aplicados"("status");

-- CreateIndex
CREATE INDEX "protocolo_doses_protocoloId_idx" ON "protocolo_doses"("protocoloId");

-- CreateIndex
CREATE INDEX "protocolo_doses_dataPrevista_idx" ON "protocolo_doses"("dataPrevista");

-- CreateIndex
CREATE INDEX "protocolo_doses_status_idx" ON "protocolo_doses"("status");

-- CreateIndex
CREATE INDEX "caixa_sessoes_status_idx" ON "caixa_sessoes"("status");

-- CreateIndex
CREATE INDEX "recebimentos_caixaSessaoId_idx" ON "recebimentos"("caixaSessaoId");

-- CreateIndex
CREATE INDEX "caixa_movimentos_caixaSessaoId_idx" ON "caixa_movimentos"("caixaSessaoId");

-- CreateIndex
CREATE INDEX "credito_movimentos_tutorId_idx" ON "credito_movimentos"("tutorId");

-- CreateIndex
CREATE INDEX "credito_movimentos_caixaSessaoId_idx" ON "credito_movimentos"("caixaSessaoId");

-- CreateIndex
CREATE UNIQUE INDEX "boxes_codigo_key" ON "boxes"("codigo");

-- CreateIndex
CREATE INDEX "box_ocupacoes_boxId_idx" ON "box_ocupacoes"("boxId");

-- CreateIndex
CREATE INDEX "box_ocupacoes_appointmentId_idx" ON "box_ocupacoes"("appointmentId");

-- CreateIndex
CREATE INDEX "box_ocupacoes_ativa_idx" ON "box_ocupacoes"("ativa");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "fin_unidades_tipo_idx" ON "fin_unidades"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "fin_marcas_nome_key" ON "fin_marcas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "fin_linhas_servico_nome_key" ON "fin_linhas_servico"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "fin_grupos_categoria_nome_key" ON "fin_grupos_categoria"("nome");

-- CreateIndex
CREATE INDEX "fin_categorias_tipo_natureza_idx" ON "fin_categorias"("tipo", "natureza");

-- CreateIndex
CREATE UNIQUE INDEX "fin_categorias_grupoId_nome_key" ON "fin_categorias"("grupoId", "nome");

-- CreateIndex
CREATE INDEX "fin_lancamentos_competencia_idx" ON "fin_lancamentos"("competencia");

-- CreateIndex
CREATE INDEX "fin_lancamentos_unidadeId_competencia_idx" ON "fin_lancamentos"("unidadeId", "competencia");

-- CreateIndex
CREATE INDEX "fin_lancamentos_categoriaId_idx" ON "fin_lancamentos"("categoriaId");

-- CreateIndex
CREATE INDEX "fin_lancamentos_status_vencimento_idx" ON "fin_lancamentos"("status", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "fin_lancamentos_origem_externalId_key" ON "fin_lancamentos"("origem", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_lancamentos_recorrenciaId_vencimento_key" ON "fin_lancamentos"("recorrenciaId", "vencimento");

-- CreateIndex
CREATE INDEX "fin_recorrencias_ativo_idx" ON "fin_recorrencias"("ativo");

-- CreateIndex
CREATE INDEX "fin_faturamentos_bruto_unidadeId_competencia_idx" ON "fin_faturamentos_bruto"("unidadeId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "fin_faturamentos_bruto_origem_externalId_key" ON "fin_faturamentos_bruto"("origem", "externalId");

-- CreateIndex
CREATE INDEX "ptl_codigos_telefone8_idx" ON "ptl_codigos"("telefone8");

-- CreateIndex
CREATE INDEX "ptl_codigos_expira_em_idx" ON "ptl_codigos"("expira_em");

-- CreateIndex
CREATE INDEX "ptl_codigos_created_at_idx" ON "ptl_codigos"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_sessoes_token_hash_key" ON "ptl_sessoes"("token_hash");

-- CreateIndex
CREATE INDEX "ptl_sessoes_tutor_id_idx" ON "ptl_sessoes"("tutor_id");

-- CreateIndex
CREATE INDEX "ptl_sessoes_expira_em_idx" ON "ptl_sessoes"("expira_em");

-- CreateIndex
CREATE INDEX "ptl_acessos_telefone8_idx" ON "ptl_acessos"("telefone8");

-- CreateIndex
CREATE INDEX "ptl_acessos_created_at_idx" ON "ptl_acessos"("created_at");

-- CreateIndex
CREATE INDEX "ptl_acessos_tutor_id_idx" ON "ptl_acessos"("tutor_id");

-- CreateIndex
CREATE INDEX "ptl_alteracoes_tutor_id_idx" ON "ptl_alteracoes"("tutor_id");

-- CreateIndex
CREATE INDEX "ptl_alteracoes_entidade_entidade_id_idx" ON "ptl_alteracoes"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "ptl_alteracoes_created_at_idx" ON "ptl_alteracoes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_agenda_servico_tipo_key" ON "ptl_agenda_servico"("tipo");

-- CreateIndex
CREATE INDEX "ptl_agenda_servico_ativo_idx" ON "ptl_agenda_servico"("ativo");

-- CreateIndex
CREATE INDEX "ptl_agendamentos_tutor_id_created_at_idx" ON "ptl_agendamentos"("tutor_id", "created_at");

-- CreateIndex
CREATE INDEX "ptl_agendamentos_appointment_id_idx" ON "ptl_agendamentos"("appointment_id");

-- CreateIndex
CREATE INDEX "ptl_agendamentos_situacao_inicio_idx" ON "ptl_agendamentos"("situacao", "inicio");

-- CreateIndex
CREATE INDEX "ptl_liberacoes_tutor_id_created_at_idx" ON "ptl_liberacoes"("tutor_id", "created_at");

-- CreateIndex
CREATE INDEX "dietas_petId_data_idx" ON "dietas"("petId", "data");

-- CreateIndex
CREATE INDEX "dietas_petId_ativa_idx" ON "dietas"("petId", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_push_endpoint_key" ON "ptl_push"("endpoint");

-- CreateIndex
CREATE INDEX "ptl_push_tutor_id_idx" ON "ptl_push"("tutor_id");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_push_enviados_tutor_id_assunto_key" ON "ptl_push_enviados"("tutor_id", "assunto");

-- CreateIndex
CREATE INDEX "fin_emprestimos_internos_unidadeTomadoraId_idx" ON "fin_emprestimos_internos"("unidadeTomadoraId");

-- CreateIndex
CREATE INDEX "fin_parcelas_emprestimo_pago_vencimento_idx" ON "fin_parcelas_emprestimo"("pago", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "fin_parcelas_emprestimo_emprestimoId_numero_key" ON "fin_parcelas_emprestimo"("emprestimoId", "numero");

-- CreateIndex
CREATE INDEX "fin_taxas_contratadas_vigenciaInicio_idx" ON "fin_taxas_contratadas"("vigenciaInicio");

-- CreateIndex
CREATE INDEX "fin_taxas_contratadas_adquirente_vigenciaInicio_idx" ON "fin_taxas_contratadas"("adquirente", "vigenciaInicio");

-- CreateIndex
CREATE INDEX "fin_taxas_contratadas_bandeira_forma_parcelas_idx" ON "fin_taxas_contratadas"("bandeira", "forma", "parcelas");

-- CreateIndex
CREATE INDEX "fin_vendas_cartao_data_idx" ON "fin_vendas_cartao"("data");

-- CreateIndex
CREATE UNIQUE INDEX "fin_vendas_cartao_origem_externalId_key" ON "fin_vendas_cartao"("origem", "externalId");

-- CreateIndex
CREATE INDEX "fin_regras_ativo_prioridade_idx" ON "fin_regras"("ativo", "prioridade");

-- CreateIndex
CREATE INDEX "fin_faturas_fornecedor_status_idx" ON "fin_faturas_fornecedor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fin_faturas_fornecedor_fornecedorId_competencia_key" ON "fin_faturas_fornecedor"("fornecedorId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fatura_itens_appointmentItemId_key" ON "fin_fatura_itens"("appointmentItemId");

-- CreateIndex
CREATE INDEX "fin_fatura_itens_fornecedorId_idx" ON "fin_fatura_itens"("fornecedorId");

-- CreateIndex
CREATE INDEX "fin_fatura_itens_faturaId_idx" ON "fin_fatura_itens"("faturaId");

-- CreateIndex
CREATE UNIQUE INDEX "cat_marcas_nome_key" ON "cat_marcas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "cat_itens_codigo_key" ON "cat_itens"("codigo");

-- CreateIndex
CREATE INDEX "cat_itens_tipo_ativo_arquivado_idx" ON "cat_itens"("tipo", "ativo", "arquivado");

-- CreateIndex
CREATE INDEX "cat_itens_grupoId_idx" ON "cat_itens"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "cat_item_exame_itemId_key" ON "cat_item_exame"("itemId");

-- CreateIndex
CREATE INDEX "cat_composicao_paiId_idx" ON "cat_composicao"("paiId");

-- CreateIndex
CREATE UNIQUE INDEX "cat_comissao_override_itemId_userId_key" ON "cat_comissao_override"("itemId", "userId");

-- CreateIndex
CREATE INDEX "cat_historico_itemId_idx" ON "cat_historico"("itemId");

-- CreateIndex
CREATE INDEX "cat_estoque_movimentos_itemId_createdAt_idx" ON "cat_estoque_movimentos"("itemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cat_inventario_itens_inventarioId_itemId_key" ON "cat_inventario_itens"("inventarioId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "cat_convenios_nome_key" ON "cat_convenios"("nome");

-- CreateIndex
CREATE INDEX "cat_convenio_precos_convenioId_idx" ON "cat_convenio_precos"("convenioId");

-- CreateIndex
CREATE INDEX "fin_faturas_convenio_status_idx" ON "fin_faturas_convenio"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fin_faturas_convenio_convenioId_competencia_key" ON "fin_faturas_convenio"("convenioId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fatura_convenio_itens_appointmentItemId_key" ON "fin_fatura_convenio_itens"("appointmentItemId");

-- CreateIndex
CREATE INDEX "fin_fatura_convenio_itens_convenioId_idx" ON "fin_fatura_convenio_itens"("convenioId");

-- CreateIndex
CREATE INDEX "fin_fatura_convenio_itens_faturaId_idx" ON "fin_fatura_convenio_itens"("faturaId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_clinico" ADD CONSTRAINT "historico_clinico_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "svc_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "forn_fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_composicao" ADD CONSTRAINT "produto_composicao_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_composicao" ADD CONSTRAINT "produto_composicao_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "est_movimentos" ADD CONSTRAINT "est_movimentos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "est_pedidos_compra" ADD CONSTRAINT "est_pedidos_compra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "forn_fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "est_pedidos_compra_itens" ADD CONSTRAINT "est_pedidos_compra_itens_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "est_pedidos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "est_pedidos_compra_itens" ADD CONSTRAINT "est_pedidos_compra_itens_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_recordings" ADD CONSTRAINT "consultation_recordings_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "consultation_recordings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "newsletter_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterLog" ADD CONSTRAINT "NewsletterLog_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "agent_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiqueta_templates" ADD CONSTRAINT "etiqueta_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tag_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "svc_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_estagios" ADD CONSTRAINT "pipeline_estagios_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipeline_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cadencia_passos" ADD CONSTRAINT "cadencia_passos_cadenciaId_fkey" FOREIGN KEY ("cadenciaId") REFERENCES "cadencia_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cadencia_inscricoes" ADD CONSTRAINT "cadencia_inscricoes_cadenciaId_fkey" FOREIGN KEY ("cadenciaId") REFERENCES "cadencia_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_templates" ADD CONSTRAINT "script_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "script_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exa_catalogo" ADD CONSTRAINT "exa_catalogo_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "forn_fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_enrichments" ADD CONSTRAINT "lead_enrichments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_insights" ADD CONSTRAINT "lead_insights_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_executorUserId_fkey" FOREIGN KEY ("executorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "forn_fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao_extratos" ADD CONSTRAINT "comissao_extratos_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "comissao_fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao_extratos" ADD CONSTRAINT "comissao_extratos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_autorUserId_fkey" FOREIGN KEY ("autorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos_aplicados" ADD CONSTRAINT "protocolos_aplicados_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos_aplicados" ADD CONSTRAINT "protocolos_aplicados_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos_aplicados" ADD CONSTRAINT "protocolos_aplicados_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "protocolo_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos_aplicados" ADD CONSTRAINT "protocolos_aplicados_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos_aplicados" ADD CONSTRAINT "protocolos_aplicados_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolo_doses" ADD CONSTRAINT "protocolo_doses_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "protocolos_aplicados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolo_doses" ADD CONSTRAINT "protocolo_doses_aplicadaPorId_fkey" FOREIGN KEY ("aplicadaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa_sessoes" ADD CONSTRAINT "caixa_sessoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_caixaSessaoId_fkey" FOREIGN KEY ("caixaSessaoId") REFERENCES "caixa_sessoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa_movimentos" ADD CONSTRAINT "caixa_movimentos_caixaSessaoId_fkey" FOREIGN KEY ("caixaSessaoId") REFERENCES "caixa_sessoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credito_movimentos" ADD CONSTRAINT "credito_movimentos_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_ocupacoes" ADD CONSTRAINT "box_ocupacoes_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_unidades" ADD CONSTRAINT "fin_unidades_marcaPadraoId_fkey" FOREIGN KEY ("marcaPadraoId") REFERENCES "fin_marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_categorias" ADD CONSTRAINT "fin_categorias_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "fin_grupos_categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_contas" ADD CONSTRAINT "fin_contas_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "fin_unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "fin_unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "fin_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_linhaServicoId_fkey" FOREIGN KEY ("linhaServicoId") REFERENCES "fin_linhas_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "fin_marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "fin_contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_faturamentos_bruto" ADD CONSTRAINT "fin_faturamentos_bruto_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "fin_unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietas" ADD CONSTRAINT "dietas_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_parcelas_emprestimo" ADD CONSTRAINT "fin_parcelas_emprestimo_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "fin_emprestimos_internos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fatura_itens" ADD CONSTRAINT "fin_fatura_itens_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "fin_faturas_fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_grupos" ADD CONSTRAINT "cat_grupos_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "cat_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_itens" ADD CONSTRAINT "cat_itens_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "cat_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_itens" ADD CONSTRAINT "cat_itens_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "cat_marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_item_exame" ADD CONSTRAINT "cat_item_exame_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "cat_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_composicao" ADD CONSTRAINT "cat_composicao_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "cat_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_composicao" ADD CONSTRAINT "cat_composicao_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "cat_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_comissao_override" ADD CONSTRAINT "cat_comissao_override_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "cat_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_historico" ADD CONSTRAINT "cat_historico_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "cat_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_estoque_movimentos" ADD CONSTRAINT "cat_estoque_movimentos_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "cat_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_inventario_itens" ADD CONSTRAINT "cat_inventario_itens_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "cat_inventarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_convenio_precos" ADD CONSTRAINT "cat_convenio_precos_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "cat_convenios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fatura_convenio_itens" ADD CONSTRAINT "fin_fatura_convenio_itens_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "fin_faturas_convenio"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ÍNDICE DE BUSCA POR SIMILARIDADE (pgvector)
--
-- O Prisma não sabe descrever índice de vetor no schema, então ele nunca apareceria aqui
-- sozinho — e ficaria para sempre como "diferença" entre o desenho e o banco. Escrito à mão
-- para que o histórico de migrações reproduza o banco EXATAMENTE como ele é hoje.
CREATE INDEX IF NOT EXISTS "idx_document_chunks_embedding" ON "public"."document_chunks"("embedding");
