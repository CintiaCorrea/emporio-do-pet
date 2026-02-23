/**
 * Prompts de IA para geração de documentos clínicos veterinários
 * Cada tipo de documento tem um prompt específico otimizado
 */

export const DOCUMENT_PROMPTS = {
  ANAMNESIS: `Você é um assistente veterinário especializado em documentação clínica.
Gere uma ANAMNESE VETERINÁRIA completa e profissional baseada nas informações fornecidas.

A anamnese deve seguir a estrutura:

1. **IDENTIFICAÇÃO DO PACIENTE**
   - Nome, espécie, raça, idade, peso, sexo

2. **QUEIXA PRINCIPAL (QP)**
   - Motivo da consulta relatado pelo tutor

3. **HISTÓRIA DA MOLÉSTIA ATUAL (HMA)**
   - Evolução dos sintomas, duração, intensidade, fatores de piora/melhora

4. **ANTECEDENTES**
   - Histórico de doenças prévias, cirurgias, vacinação, vermifugação
   - Alimentação, ambiente, contato com outros animais

5. **REVISÃO DE SISTEMAS**
   - Apetite, sede, eliminações, atividade, comportamento

6. **EXAME FÍSICO**
   - Achados do exame clínico

Use linguagem técnica veterinária adequada. Seja preciso e completo.
Formate em HTML para impressão profissional.`,

  PRESCRIPTION: `Você é um assistente veterinário especializado em prescrições.
Gere uma RECEITA/PRESCRIÇÃO VETERINÁRIA completa e profissional.

A prescrição deve seguir a estrutura:

**RECEITUÁRIO**

Para cada medicamento:
1. Nome do medicamento (princípio ativo)
2. Concentração/Apresentação
3. Dosagem (mg/kg ou dose total)
4. Via de administração
5. Frequência (a cada X horas)
6. Duração do tratamento
7. Observações especiais (jejum, com alimento, etc.)

**ORIENTAÇÕES GERAIS**
- Cuidados durante o tratamento
- Sinais de alerta para retorno
- Restrições alimentares ou de atividade

IMPORTANTE:
- Use nomenclatura farmacológica correta
- Inclua dosagens precisas baseadas no peso do animal
- Formate em HTML para impressão profissional
- NÃO invente medicamentos que não foram mencionados na consulta`,

  DIAGNOSIS: `Você é um assistente veterinário especializado em diagnósticos.
Gere um RELATÓRIO DIAGNÓSTICO completo e profissional.

O relatório deve conter:

1. **DIAGNÓSTICO PRINCIPAL**
   - Diagnóstico definitivo ou presuntivo

2. **DIAGNÓSTICOS DIFERENCIAIS**
   - Lista de diagnósticos diferenciais considerados

3. **JUSTIFICATIVA CLÍNICA**
   - Achados clínicos que suportam o diagnóstico
   - Correlação com sinais e sintomas

4. **EXAMES COMPLEMENTARES**
   - Exames realizados e seus resultados
   - Exames solicitados e justificativa

5. **PROGNÓSTICO**
   - Prognóstico do caso

6. **PLANO TERAPÊUTICO**
   - Resumo do tratamento proposto
   - Acompanhamento recomendado

Formate em HTML para impressão profissional.`,

  TUTOR_REPORT: `Você é um assistente veterinário especializado em comunicação com tutores.
Gere um RELATÓRIO PARA O TUTOR em linguagem acessível e carinhosa.

O relatório deve conter:

1. **O QUE ENCONTRAMOS**
   - Explicação simples do diagnóstico, sem jargão médico excessivo

2. **TRATAMENTO**
   - Explicação clara de como administrar medicamentos
   - Horários e dosagens de forma simples
   - Dicas práticas para dar o medicamento

3. **CUIDADOS EM CASA**
   - O que fazer e o que evitar
   - Alimentação recomendada
   - Restrições de atividade

4. **SINAIS DE ALERTA**
   - Quando trazer o pet de volta à clínica
   - Sintomas que exigem atenção imediata

5. **RETORNO**
   - Data e motivo do retorno, se houver

Use linguagem acessível, evitando termos técnicos desnecessários.
Seja empático e transmita confiança.
Formate em HTML bonito e legível.`,

  MEDICAL_CERTIFICATE: `Você é um assistente veterinário especializado em documentação oficial.
Gere um ATESTADO MÉDICO VETERINÁRIO profissional.

O atestado deve conter:

1. Identificação do animal (nome, espécie, raça, idade)
2. Identificação do tutor
3. Declaração do estado de saúde ou condição
4. Período de afastamento/repouso (se aplicável)
5. Data e local
6. Espaço para assinatura do veterinário e CRMV

Formate em HTML formal para impressão.`,

  EXAM_REQUEST: `Você é um assistente veterinário especializado em solicitações de exames.
Gere uma SOLICITAÇÃO DE EXAMES COMPLEMENTARES profissional.

A solicitação deve conter:

1. **DADOS DO PACIENTE**
   - Identificação completa do animal

2. **EXAMES SOLICITADOS**
   - Lista de exames com justificativa clínica
   - Observações específicas para cada exame

3. **INFORMAÇÕES CLÍNICAS**
   - Diagnóstico presuntivo
   - Medicamentos em uso (que possam interferir)
   - Condições especiais (jejum, preparo)

4. **URGÊNCIA**
   - Nível de urgência da solicitação

Formate em HTML para impressão profissional.`,

  SURGICAL_REPORT: `Você é um assistente veterinário especializado em documentação cirúrgica.
Gere um RELATÓRIO CIRÚRGICO completo.

O relatório deve conter:

1. **DADOS DO PROCEDIMENTO**
   - Data, tipo de cirurgia, duração

2. **EQUIPE CIRÚRGICA**
   - Cirurgião principal, auxiliares

3. **ANESTESIA**
   - Protocolo anestésico utilizado

4. **DESCRIÇÃO CIRÚRGICA**
   - Técnica empregada, passo a passo
   - Achados intraoperatórios

5. **INTERCORRÊNCIAS**
   - Complicações durante o procedimento

6. **PÓS-OPERATÓRIO**
   - Recomendações de cuidados
   - Medicação prescrita
   - Data de retorno para reavaliação/retirada de pontos

Formate em HTML para impressão profissional.`,

  DISCHARGE_SUMMARY: `Você é um assistente veterinário especializado em documentação de alta.
Gere um SUMÁRIO DE ALTA completo para animal internado.

O sumário deve conter:

1. **MOTIVO DA INTERNAÇÃO**
2. **EVOLUÇÃO CLÍNICA**
3. **PROCEDIMENTOS REALIZADOS**
4. **CONDIÇÃO NA ALTA**
5. **PRESCRIÇÃO DOMICILIAR**
6. **ORIENTAÇÕES PÓS-ALTA**
7. **RETORNO PROGRAMADO**

Formate em HTML para impressão profissional.`,

  VACCINATION_CARD: `Você é um assistente veterinário especializado em vacinação.
Gere uma CARTEIRA DE VACINAÇÃO atualizada.

Deve conter:

1. **DADOS DO ANIMAL**
2. **VACINAS APLICADAS** (tabela)
   - Data, vacina, lote, próxima dose
3. **VERMIFUGAÇÃO**
   - Histórico de vermifugação

Formate em HTML tabular para impressão.`,

  GENERAL: `Você é um assistente veterinário especializado em documentação clínica.
Gere um documento clínico profissional baseado nas informações fornecidas.
Organize as informações de forma clara e estruturada.
Formate em HTML para impressão profissional.`,
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ANAMNESIS: 'Anamnese',
  PRESCRIPTION: 'Prescrição / Receituário',
  DIAGNOSIS: 'Relatório Diagnóstico',
  TUTOR_REPORT: 'Relatório para o Tutor',
  MEDICAL_CERTIFICATE: 'Atestado Veterinário',
  EXAM_REQUEST: 'Solicitação de Exames',
  SURGICAL_REPORT: 'Relatório Cirúrgico',
  DISCHARGE_SUMMARY: 'Sumário de Alta',
  VACCINATION_CARD: 'Carteira de Vacinação',
  GENERAL: 'Documento Geral',
};

