/**
 * Teste das regras do agendamento online (Fatia 4B.1) — o painel da equipe.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalAgendaRegrasService } = require('../../dist/modules/portal/portal-agenda-regras.service');

const regras = new PortalAgendaRegrasService(prisma);

const ID = Date.now();
const TIPO_A = `TESTE_CONSULTA_${ID}`;
const TIPO_B = `TESTE_FISIO_${ID}`;
const PROF = `[TESTE-REGRAS] Dra. Teste`;

/**
 * A configuracao e uma LINHA SO (id 'unico') e sobrevive entre execucoes.
 * Guardamos a de verdade, testamos em cima de uma limpa e devolvemos a original
 * no fim — senao o teste estraga a configuracao de quem estiver usando o local.
 */
let configOriginal = null;

/** Apaga so os dados de teste. */
async function limparDados() {
  await prisma.portalAgendaServico.deleteMany({ where: { tipo: { in: [TIPO_A, TIPO_B] } } });
  await prisma.listaItem.deleteMany({
    where: { lista: { in: ['atendimento_tipo', 'agenda_avulsa'] }, valor: { contains: String(ID) } },
  });
  await prisma.profissional.deleteMany({ where: { nomeCompleto: PROF } });
  await prisma.portalAgendaConfig.deleteMany({ where: { id: 'unico' } });
}

/** No fim: devolve a configuracao que existia antes do teste. */
async function limpar() {
  await limparDados();
  if (configOriginal) {
    await prisma.portalAgendaConfig.create({ data: configOriginal });
    configOriginal = null;
  }
}

async function main() {
  configOriginal = await prisma.portalAgendaConfig.findUnique({ where: { id: 'unico' } });
  await limparDados();

  // Cenario: 2 tipos de atendimento + 1 profissional + 1 sala (agenda avulsa)
  await prisma.listaItem.createMany({
    data: [
      { lista: 'atendimento_tipo', valor: JSON.stringify({ v: TIPO_A, l: 'Consulta de teste' }), ordem: 900 },
      { lista: 'atendimento_tipo', valor: JSON.stringify({ v: TIPO_B, l: 'Fisio de teste' }), ordem: 901 },
    ],
  });
  const prof = await prisma.profissional.create({
    data: { nomeCompleto: PROF, nomeExibicao: 'Dra. Teste', ativo: true },
  });
  const sala = await prisma.listaItem.create({
    data: {
      lista: 'agenda_avulsa',
      valor: JSON.stringify({ id: `sala-${ID}`, nome: `MAP Teste ${ID}`, grupo: 'Sala MAP', ativo: true }),
    },
  });
  const salaId = `sala-${ID}`;

  console.log('\n1) Primeira vez que a tela abre');
  const t1 = await regras.paraTela();
  checa('cria a configuracao sozinha', !!t1.config);
  checa('nasce DESLIGADO (nada aberto ao cliente sem querer)', t1.config.ativo === false);
  checa('tem padrao de antecedencia', t1.config.antecedenciaMinHoras === 12, String(t1.config.antecedenciaMinHoras));
  checa('tem padrao de prazo p/ desmarcar', t1.config.prazoCancelarHoras === 24);
  checa('ja vem com mensagem pro cliente travado', !!t1.config.mensagemTravado);

  console.log('\n2) A lista de servicos vem dos Tipos de atendimento');
  const meus = t1.servicos.filter((s) => s.tipo === TIPO_A || s.tipo === TIPO_B);
  checa('os 2 tipos novos aparecem sozinhos', meus.length === 2, String(meus.length));
  checa('todo servico novo nasce desligado', meus.every((s) => s.ativo === false));
  checa('usa o nome que a equipe deu', meus.some((s) => s.rotulo === 'Consulta de teste'));

  console.log('\n3) As agendas disponiveis');
  const temProf = t1.agendas.some((a) => a.id === prof.id && a.origem === 'profissional');
  const temSala = t1.agendas.find((a) => a.id === salaId);
  checa('lista o profissional ativo', temProf);
  checa('lista a sala/agenda avulsa', !!temSala);
  checa('sabe que a sala e sala', temSala && temSala.origem === 'sala');
  checa('traz o grupo da sala', temSala && temSala.grupo === 'Sala MAP');

  console.log('\n4) Salvando o que a equipe escolheu');
  await regras.salvar(
    {
      config: {
        ativo: true,
        antecedenciaMinHoras: 6,
        janelaDias: 45,
        prazoCancelarHoras: 12,
        maxPorDia: 3,
        desmarcacoesParaTaxa: 2,
        taxaCentavos: 5000,
        mensagemTravado: 'Fale com a gente 💬',
      },
      servicos: [
        { tipo: TIPO_A, ativo: true, duracaoMin: 30, agendas: [prof.id], restricao: 'TODOS' },
        { tipo: TIPO_B, ativo: true, duracaoMin: 50, agendas: [salaId], restricao: 'TEM_PACOTE' },
      ],
    },
    'Cintia',
  );

  const t2 = await regras.paraTela();
  checa('ligou o agendamento online', t2.config.ativo === true);
  checa('guardou a antecedencia', t2.config.antecedenciaMinHoras === 6);
  checa('guardou a taxa em centavos', t2.config.taxaCentavos === 5000);
  checa('guardou quem mexeu', t2.config.atualizadoPor === 'Cintia');
  const fisio = t2.servicos.find((s) => s.tipo === TIPO_B);
  checa('guardou a duracao do servico', fisio.duracaoMin === 50);
  checa('guardou a sala escolhida', fisio.agendas.length === 1 && fisio.agendas[0] === salaId);
  checa('guardou a restricao', fisio.restricao === 'TEM_PACOTE');

  console.log('\n5) Travas contra regra impossivel');
  let erro1 = false;
  try {
    await regras.salvar({ config: { janelaDias: 0 } });
  } catch {
    erro1 = true;
  }
  checa('nao aceita janela de 0 dia', erro1);

  let erro2 = false;
  try {
    await regras.salvar({ servicos: [{ tipo: TIPO_A, ativo: true, duracaoMin: 1, agendas: [prof.id] }] });
  } catch {
    erro2 = true;
  }
  checa('nao aceita atendimento de 1 minuto', erro2);

  let erro3 = false;
  try {
    await regras.salvar({ servicos: [{ tipo: TIPO_A, ativo: true, duracaoMin: 30, agendas: [] }] });
  } catch {
    erro3 = true;
  }
  checa('nao libera servico sem agenda nenhuma', erro3);

  await regras.salvar({
    servicos: [{ tipo: TIPO_A, ativo: true, duracaoMin: 30, agendas: [prof.id, 'agenda-que-nao-existe'] }],
  });
  const t3 = await regras.paraTela();
  const consulta = t3.servicos.find((s) => s.tipo === TIPO_A);
  checa('descarta agenda inexistente', consulta.agendas.length === 1 && consulta.agendas[0] === prof.id);

  await regras.salvar({ servicos: [{ tipo: 'TIPO_QUE_NAO_EXISTE', ativo: true, agendas: [prof.id] }] });
  const inventado = await prisma.portalAgendaServico.findUnique({ where: { tipo: 'TIPO_QUE_NAO_EXISTE' } });
  checa('ignora servico que nao existe na lista da equipe', inventado === null);

  console.log('\n6) A regra continua valendo depois de recarregar');
  const t4 = await regras.paraTela();
  checa('nada se perde entre uma abertura e outra', t4.config.taxaCentavos === 5000 && t4.config.ativo === true);
}

main().catch(erroFatal).finally(() => fim(limpar));
