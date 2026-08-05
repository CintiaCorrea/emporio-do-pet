// =============================================================================
// Modelos de documento importados do SimplesVet (Fase 2 da migração)
// -----------------------------------------------------------------------------
// Cada entrada tem { nome, corpo }. O corpo usa as variáveis @VAR@ que o motor
// (lib/documentos/variaveis.ts) preenche com os dados reais na ficha do pet.
//
// A tela Configurações › Modelos de documento seeda estes modelos:
//  - se o modelo NÃO existe ainda → cria com este corpo;
//  - se existe mas está VAZIO     → preenche com este corpo;
//  - se existe e já tem texto      → NÃO mexe (respeita edições manuais).
//
// Para importar um novo documento: adicione uma entrada aqui e publique.
// =============================================================================

export interface ModeloSimplesVet {
  nome: string;
  corpo: string;
}

export const MODELOS_SIMPLESVET: ModeloSimplesVet[] = [
  {
    nome: "Atestado de saúde",
    corpo: `Atesto para os devidos fins que examinei o animal da espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, @ANIMAL_SEXO@, nascida em @ANIMAL_NASCIMENTO@, nome @ANIMAL_NOME@, pelagem cor "@ANIMAL_PELAGEM@", de @ANIMAL_PESO@ Kg, apresentado sob responsabilidade do(a) Sr(a). @RESPONSAVEL_NOME@, Rg @RESPONSAVEL_RG@, CPF @RESPONSAVEL_CPF@, residentes na @RESPONSAVEL_ENDERECO@, Cidade: @RESPONSAVEL_CIDADE@, Estado: @RESPONSAVEL_ESTADO@, CEP: @RESPONSAVEL_CEP@.

O animal acima identificado encontra-se em bom estado clínico geral, sem sinais de doença infecto contagiosa ativa ou miíase, estando apto a embarcar, em perfeitas condições de saúde e apto a realizar viagem aérea.

OBSERVAÇÃO:




@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@





 @USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Atestado de vacinação",
    corpo: `Atesto que o animal acima descrito foi vacinado nas datas indicadas, tendo sido aplicadas as seguintes vacinas:

Vacinas aplicadas
@ANIMAL_VACINAS_APLICADAS@

Vacinas programadas
@ANIMAL_VACINAS_PROGRAMADAS@


@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@.


----------------------------------------------
@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Atestado de vacinação resumido",
    corpo: `Atesto que o animal acima descrito foi vacinado nas datas indicadas, tendo sido aplicadas as seguintes vacinas:

Vacinas aplicadas
@ANIMAL_VACINAS_APLICADAS_RESUMO@

Vacinas programadas
@ANIMAL_VACINAS_PROGRAMADAS@


@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@.


----------------------------------------------
@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Atividades Map",
    corpo: `ATIVIDADES RECOMENDADAS: I ETAPA


O Escovação das patas sentido contrário ao pêlo, durante 5 minutos, 2x/dia;

O Flexionar os dedos alongando rapidamente 3X e, na sequência, beliscar no meio dos dedos até o paciente puxar a pata, 10 repetições, 2x/dia;

O Fazer massagem conforme ensinado pelo veterinário com óleo essencial de Lavanda (colocar 1 gota na mão, friccionar e massagear o animal);

O Fazer alongamento conforme ensinado pelo veterinário;


COM BOLA DE APOIO: II ETAPA

O Deslocar o animal para frente e para trás levemente, 20 repetições, 2x/dia;

O Deslocar o animal para os lados levemente, 20 repetições, 2x/dia;

O Puxar a patinha para trás e quando sair do chão, beliscar no meio dos dedos com certa força, até o animal trazer a pata de volta ao chão; 10 repetições cada pata, 2x/dia;


 EXERCÍCIOS: III ETAPA


O Utilizar elástico durante a caminhada para fortalecimento muscular;

O Fazer caminhadas com guia curta por ____ minutos,  ________ vezes por dia;

O Ultrapassar obstáculos conforme ensinado pelo veterinário.`,
  },
  {
    nome: "Ficha Resumida",
    corpo: `Proprietário: @RESPONSAVEL_NOME@ (Cód. @RESPONSAVEL_FICHA@)
Telefone: @RESPONSAVEL_TELEFONE@
E-mail: @RESPONSAVEL_EMAIL@
Endereço: @RESPONSAVEL_ENDERECO@
Documentos: @RESPONSAVEL_DOCUMENTOS@

Animal: @ANIMAL_NOME@ (Cód. @ANIMAL_FICHA@)
Espécie: @ANIMAL_ESPECIE@
Raça: @ANIMAL_RACA@
Nascido em: @ANIMAL_NASCIMENTO@
Idade: @ANIMAL_IDADE@
Sexo: @ANIMAL_SEXO@
Castrado: @ANIMAL_ESTERILIZACAO@`,
  },
  {
    nome: "Atestado anti-rábica para transporte",
    corpo: `VACINAÇÃO ANTI-RÁBICA

Nome da Vacina e Fabricante: ______________________________

Número do lote: ______________________________

Data da vacinação: ______________________________

Válida até: ______________________________

A vacinação anti-rábica é exigida para cães e gatos acima de 90 dias de idade e é válida por um ano.
Anexar o cartão de vacinação do animal.

Declaro que o animal acima identificado foi por mim examinado e estava clinicamente sadio, isento de ectoparasitas à inspeção clínica e apto a ser transportado.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@

Este atestado é válido por 10 dias.

Observação: Outros animais de companhia somente poderão ser transportados com a Guia de Trânsito Animal – GTA (Instrução Normativa n. 18 de 18/07/2006 do Ministério da Agricultura, Pecuária e Abastecimento, publicada no D.O.U. de 20/07/2006).`,
  },
  {
    nome: "Reabilitação — Informativo",
    corpo: `REABILITAÇÃO E FISIOTERAPIA VETERINÁRIA

A reabilitação veterinária tem como objetivo aliviar a dor, recuperar movimentos, melhorar a mobilidade e promover mais conforto e qualidade de vida aos animais.

Recursos terapêuticos que podem ser utilizados:
• Laser e fototerapia — auxiliam na cicatrização, no controle da dor e na recuperação dos tecidos.
• Ultrassom terapêutico — contribui para a recuperação muscular, articular e óssea.
• Magnetoterapia — pode auxiliar na regeneração tecidual e no processo de consolidação óssea.
• Eletroestimulação — ajuda no fortalecimento muscular e no controle da dor.
• Hidroterapia e hidroesteira — promovem fortalecimento muscular com menor impacto nas articulações, além de ajudar na mobilidade, equilíbrio e coordenação.
• Exercícios terapêuticos e cinesioterapia — atividades adaptadas para cada paciente, favorecendo recuperação funcional e condicionamento físico.
• Acupuntura — auxilia no controle da dor, no equilíbrio do organismo e na recuperação funcional.
• Moxabustão (moxa) — calor terapêutico que pode ajudar na circulação, no relaxamento muscular e no alívio da dor.
• Ozonioterapia — recurso complementar no controle da dor, no tratamento de feridas e em algumas condições inflamatórias e infecciosas locais.

A fisioterapia e reabilitação podem ser recomendadas em casos como:
• Artrose
• Hérnia de disco
• Displasia coxofemoral
• Disfunção cognitiva
• Cinomose
• Ruptura do ligamento cruzado
• Luxação de patela
• Fraturas e traumas
• Dores musculares e articulares
• Pós-operatório
• Alterações neurológicas
• Sobrecarga de peso nas articulações

Nosso cuidado
Cada protocolo é planejado de forma personalizada, respeitando as necessidades do paciente, com o objetivo de proporcionar recuperação, conforto, funcionalidade e bem-estar.

Empório do Pet — Cuidado integrativo, reabilitação e atenção individualizada para cada pet.`,
  },
  {
    nome: "Declaração de comparecimento",
    corpo: `DECLARAÇÃO VETERINÁRIA

Eu, @USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@, inscrito(a) no Conselho Regional de Medicina Veterinária sob o n° @USUARIO_CRMV@, declaro para os devidos fins que @RESPONSAVEL_NOME@, CPF @RESPONSAVEL_CPF@, tutor(a) do animal de estimação identificado como @ANIMAL_NOME@, da espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, com @ANIMAL_IDADE@, necessitou comparecer a esta clínica veterinária para acompanhar o atendimento e tratamento do referido animal.

O atendimento ocorreu no dia ____ de ____________ de ______, em @CLINICA_CIDADE@ – @CLINICA_ESTADO@, em caráter de urgência/necessidade, demandando a presença do(a) tutor(a) para os cuidados e o acompanhamento do animal, o que justificou sua permanência no período de ____ a ____ de ____________ de ______.

Observação (vínculo/instituição, se aplicável): _____________________________________________________

Declaro ainda que as informações acima são verdadeiras e me responsabilizo pelo seu teor.

@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@


----------------------------------------------
@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Encaminhamento",
    corpo: `Ao colega,

Encaminho o animal acima referido, @ANIMAL_NOME@ (@ANIMAL_ESPECIE@, @ANIMAL_RACA@), atendido na Clínica Veterinária Empório do Pet, apresentando:

- ______________________________________________________________

Histórico:
______________________________________________________________
______________________________________________________________

Exames realizados:
- ______________________________
- ______________________________

Tratamento realizado:
- ______________________________
- ______________________________

Solicito a sua avaliação para dar continuidade ao tratamento.

Atenciosamente,

@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@


@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Relatório fisiátrico",
    corpo: `RELATÓRIO FISIÁTRICO / DE REABILITAÇÃO

Paciente: @ANIMAL_NOME@ — @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, @ANIMAL_SEXO@, @ANIMAL_IDADE@.
Tutor(a): @RESPONSAVEL_NOME@

Diagnóstico
______________________________________________________________

Histórico Clínico Resumido
______________________________________________________________
______________________________________________________________

Avaliação Fisiátrica
• Dor: ______________________________
• Estado neurológico: ______________________________
• Reflexos espinhais: ______________________________
• Propriocepção: ______________________________
• Funções urinária e intestinal: ______________________________

Conduta Fisiátrica Realizada
Recursos utilizados:
• Magnetoterapia
• Fotobiomodulação
• TENS
• Acupuntura / eletroacupuntura
• Hidroterapia em esteira aquática
• ______________________________

Evolução Clínica
______________________________________________________________
______________________________________________________________

Estado Funcional Atual
• Deambulação: ______________________________
• Dor: ______________________________
• Resistência ao exercício: ______________________________

Conclusão / Parecer
______________________________________________________________
______________________________________________________________

Recomendações Fisiátricas
• ______________________________
• ______________________________

@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@


@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Solicitação de óleo de cannabis",
    corpo: `Animal acima referido, @ANIMAL_NOME@ (@ANIMAL_ESPECIE@, @ANIMAL_RACA@), atendido na Clínica Veterinária Empório do Pet no dia ____ de ____________ de ______, com os seguintes diagnósticos:

- ______________________________________________
- ______________________________________________
- ______________________________________________

Animal refratário a tratamentos convencionais.

Solicito a utilização do óleo de cannabis, por tempo indeterminado.

@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@


@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Termo de boas-vindas — Internação",
    corpo: `Seja muito bem-vindo(a)!

Agradecemos por confiar na nossa equipe para cuidar do seu pet. Nossa missão é oferecer um atendimento humanizado, seguro e de excelência, proporcionando conforto ao paciente e tranquilidade aos tutores durante o período de internação.

Contamos com a sua colaboração para que essa experiência seja o mais positiva possível. A seguir, apresentamos algumas orientações importantes para garantir o bem-estar do seu pet e o bom funcionamento da clínica:

1. Horários e Regras de Visitação
A visitação será permitida apenas a pessoas autorizadas pelo tutor responsável.
É necessário identificar-se na recepção antes da entrada.
A visita deve ser acompanhada pelo médico veterinário responsável pelo período.
Informações sobre o estado de saúde do paciente devem ser solicitadas somente ao médico veterinário.
Evite sons altos ou barulhos excessivos nas dependências da clínica.
Não é permitida a interferência dos visitantes nos cuidados prestados ao paciente.
Não é permitido manipular equipamentos hospitalares.
Não traga alimentos ou petiscos sem autorização do médico veterinário.
A clínica não se responsabiliza por objetos deixados nas dependências.
Em caso de danos causados ao patrimônio, a clínica se reserva o direito de cobrar pelos prejuízos.
O tempo máximo de permanência por visita é de 15 minutos.
Visitas não são permitidas aos domingos e feriados.

2. Equipe de Apoio – Auxiliares Veterinários
Os auxiliares veterinários executam apenas as prescrições feitas pelo médico veterinário e oferecem suporte aos cuidados diários.
A equipe auxiliar não está autorizada a fornecer informações sobre o estado de saúde do paciente.

3. Objetos Pessoais do Paciente
Os itens enviados com o animal devem ser devidamente identificados no momento da internação.
Recomendamos enviar apenas o essencial, para facilitar a organização e segurança do ambiente.

4. Informações Financeiras
As parciais dos custos serão informadas diariamente até às 18h.
O fechamento da conta deverá ser feito na recepção, de segunda a sábado, das 9h às 18h.
Em caso de dúvidas, nossa equipe está à disposição para esclarecimentos.

5. Alta Hospitalar
A alta será concedida mediante avaliação clínica do médico veterinário e registrada no prontuário do paciente.
O tutor responsável será comunicado e receberá as orientações para continuidade do tratamento.
A alta só poderá ser realizada de segunda a sábado, nos seguintes horários:
Manhã: das 11h às 12h
Tarde: das 16h às 17h
Apenas o tutor responsável poderá retirar o paciente.

6. Canais de Contato
Telefones:
(85) 3038-7887
(85) 98890-7786 (WhatsApp)
As informações por telefone e WhatsApp serão repassadas exclusivamente ao tutor responsável.
Apenas o médico veterinário poderá fornecer informações clínicas.
Esse serviço é oferecido como cortesia e está sujeito à disponibilidade do profissional, já que ele poderá estar em atendimentos ou procedimentos.

Agradecemos mais uma vez por sua confiança.
Estamos à disposição para quaisquer dúvidas e prontos para cuidar do seu pet com todo carinho e dedicação que ele merece! 🐾`,
  },
  {
    nome: "Orientações sobre reações vacinais",
    corpo: `ORIENTAÇÕES SOBRE REAÇÕES VACINAIS

O principal objetivo da vacina é proteger o animal contra uma determinada doença e, para isso, são utilizados vírus e/ou bactérias inativos.

Quando o corpo tem contato com tais vírus, ele aciona o sistema imunológico a fim de produzir anticorpos contra a doença. É dessa forma que o organismo fica protegido.

Os tipos de reações das vacinas em cachorros podem ser os mais variados: algumas por resposta excessiva do sistema imune, outras em relação às substâncias contidas na vacina.

As reações podem se manifestar nos três primeiros dias após a aplicação e podem começar a regredir sem que precise de um tratamento específico.

Geralmente, a vacina em filhotes causa maiores reações, já que o sistema imunológico do animal não está completamente desenvolvido.

Lembramos que não se deve deixar de administrar as vacinas nos seus pets com medo dos possíveis efeitos colaterais. As reações têm um índice muito baixo quando comparado à quantidade de vidas que as vacinas salvam.

Tipos de reação leve das vacinas em cães:
- dores no corpo;
- dor ou incômodo no local da aplicação;
- inchaço no local da aplicação;
- aumento da temperatura corporal;
- sede;
- sonolência.

Esses sintomas costumam durar pouco tempo, mas o inchaço e o incômodo no local da aplicação podem perdurar por até 3 dias.

Não existem reações fixas, pois elas podem variar de cachorro para cachorro. Fique atento e procure o veterinário com urgência caso o animal apresente:
- coceiras;
- edema no rosto, que se espalha para o restante do corpo;
- salivação excessiva;
- agitação;
- tremores;
- falta de ar.
Esses sinais podem indicar uma reação alérgica grave.

Quando se trata de sintomas mais leves, alguns cuidados que os tutores podem tomar:
- evitar tocar no local em que a vacina foi aplicada;
- deixar o pet descansar em um local confortável;
- dar banho no cachorro antes de aplicar a vacina (não depois).

Quando um cachorro vacinado apresenta reação, isso não significa que ele não está protegido, apenas que o seu organismo está tendo um pouco mais de trabalho para lidar com a vacina.

Em hipótese alguma medique o seu amigo de quatro patas sem a prescrição de um médico veterinário. Isso pode acabar piorando a situação do seu pet.`,
  },
  {
    nome: "Orientações Pós Operatórias",
    corpo: `Ao Proprietário:

- Colocar colar ou roupa cirúrgica no animal, até a retirada dos pontos em 10 dias;
- Colocar absorvente diário por dentro da roupa do animal, para não deixar a roupa molhada (lambedura);
- Deixar o animal em repouso durante 7 dias;
- Não deixar o animal em hipótese alguma sem a roupa ou colar;
- Não deixar o animal subir (em camas, sofás, armários, árvores, telhado, etc.) ou correr até retirar os pontos;
- Não passear com o animal enquanto estiver com os pontos;
- Se o animal romper os pontos, será cobrado novo procedimento;
- Qualquer dúvida, estamos à disposição nos tel.: 3038-7887 ou WhatsApp (85) 98890-7786.

Se necessário fora do nosso horário de atendimento, levá-lo à emergência 24h mais próxima.`,
  },
  {
    nome: "Ozonioterapia — Informativo",
    corpo: `OZONIOTERAPIA

A ozonioterapia é uma técnica terapêutica que utiliza uma mistura de oxigênio e ozônio com propriedades medicinais. Nos tratamentos de ferimentos em cães, ela é cada vez mais reconhecida por seus benefícios.

Ação Antimicrobiana
O ozônio possui propriedades bactericidas, fungicidas e virucidas, o que o torna eficaz no combate a infecções locais. Ele ajuda a reduzir a carga microbiana nas feridas, criando um ambiente mais limpo e favorável à cicatrização.

Estímulo da Regeneração Tecidual
O ozônio melhora a oxigenação dos tecidos, promovendo a circulação sanguínea local e aumentando a entrega de oxigênio às células. Isso estimula a regeneração dos tecidos e acelera a recuperação.

Redução da Inflamação
A ozonioterapia reduz o processo inflamatório ao modular a resposta imunológica. Isso contribui para diminuir a dor e o desconforto, melhorando a qualidade de vida do animal durante o tratamento.

Ações:
- Ação antimicrobiana
- Ação anti-inflamatória
- Estímulo da regeneração celular
- Fortalecimento do sistema imunológico
- Melhora da circulação sanguínea (oxigenação tecidual)

Indicações:
- Alívio das dores (diminui o edema)
- Feridas e lesões graves
- Doenças inflamatórias
- Processos neoplásicos
- Problemas imunológicos
- Doenças intestinais e digestivas
- Infecções bacterianas, virais e fúngicas
- Condutas de desintoxicação

Formas de Aplicação:
- Insuflação Retal
- Água Ozonizada
- Aplicação Tópica
- Insuflação Auricular
- Aplicação Intra-articular
- Auto-hemoterapia
- Infiltração Subcutânea ou Intramuscular

Orientações para o Sucesso do Tratamento
Para que seu animal de estimação obtenha os melhores resultados, siga estas recomendações:
- Evite o contato do animal com a ferida, utilizando um colar elizabetano, se necessário.
- Mantenha a área limpa e seca, conforme as instruções do veterinário.
- Compareça às sessões agendadas no prazo previsto.
- Informe-nos caso perceba alterações no comportamento ou no aspecto da ferida.

A quantidade de sessões varia de acordo com a gravidade e a resposta do animal. Em geral, são realizadas de 3 a 10 sessões.

Estamos felizes em cuidar do seu animal de estimação com o apoio da ozonioterapia, uma técnica avançada e segura que auxilia na recuperação de cirurgias, promovendo uma cicatrização mais rápida e saudável. Estamos à disposição para esclarecer quaisquer dúvidas e garantir que seu animal tenha o melhor cuidado durante sua recuperação.`,
  },
  {
    nome: "Receituário de Controle Especial",
    corpo: `RECEITUÁRIO DE CONTROLE ESPECIAL

Prescrição:
______________________________________________________________
______________________________________________________________
______________________________________________________________

Dados do emitente:
Nome: @USUARIO_NOMEPUBLICO@    @USUARIO_CRMV@    Número MAPA-Sequência-Ano: ____________
Endereço: @CLINICA_ENDERECO@
Cidade / Estado: @CLINICA_CIDADE@, @CLINICA_ESTADO@
Telefones: @CLINICA_TELEFONE@ - @CLINICA_TELEFONE2@
Data de emissão: @GERAL_DATA@


_________________________________
@USUARIO_NOMEPUBLICO@
@USUARIO_CRMV@

Farmácia veterinária (  )      Farmácia Humana (  )

Identificação do comprador:
Nome: __________________________________
RG: ___________________ Órg. Emissor: ______
End.: ___________________________________
Cidade: ______________________ UF: _______
Telefone: ________________________________

Identificação do fornecedor:
______________________________________________________________


_____________________________
Assinatura do Farmacêutico     DATA __/__/__

1ª via - Farmácia
2ª via - Paciente`,
  },
  {
    nome: "Recomendações — Cuidados neurológicos/coluna",
    corpo: `RECOMENDAÇÕES:

O Utilizar esteiras de borracha / tapetes de EVA no piso liso, para evitar escorregões;

O Proibir o animal de subir/descer escadas, sofá, cama, carro, etc.;

O Pegar no colo apoiando a barriga no braço, deixando a coluna na posição mais natural possível;

O Evitar brincadeiras de alto impacto;

O Evitar banho ou manipulá-lo da melhor forma possível;

O Repouso absoluto durante 30 dias;

O Mantê-lo em local confortável / acolchoado (colchão piramidal);

O Trocar a posição do animal a cada 4 horas;

O Comprimir a bexiga do animal a cada 3 horas se não estiver urinando sozinho;

O Utilizar fralda higiênica embaixo do animal para facilitar o manejo;

O Utilizar lençol / toalha ao redor da barriga para auxiliar a locomoção;

O Facilitar a alimentação elevando a altura dos potes na altura dos cotovelos;

O Utilizar peitoral ao invés de coleira;

O Aplicar bolsa de água quente durante 15 minutos, 2x/dia, ao redor do pescoço;

O Fazer uso do Corset 24 horas por dia.`,
  },
  {
    nome: "Relatório de alta — Internação/Fisioterapia",
    corpo: `RELATÓRIO DE ALTA — INTERNAÇÃO

Paciente: @ANIMAL_NOME@ — @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, @ANIMAL_SEXO@, @ANIMAL_IDADE@.
Tutor(a): @RESPONSAVEL_NOME@

Data de entrada: ______________
Data de alta: ______________
Motivo da internação: ______________________________________________
Diagnóstico inicial: ______________________________________________

Procedimentos Realizados
Sessões de fisioterapia realizadas — tipo(s) de técnica(s): (ex.: eletroterapia, hidroterapia, exercícios passivos, etc.) ______________________________________________
Frequência: (ex.: 3 vezes por semana) ______________
Resumo das atividades: ______________________________________________

Evolução Durante a Internação
Resumo do quadro clínico inicial: ______________________________________________
Alterações observadas durante a internação — melhoras (ex.: aumento da amplitude de movimento, redução da dor): ______________________________________________
Limitações ainda presentes: ______________________________________________
Reações adversas ou complicações (se houver): ______________________________________________

Recomendações Pós-Alta
Cuidados domiciliares: ______________________________________________
Manutenção da medicação (se houver): ______________________________________________
Restrição de atividades (se aplicável): ______________________________________________
Orientações sobre manejo e exercícios em casa: ______________________________________________

Fisioterapia contínua
Indicação de continuidade (frequência e técnicas recomendadas): ______________________________________________
Locais ou profissionais indicados (se aplicável): ______________________________________________

Retorno para reavaliação
Data ou intervalo sugerido para retorno: ______________

Observações Gerais
(Anotar qualquer informação adicional relevante para o tutor, como necessidade de controle alimentar ou atenção a sinais de alerta.)
______________________________________________________________

@CLINICA_CIDADE@/@CLINICA_ESTADO@, @GERAL_DATA_EXT@


@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@
@USUARIO_CARGO@
@USUARIO_CRMV@`,
  },
  {
    nome: "Termo de responsabilidade — Hospedagem",
    corpo: `TERMO DE AUTORIZAÇÃO E RESPONSABILIDADE PARA HOSPEDAGEM DE ANIMAIS

VACINAÇÃO EM DIA: ☐ SIM   ☐ NÃO

VERMIFUGAÇÃO EM DIA: ☐ SIM   ☐ NÃO

POSSUI ALGUMA DOENÇA/CONDIÇÃO ESPECIAL? ☐ NÃO   ☐ SIM
Qual(is): ____________________________________________________________________

UTILIZA MEDICAÇÃO CONTÍNUA? ☐ NÃO   ☐ SIM
Qual(is): ____________________________________________________________________

ALIMENTAÇÃO HABITUAL: _______________________________________________________

FREQUÊNCIA: _________ vezes ao dia      QUANTIDADE: _____________________________

PERÍODO DE HOSPEDAGEM
DATA E HORA DE ENTRADA: _____/_____/_______ às _____:_____
DATA E HORA DE SAÍDA PREVISTA: _____/_____/_______ às _____:_____

TERMOS E CONDIÇÕES
Pelo presente instrumento, eu, tutor(a) responsável pelo animal acima identificado, declaro estar ciente e concordo com os seguintes termos:

1. RESPONSABILIDADE FINANCEIRA: Responsabilizo-me integralmente por todos os custos e despesas relacionados à hospedagem do meu animal, incluindo, mas não se limitando a: diárias de hospedagem, alimentação fornecida pela clínica, medicamentos, procedimentos veterinários necessários, exames, tratamentos emergenciais e quaisquer outros serviços prestados durante o período de estadia.

2. PROCEDIMENTOS EMERGENCIAIS: Autorizo a clínica veterinária a realizar todos os procedimentos veterinários que se façam necessários para preservar a saúde e o bem-estar do meu animal, incluindo procedimentos de emergência, caso não seja possível estabelecer contato prévio comigo. Estou ciente de que serei responsável pelo pagamento de todos os custos decorrentes de tais procedimentos.

3. RESPONSABILIDADE DA CLÍNICA: A clínica veterinária compromete-se a zelar pelo bem-estar do animal hospedado, fornecendo acomodações adequadas, alimentação conforme orientações fornecidas, água fresca, ambiente limpo e seguro, além de monitoramento constante de seu estado de saúde e comportamento durante todo o período de hospedagem.

4. CONDIÇÕES DE SAÚDE: Declaro que as informações sobre o estado de saúde, vacinação, alimentação e comportamento do animal fornecidas neste documento são verdadeiras e completas. Estou ciente de que a omissão de informações relevantes pode comprometer o atendimento adequado ao animal.

5. OBJETOS PESSOAIS: A clínica não se responsabiliza por objetos pessoais deixados junto ao animal (coleiras, brinquedos, cobertores, etc.) que possam ser danificados, extraviados ou destruídos pelo próprio animal, ou durante os procedimentos de limpeza e manutenção.

6. RETIRADA DO ANIMAL: Comprometo-me a retirar o animal na data e horário previstos. Caso haja atraso superior a 24 horas, sem aviso prévio, serão cobradas diárias adicionais. Declaro estar ciente de que a quitação de todos os valores devidos deverá ocorrer no momento da retirada do animal ou conforme acordado previamente com a clínica. Reconheço que o não pagamento dos valores devidos poderá resultar em cobrança judicial dos débitos, além de eventuais custas processuais e honorários advocatícios.

7. COMUNICAÇÃO: Comprometo-me a manter os telefones de contato informados sempre disponíveis e atualizados durante todo o período de hospedagem, para facilitar a comunicação em caso de necessidade.

8. BOLETINS: Os boletins serão enviados todos os dias, 2 vezes ao dia, pela manhã até as 10h e pela tarde após as 17:30h.

CONTATO DE EMERGÊNCIA (caso não seja possível contato com o tutor)
NOME: _____________________________________________________________________
TELEFONE: _______________________________  PARENTESCO: _____________________

OBSERVAÇÕES ADICIONAIS
______________________________________________________________________________
______________________________________________________________________________

@GERAL_DATA_EXT@


_________________________________________
Assinatura do Tutor Responsável
CPF: _________________________

_________________________________________
Responsável pela Clínica Veterinária
CRMV: ________________________`,
  },
  {
    nome: "Autorização de exame",
    corpo: `Autorizo a realização do(s) exame(s) __________________________________ no animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, a ser realizado pelo(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro ter sido esclarecido acerca dos possíveis riscos inerentes, durante ou após a realização do(s) citado(s) exame(s), estando o referido profissional isento de quaisquer responsabilidades decorrentes de tais riscos.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Termo de Internação e Tratamento",
    corpo: `Autorizo a realização de internação e tratamento(s) necessário(s) __________________________________ no animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, a ser realizado pelo(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro ter sido esclarecido acerca dos possíveis riscos inerentes à situação clínica do animal, bem como do(s) tratamento(s) proposto(s), estando o referido profissional isento de quaisquer responsabilidades decorrentes de tais riscos.

Observações Gerais (a serem fornecidas pelo proprietário/responsável): __________________________________

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Autorização de procedimento cirúrgico",
    corpo: `Autorizo a realização do(s) procedimento(s) cirúrgico(s) __________________________________ no animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, a ser realizado pelo(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro ter sido esclarecido acerca dos possíveis riscos inerentes, durante ou após a realização do procedimento cirúrgico citado, estando o referido profissional isento de quaisquer responsabilidades decorrentes de tais riscos.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Autorização de procedimento terapêutico",
    corpo: `Autorizo a realização do(s) procedimento(s) terapêutico(s) __________________________________ no animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, a ser realizado pelo(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro ter sido esclarecido acerca dos possíveis riscos inerentes, durante ou após a realização do(s) procedimento(s) terapêutico(s) citado(s), estando o referido profissional isento de quaisquer responsabilidades decorrentes de tais riscos.

Observações Gerais (a serem fornecidas pelo proprietário/responsável): __________________________________

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Autorização de procedimento anestésico",
    corpo: `Autorizo a realização do(s) procedimento(s) anestésico(s) necessário(s) ANESTESIA INALATÓRIA no animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, a ser realizado pelo(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro ter sido esclarecido acerca dos possíveis riscos inerentes ao(s) procedimento(s) proposto(s), estando o referido profissional isento de quaisquer responsabilidades decorrentes de tais riscos.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Autorização de tratamento continuado (sessões)",
    corpo: `Autorizo a realização do(s) procedimento(s) terapêutico(s) __________________________________ no animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, a ser realizado pelo(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro ter sido esclarecido quanto ao tratamento citado acima e me comprometo a dar continuidade conforme a orientação do veterinário, sendo de minha responsabilidade o comparecimento nas sessões agendadas.

Observações Gerais (a serem fornecidas pelo proprietário/responsável): __________________________________

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Termo de doação do animal",
    corpo: `Declaro estar ciente dos motivos que me levam à necessidade de doação do animal, reconheço que esta é a opção escolhida por mim para dar continuidade ao tratamento já que não tenho as condições necessárias para isso, portanto, autorizo a doação do animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro, ainda, que fui devidamente esclarecido(a) do método que será utilizado, assim como de que este é um processo irreversível.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Consentimento — Terapia Neural",
    corpo: `Eu, @RESPONSAVEL_NOME@, declaro que fui devidamente informado(a) pelo(a) profissional responsável sobre o procedimento denominado TERAPIA NEURAL VETERINÁRIA, seus objetivos, forma de aplicação, benefícios esperados e possíveis reações.

1. Sobre o procedimento
A Terapia Neural Veterinária consiste na aplicação de pequenas quantidades de anestésico local (geralmente procaína a 1%) em pontos específicos do corpo do animal. O objetivo é restabelecer o equilíbrio do sistema nervoso autônomo, favorecendo a autorregulação do organismo e contribuindo para o bem-estar e a melhora clínica do animal. O procedimento é realizado utilizando material estéril e descartável, garantindo a segurança e a higiene adequadas.

2. Indicações e segurança
A Terapia Neural pode ser utilizada em diversas condições clínicas, inflamatórias, dolorosas, funcionais e emocionais. É considerada uma técnica segura e sem contraindicações absolutas conhecidas, podendo ser associada a outros tratamentos veterinários convencionais ou integrativos.

Em alguns casos, podem ocorrer reações leves e transitórias, como:
- Sensibilidade momentânea no local da aplicação;
- Pequeno hematoma;
- Vômitos ou diarreias;
- Em casos em que o animal já tenha convulsões, estas podem ser desencadeadas;
- Sonolência ou relaxamento após a sessão.

Tais reações geralmente desaparecem espontaneamente e não configuram complicações, sendo importante reportá-las ao veterinário responsável @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@. Não administrar medicamentos sem autorização do veterinário.

3. Benefícios esperados
A Terapia Neural visa promover o equilíbrio do organismo e auxiliar na recuperação funcional e energética do animal. O número de sessões e a resposta terapêutica podem variar de acordo com cada caso e indivíduo.

4. Consentimento
Declaro que:
- Recebi explicações claras e compreensíveis sobre o procedimento, seus objetivos e possíveis reações;
- Tive oportunidade de fazer perguntas e todas foram respondidas satisfatoriamente;
- Estou ciente de que os resultados podem variar conforme a resposta individual de cada animal;
- Autorizo, de livre e espontânea vontade, a realização da Terapia Neural no animal sob minha responsabilidade;
- Comprometo-me a informar ao profissional qualquer alteração no estado de saúde do animal, uso de medicamentos ou intercorrência observada durante o tratamento.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


_____________________________________________
Assinatura do responsável pelo animal`,
  },
  {
    nome: "Recusa de envio de material ao laboratório",
    corpo: `Eu, @RESPONSAVEL_NOME@, portador(a) do CPF: @RESPONSAVEL_CPF@, responsável pelo animal: @ANIMAL_NOME@, espécie: @ANIMAL_ESPECIE@, raça: @ANIMAL_RACA@, sexo: @ANIMAL_SEXO@, idade: @ANIMAL_IDADE@, pelagem: @ANIMAL_PELAGEM@, declaro que fui devidamente informado(a) sobre a necessidade de envio do material biológico coletado para análise laboratorial.

No entanto, opto por não autorizar o envio do referido material ao laboratório e autorizo o seu descarte imediato, conforme orientações do(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@, @USUARIO_CRMV@.

Declaro estar ciente de que esta decisão pode interferir no diagnóstico e/ou no tratamento do animal, isentando o(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@, @USUARIO_CRMV@ e a clínica Empório do Pet, CNPJ 13.310.475/0001-26, de qualquer responsabilidade associada à ausência de análise laboratorial.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Autorização de eutanásia",
    corpo: `Declaro estar ciente dos motivos que levam à necessidade de realização da eutanásia, reconheço que esta é a opção escolhida por mim para cessar definitivamente o sofrimento e, portanto, autorizo a realização da eutanásia do animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, a ser realizado pelo(a) Médico(a) Veterinário(a) @USUARIO_NOMEPUBLICO@ @USUARIO_CRMV@.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

Declaro, ainda, que fui devidamente esclarecido(a) do método que será utilizado, assim como de que este é um processo irreversível.

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Retirada do animal sem alta",
    corpo: `Solicito retirar o animal de nome @ANIMAL_NOME@, espécie @ANIMAL_ESPECIE@, raça @ANIMAL_RACA@, sexo @ANIMAL_SEXO@, idade (real ou aproximada) @ANIMAL_IDADE@, pelagem @ANIMAL_PELAGEM@, @ANIMAL_ESTERILIZACAO@, do serviço veterinário acima citado.

Declaro estar ciente de que o mesmo não obteve alta médica, fui devidamente informado(a) de que há riscos iminentes, os quais me foram esclarecidos, e assumo inteiramente a responsabilidade por esse ato.

    Identificação do responsável pelo animal:

    Nome: @RESPONSAVEL_NOME@
    RG: @RESPONSAVEL_RG@
    CPF: @RESPONSAVEL_CPF@
    Endereço: @RESPONSAVEL_ENDERECO@
    Telefone: @RESPONSAVEL_TELEFONE@
    Email: @RESPONSAVEL_EMAIL@

@CLINICA_CIDADE@, @GERAL_DATA_EXT@


________________________________________
Assinatura do responsável pelo animal.`,
  },
  {
    nome: "Confissão de dívida — Parcelado",
    corpo: `TERMO DE CONFISSÃO DE DÍVIDA

CREDORA: Empório do Pet Comércio de Rações Ltda, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 13.310.475/0001-26, sediada na Av. Engenheiro Leal Lima Verde, nº 205, Bairro Sapiranga, na cidade de Fortaleza/CE, neste ato pelo seu representante legal;

DEVEDOR(A): @RESPONSAVEL_NOME@, Brasileiro(a), (ESTADO CIVIL), (PROFISSÃO), inscrito(a) no CPF sob o nº @RESPONSAVEL_CPF@, portador(a) da Carteira de Identidade @RESPONSAVEL_RG@, domiciliado(a) à @RESPONSAVEL_ENDERECO@, na cidade de @RESPONSAVEL_CIDADE@/@RESPONSAVEL_ESTADO@, têm, entre si, justo e contratado o seguinte, que mutuamente aceitam, mediante as cláusulas abaixo discriminadas:

CLÁUSULA PRIMEIRA – OBJETO
Neste ato o DEVEDOR declara as dívidas constituídas perante a CREDORA no valor de R$ ______________ (____________________________), contraída em __/__/____, considerando o contrato de representação comercial existente entre as partes.

CLÁUSULA SEGUNDA – FORMA DE PAGAMENTO
O pagamento da dívida ora confessada será promovido no decorrer de 06 (seis) meses, observado o valor principal confessado, considerando a continuidade do contrato de representação que as partes garantem manter, ressalvada a hipótese de rescisão justificada nos moldes daquele instrumento, e será realizado em conformidade com as seguintes condições:

Parcelamento | Vencimento | Valor
Parcela 1/6 | __/__/____ | R$ __________
Parcela 2/6 | __/__/____ | R$ __________
Parcela 3/6 | __/__/____ | R$ __________
Parcela 4/6 | __/__/____ | R$ __________
Parcela 5/6 | __/__/____ | R$ __________
Parcela 6/6 | __/__/____ | R$ __________
Total: R$ ______________

CLÁUSULA TERCEIRA – ACRÉSCIMOS
Após o pagamento fixado na cláusula segunda deste instrumento, será apurada a parcela referente aos acréscimos incidentes sobre o valor do débito ora confessado, cuja aplicação será do índice do IGP no período para a atualização monetária e juros de 1% (um por cento) ao mês, tudo de forma cumulada, observada a data de verificação do débito que as partes concordam que ocorreu em XX de XXXXXX de 20XX.

Parágrafo único: o DEVEDOR desde já autoriza a CREDORA a promover o desconto inerente das parcelas estabelecidas neste instrumento, inclusive a parcela referente aos encargos ao final do pagamento do valor principal, no valor mensal do seu comissionamento, enquanto representante comercial dos produtos da CREDORA.

CLÁUSULA QUARTA – RESCISÃO
No caso de eventual rescisão do contrato de representação, o DEVEDOR autoriza a dedução integral do valor ora confessado, tanto principal quanto os encargos e acréscimos previstos, de uma única vez no momento da rescisão do contrato respectivo.

CLÁUSULA QUINTA – INADIMPLÊNCIA
O DEVEDOR se compromete a continuar a representação dos produtos da CREDORA de forma a cumprir o objetivo da presente confissão de dívida, sendo que, caso contrário e sendo verificada a inadimplência, a dívida será declarada vencida antecipadamente com a imposição da multa de 2% (dois por cento) sobre o valor devido, além de juros de 1% (um por cento) ao mês e correção monetária de acordo com a variação do IGP, podendo inclusive ser objeto de execução judicial no caso de a inadimplência atingir 60 (sessenta) dias, com imposição de todos os ônus judiciais ao DEVEDOR.

CLÁUSULA SEXTA – QUITAÇÃO
Cumprida a obrigação mediante o pagamento da dívida, a CREDORA nada mais reclamará referente ao valor confessado ou seus acréscimos, sendo que qualquer ato de tolerância somente poderá ser interpretado como mera liberalidade das partes, não impondo qualquer inovação contratual.

CLÁUSULA SÉTIMA – CONTRATO DE REPRESENTAÇÃO
As partes declaram que nenhum critério ou aspecto da representação comercial mantida entre as partes sofrerá qualquer alteração em função da previsão contida neste instrumento, sendo mantidas inalteradas e respeitadas pelas partes, integralmente.

CLÁUSULA OITAVA – FORO
Fica eleito o foro da cidade de Fortaleza/CE para dirimir quaisquer dúvidas ou controvérsias que decorram do presente contrato.

E por estarem justos e contratados, DEVEDOR e CREDORA firmam o presente, em duas vias, perante testemunhas que também assinam, para todos os fins de direito.

Fortaleza, ____ de ______________ de 20____.


___________________________________________________
Empresa - CREDORA

___________________________________
@RESPONSAVEL_NOME@ - DEVEDOR(A)

TESTEMUNHAS:
A) Nome:              CI:              CPF:
B) Nome:              CI:              CPF:`,
  },
  {
    nome: "Confissão de dívida — À vista",
    corpo: `TERMO DE CONFISSÃO DE DÍVIDA – PAGAMENTO À VISTA

CREDORA: Empório do Pet Comércio de Rações Ltda, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 13.310.475/0001-26, sediada na Av. Engenheiro Leal Lima Verde, nº 205, Bairro Sapiranga, na cidade de Fortaleza/CE, neste ato pelo seu representante legal;

DEVEDOR(A): @RESPONSAVEL_NOME@, Brasileiro(a), (ESTADO CIVIL), (PROFISSÃO), inscrito(a) no CPF sob o nº @RESPONSAVEL_CPF@, portador(a) da Carteira de Identidade @RESPONSAVEL_RG@, domiciliado(a) à @RESPONSAVEL_ENDERECO@, na cidade de @RESPONSAVEL_CIDADE@/@RESPONSAVEL_ESTADO@, têm, entre si, justo e contratado o seguinte, que mutuamente aceitam, mediante as cláusulas abaixo discriminadas:

CLÁUSULA PRIMEIRA – OBJETO
Neste ato o DEVEDOR declara as dívidas constituídas perante a CREDORA no valor de R$ ______________ (____________________________), contraída em __/__/____, considerando o contrato de representação comercial existente entre as partes.

CLÁUSULA SEGUNDA – FORMA DE PAGAMENTO
O pagamento da dívida ora confessada será realizado à vista, em parcela única, no valor de R$ ______________ (____________________________), com vencimento na data de __/__/____.

O pagamento deverá ser efetuado por meio acordado entre as partes, sendo considerado quitado após a efetiva compensação do valor em favor da CREDORA.

CLÁUSULA TERCEIRA – ACRÉSCIMOS
Após o pagamento fixado na cláusula segunda deste instrumento, será apurada a parcela referente aos acréscimos incidentes sobre o valor do débito ora confessado, cuja aplicação será do índice do IGP no período para a atualização monetária e juros de 1% (um por cento) ao mês, tudo de forma cumulada, observada a data de verificação do débito que as partes concordam que ocorreu em XX de XXXXXX de 20XX.

Parágrafo único: o DEVEDOR desde já autoriza a CREDORA a promover o desconto inerente das parcelas estabelecidas neste instrumento, inclusive a parcela referente aos encargos ao final do pagamento do valor principal, no valor mensal do seu comissionamento, enquanto representante comercial dos produtos da CREDORA.

CLÁUSULA QUARTA – RESCISÃO
No caso de eventual rescisão do contrato de representação, o DEVEDOR autoriza a dedução integral do valor ora confessado, tanto principal quanto os encargos e acréscimos previstos, de uma única vez no momento da rescisão do contrato respectivo.

CLÁUSULA QUINTA – INADIMPLÊNCIA
O DEVEDOR se compromete a continuar a representação dos produtos da CREDORA de forma a cumprir o objetivo da presente confissão de dívida, sendo que, caso contrário e sendo verificada a inadimplência, a dívida será declarada vencida antecipadamente com a imposição da multa de 2% (dois por cento) sobre o valor devido, além de juros de 1% (um por cento) ao mês e correção monetária de acordo com a variação do IGP, podendo inclusive ser objeto de execução judicial no caso de a inadimplência atingir 60 (sessenta) dias, com imposição de todos os ônus judiciais ao DEVEDOR.

CLÁUSULA SEXTA – QUITAÇÃO
Cumprida a obrigação mediante o pagamento da dívida, a CREDORA nada mais reclamará referente ao valor confessado ou seus acréscimos, sendo que qualquer ato de tolerância somente poderá ser interpretado como mera liberalidade das partes, não impondo qualquer inovação contratual.

CLÁUSULA SÉTIMA – CONTRATO DE REPRESENTAÇÃO
As partes declaram que nenhum critério ou aspecto da representação comercial mantida entre as partes sofrerá qualquer alteração em função da previsão contida neste instrumento, sendo mantidas inalteradas e respeitadas pelas partes, integralmente.

CLÁUSULA OITAVA – FORO
Fica eleito o foro da cidade de Fortaleza/CE para dirimir quaisquer dúvidas ou controvérsias que decorram do presente contrato.

E por estarem justos e contratados, DEVEDOR e CREDORA firmam o presente, em duas vias, perante testemunhas que também assinam, para todos os fins de direito.

Fortaleza, ____ de ______________ de 20____.


___________________________________________________
Empresa - CREDORA

___________________________________
@RESPONSAVEL_NOME@ - DEVEDOR(A)

TESTEMUNHAS:
A) Nome:              CI:              CPF:
B) Nome:              CI:              CPF:`,
  },
];