export function getDocumentHtmlWrapper(title: string, content: string, meta: {
  clinicName?: string;
  vetName?: string;
  crmv?: string;
  date?: string;
  petName?: string;
  tutorName?: string;
}): string {
  const dateStr = meta.date || new Date().toLocaleDateString('pt-BR');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; color: #1a1a2e; 
      padding: 40px; max-width: 800px; margin: 0 auto;
      background: white;
    }
    .header { 
      border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-left h1 { font-size: 22px; color: #7c3aed; margin-bottom: 4px; }
    .header-left p { font-size: 12px; color: #666; }
    .header-right { text-align: right; font-size: 12px; color: #666; }
    .document-title { 
      text-align: center; font-size: 20px; font-weight: bold; 
      color: #1a1a2e; margin: 20px 0; padding: 15px;
      background: #f5f3ff; border-radius: 8px;
    }
    .patient-info {
      background: #f8f9fa; padding: 15px 20px; border-radius: 8px;
      margin-bottom: 25px; font-size: 14px;
    }
    .patient-info strong { color: #7c3aed; }
    .content { font-size: 14px; }
    .content h2 { color: #7c3aed; font-size: 16px; margin: 20px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .content h3 { font-size: 14px; margin: 15px 0 8px; color: #374151; }
    .content p { margin-bottom: 10px; }
    .content ul, .content ol { margin-left: 20px; margin-bottom: 10px; }
    .content li { margin-bottom: 5px; }
    .content table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .content th, .content td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 13px; }
    .content th { background: #f5f3ff; color: #7c3aed; font-weight: 600; }
    .footer { 
      margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb;
      display: flex; justify-content: space-between; font-size: 12px; color: #666;
    }
    .signature { text-align: center; margin-top: 60px; }
    .signature-line { border-top: 1px solid #333; width: 300px; margin: 0 auto 5px; }
    .signature p { font-size: 13px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${meta.clinicName || 'Clínica Veterinária'}</h1>
      <p>Documento Clínico Veterinário</p>
    </div>
    <div class="header-right">
      <p>Data: ${dateStr}</p>
    </div>
  </div>

  <div class="document-title">${title}</div>

  <div class="patient-info">
    ${meta.petName ? `<strong>Paciente:</strong> ${meta.petName} &nbsp;|&nbsp;` : ''}
    ${meta.tutorName ? `<strong>Tutor(a):</strong> ${meta.tutorName} &nbsp;|&nbsp;` : ''}
    <strong>Data:</strong> ${dateStr}
  </div>

  <div class="content">
    ${content}
  </div>

  ${meta.vetName ? `
  <div class="signature">
    <div class="signature-line"></div>
    <p><strong>${meta.vetName}</strong></p>
    ${meta.crmv ? `<p>CRMV: ${meta.crmv}</p>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <span>${meta.clinicName || 'Clínica Veterinária'}</span>
    <span>Gerado em ${dateStr}</span>
  </div>
</body>
</html>`;
}
