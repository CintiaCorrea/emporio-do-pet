-- Seed do modulo financeiro (gerado de plano_de_contas.csv + extras). Idempotente.
SET client_encoding = 'UTF8';
BEGIN;

-- Marcas
INSERT INTO fin_marcas (id,nome,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Empório do Pet',true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_marcas (id,nome,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Mundo à Parte',true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_marcas (id,nome,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Dra. Vivian Corrêa',true,now(),now()) ON CONFLICT (nome) DO NOTHING;

-- Unidades (Sede = propria; MAP HVG = parceria 65/35)
INSERT INTO fin_unidades (id,nome,tipo,ativo,"createdAt","updatedAt")
SELECT gen_random_uuid(),'Sede','PROPRIA',true,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM fin_unidades WHERE nome='Sede');
INSERT INTO fin_unidades (id,nome,tipo,"percentualNos","marcaPadraoId",ativo,"createdAt","updatedAt")
SELECT gen_random_uuid(),'MAP HVG','PARCERIA',0.6500,(SELECT id FROM fin_marcas WHERE nome='Mundo à Parte'),true,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM fin_unidades WHERE nome='MAP HVG');

-- Linhas de servico (centros de custo)
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Centro Cirúrgico',10,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Consultório / Ambulatório',20,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Diagnóstico (Exames e Imagem)',30,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Internação / Hospital de Dia',40,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Pet Shop / Farmácia',50,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Fisioterapia',60,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Medicina Integrativa',70,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Comercial e Marketing',80,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Financeiro e Tributário',90,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'Infraestrutura / Geral',100,true,now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),'RH',110,true,now(),now()) ON CONFLICT (nome) DO NOTHING;

-- Grupos do plano de contas
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),1,'1. Receita Operacional','RECEITA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),2,'2. Deduções de Vendas','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),3,'3. Custos','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),4,'4. Despesas Operacionais','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),5,'5. Despesas Financeiras','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),6,'6. Despesas Tributárias','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),7,'7. Resultado Não Operacional','RECEITA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),8,'8. Investimentos (Capex)','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),9,'9. Financiamento','RECEITA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),10,'10. Distribuição de Lucros','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;
INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),11,'11. Ajustes / Controle','DESPESA',now(),now()) ON CONFLICT (nome) DO NOTHING;

-- Categorias (contas)
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Receita de Serviços e Vendas',NULL,'RECEITA','OPERACIONAL','NAO_APLICAVEL',10,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='1. Receita Operacional'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'(-) Descontos Concedidos',NULL,'DESPESA','OPERACIONAL','VARIAVEL',20,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='1. Receita Operacional'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Devoluções',NULL,'DESPESA','OPERACIONAL','VARIAVEL',30,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='2. Deduções de Vendas'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Taxa Operadora de Cartão',NULL,'DESPESA','OPERACIONAL','VARIAVEL',40,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='2. Deduções de Vendas'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Taxa de Antecipação',NULL,'DESPESA','OPERACIONAL','VARIAVEL',50,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='2. Deduções de Vendas'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Taxa de Aluguel da Maquininha',NULL,'DESPESA','OPERACIONAL','FIXO',60,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='2. Deduções de Vendas'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Taxa de Pix',NULL,'DESPESA','OPERACIONAL','VARIAVEL',70,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='2. Deduções de Vendas'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Comissões','Custos Fixos','DESPESA','OPERACIONAL','FIXO',80,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='3. Custos'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Mão de Obra Direta','Custos Fixos','DESPESA','OPERACIONAL','FIXO',90,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='3. Custos'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Royalties / Franquia','Custos Fixos','DESPESA','OPERACIONAL','FIXO',100,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='3. Custos'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Fornecedores de Produtos','Custos Variáveis','DESPESA','OPERACIONAL','VARIAVEL',110,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='3. Custos'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Custo do Serviço Vendido (CSV)','Custos Variáveis','DESPESA','OPERACIONAL','VARIAVEL',120,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='3. Custos'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Comercial e Marketing','Administrativas','DESPESA','OPERACIONAL','FIXO',130,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Consultoria','Administrativas','DESPESA','OPERACIONAL','FIXO',140,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Contabilidade','Administrativas','DESPESA','OPERACIONAL','FIXO',150,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Jurídico','Administrativas','DESPESA','OPERACIONAL','FIXO',160,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Material de Expediente','Administrativas','DESPESA','OPERACIONAL','FIXO',170,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Softwares e Assinaturas','Administrativas','DESPESA','OPERACIONAL','FIXO',180,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Taxa de Resíduos','Administrativas','DESPESA','OPERACIONAL','FIXO',190,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Outras Despesas Administrativas','Administrativas','DESPESA','OPERACIONAL','FIXO',200,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Água e Esgoto','Estrutura','DESPESA','OPERACIONAL','FIXO',210,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Energia Elétrica','Estrutura','DESPESA','OPERACIONAL','FIXO',220,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Aluguel + IPTU do Imóvel','Estrutura','DESPESA','OPERACIONAL','FIXO',230,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Manutenção Predial','Estrutura','DESPESA','OPERACIONAL','FIXO',240,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Manutenção de Equipamentos','Estrutura','DESPESA','OPERACIONAL','FIXO',250,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Informática (Sistemas e Sites)','Estrutura','DESPESA','OPERACIONAL','FIXO',260,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Telefone e Internet','Estrutura','DESPESA','OPERACIONAL','FIXO',270,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Segurança','Estrutura','DESPESA','OPERACIONAL','FIXO',280,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Veículos (Todos os Gastos)','Estrutura','DESPESA','OPERACIONAL','FIXO',290,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Salários','Pessoal','DESPESA','OPERACIONAL','FIXO',300,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Pró-labore','Pessoal','DESPESA','OPERACIONAL','FIXO',310,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Mão de Obra Área de Apoio','Pessoal','DESPESA','OPERACIONAL','FIXO',320,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'FGTS','Pessoal','DESPESA','OPERACIONAL','FIXO',330,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'INSS','Pessoal','DESPESA','OPERACIONAL','FIXO',340,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Benefícios (VT/VR/Assistência)','Pessoal','DESPESA','OPERACIONAL','FIXO',350,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Férias e 13º Salário','Pessoal','DESPESA','OPERACIONAL','FIXO',360,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Rescisão','Pessoal','DESPESA','OPERACIONAL','FIXO',370,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Cursos e Treinamentos','Pessoal','DESPESA','OPERACIONAL','FIXO',380,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Outras Despesas com Pessoal','Pessoal','DESPESA','OPERACIONAL','FIXO',390,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Juros',NULL,'DESPESA','OPERACIONAL','FIXO',400,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='5. Despesas Financeiras'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Multas',NULL,'DESPESA','OPERACIONAL','FIXO',410,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='5. Despesas Financeiras'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Taxas e Tarifas Bancárias',NULL,'DESPESA','OPERACIONAL','FIXO',420,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='5. Despesas Financeiras'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Outras Despesas Financeiras',NULL,'DESPESA','OPERACIONAL','FIXO',430,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='5. Despesas Financeiras'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Simples Nacional',NULL,'DESPESA','OPERACIONAL','VARIAVEL',440,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='6. Despesas Tributárias'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Impostos Atrasados',NULL,'DESPESA','OPERACIONAL','FIXO',450,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='6. Despesas Tributárias'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Sindicatos / Contribuições',NULL,'DESPESA','OPERACIONAL','FIXO',460,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='6. Despesas Tributárias'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Outros Tributos',NULL,'DESPESA','OPERACIONAL','FIXO',470,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='6. Despesas Tributárias'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Rendimentos de Aplicações',NULL,'RECEITA','NAO_OPERACIONAL','NAO_APLICAVEL',480,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='7. Resultado Não Operacional'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Descontos Financeiros Obtidos',NULL,'RECEITA','NAO_OPERACIONAL','NAO_APLICAVEL',490,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='7. Resultado Não Operacional'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Outras Receitas/Despesas Não Operacionais',NULL,'DESPESA','NAO_OPERACIONAL','NAO_APLICAVEL',500,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='7. Resultado Não Operacional'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Aquisição de Equipamentos',NULL,'DESPESA','INVESTIMENTO','NAO_APLICAVEL',510,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='8. Investimentos (Capex)'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Aquisição de Imobilizado',NULL,'DESPESA','INVESTIMENTO','NAO_APLICAVEL',520,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='8. Investimentos (Capex)'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Aquisição de Móveis e Utensílios',NULL,'DESPESA','INVESTIMENTO','NAO_APLICAVEL',530,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='8. Investimentos (Capex)'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Aplicação Financeira (aporte)',NULL,'DESPESA','INVESTIMENTO','NAO_APLICAVEL',540,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='8. Investimentos (Capex)'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Aquisição de Empréstimo (entrada)',NULL,'RECEITA','FINANCIAMENTO','NAO_APLICAVEL',550,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='9. Financiamento'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Pagamento de Empréstimo (principal)',NULL,'DESPESA','FINANCIAMENTO','NAO_APLICAVEL',560,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='9. Financiamento'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Empréstimo Interno (Sede → Unidade)',NULL,'TRANSFERENCIA','FINANCIAMENTO','NAO_APLICAVEL',570,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='9. Financiamento'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Distribuição de Lucros',NULL,'DESPESA','NAO_OPERACIONAL','NAO_APLICAVEL',580,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='10. Distribuição de Lucros'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Retirada de Lucro',NULL,'DESPESA','NAO_OPERACIONAL','NAO_APLICAVEL',590,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='10. Distribuição de Lucros'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Ajuste de Saldo',NULL,'DESPESA','NAO_OPERACIONAL','NAO_APLICAVEL',600,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='11. Ajustes / Controle'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Adiantamento de Clientes',NULL,'RECEITA','NAO_OPERACIONAL','NAO_APLICAVEL',610,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='11. Ajustes / Controle'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Exames Terceirizados (Laboratório e Imagem Externos)','Custos Variáveis','DESPESA','OPERACIONAL','VARIAVEL',620,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='3. Custos'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Seguros (Imóvel e Equipamentos)','Estrutura','DESPESA','OPERACIONAL','FIXO',630,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Limpeza e Conservação','Estrutura','DESPESA','OPERACIONAL','FIXO',640,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='4. Despesas Operacionais'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'IOF',NULL,'DESPESA','OPERACIONAL','VARIAVEL',650,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='5. Despesas Financeiras'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'IRPJ / CSLL (fora do Simples)',NULL,'DESPESA','OPERACIONAL','VARIAVEL',660,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='6. Despesas Tributárias'
ON CONFLICT ("grupoId",nome) DO NOTHING;
INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),'Aporte de Sócios (Capital Social)',NULL,'RECEITA','FINANCIAMENTO','NAO_APLICAVEL',670,true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome='9. Financiamento'
ON CONFLICT ("grupoId",nome) DO NOTHING;

COMMIT;