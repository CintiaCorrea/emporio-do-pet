/**
 * Teste da tela Internação (Fatia 4A).
 * Garante o que o tutor VÊ e, principalmente, o que ele NÃO pode ver.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalInternacaoService } = require('../../dist/modules/portal/portal-internacao.service');

const internacao = new PortalInternacaoService(prisma);

const MARCA = '[TESTE-INTERNACAO]';
const dias = (n) => new Date(Date.now() + n * 24 * 60 * 60_000);
const ID = Date.now();
const APT = `teste-int-${ID}`;

async function limpar() {
  const tutores = await prisma.tutor.findMany({
    where: { name: { startsWith: MARCA } },
    select: { id: true },
  });
  const ids = tutores.map((t) => t.id);
  await prisma.listaItem.deleteMany({
    where: { lista: { in: [`intboletim_hist_${APT}`, `intbol_${APT}`] } },
  });
  if (!ids.length) return;
  await prisma.boxOcupacao.deleteMany({ where: { appointmentId: APT } });
  await prisma.box.deleteMany({ where: { codigo: `T${ID}` } });
  await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE "tutorId" = ANY($1::text[])`, ids);
  await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  await limpar();

  const vet = await prisma.user.findFirst({ select: { id: true } });
  if (!vet) {
    console.log('Sem usuario no banco local — nao da para criar a internacao.');
    return;
  }

  const tutor = await prisma.tutor.create({ data: { name: `${MARCA} Cintia` } });
  const thor = await prisma.pet.create({
    data: { tutorId: tutor.id, name: 'Thor', species: 'CANINE', status: 'ACTIVE' },
  });
  const mel = await prisma.pet.create({
    data: { tutorId: tutor.id, name: 'Mel', species: 'FELINE', status: 'ACTIVE' },
  });

  console.log('\n1) Pet que NAO esta internado');
  const semNada = await internacao.doPet(mel.id);
  checa('responde "nao internado"', semNada.internado === false);
  checa('sem boletim nenhum', semNada.boletins.length === 0);
  checa('sem baia', semNada.baia === null);

  // --- internacao ativa + baia --------------------------------------------
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, status, notes, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
    APT, tutor.id, thor.id, vet.id, dias(-2), 'IN_PROGRESS',
    JSON.stringify({ type: 'HOSPITALIZATION', dailyRate: 100, priority: 'HIGH', estimatedDischargeDate: dias(1).toISOString() }),
  );
  const box = await prisma.box.create({
    data: { codigo: `T${ID}`, nome: '4', tipo: 'CANINO', ativa: true },
  });
  await prisma.boxOcupacao.create({
    data: { boxId: box.id, appointmentId: APT, ativa: true },
  });

  // Boletins ENVIADOS (o que o tutor recebeu)
  await prisma.listaItem.createMany({
    data: [
      {
        lista: `intboletim_hist_${APT}`,
        valor: JSON.stringify({
          at: dias(-2).toISOString(), horario: 'noite',
          texto: 'Entrada, exames coletados, monitorado', por: 'Dra. Vivian', status: 'sent',
        }),
      },
      {
        lista: `intboletim_hist_${APT}`,
        valor: JSON.stringify({
          at: dias(-1).toISOString(), horario: 'manha',
          texto: 'Iniciada fluidoterapia, apetite parcial', auto: true, status: 'sent',
        }),
      },
      {
        lista: `intboletim_hist_${APT}`,
        valor: JSON.stringify({
          at: new Date().toISOString(), horario: 'manha',
          texto: 'Thor passou bem a noite. Se alimentou pela manha, sem vomitos.',
          por: 'Dra. Vivian', status: 'sent',
        }),
      },
      // lixo: nao pode derrubar a tela
      { lista: `intboletim_hist_${APT}`, valor: 'isso-nao-e-json' },
      { lista: `intboletim_hist_${APT}`, valor: JSON.stringify({ at: new Date().toISOString(), texto: '   ' }) },
    ],
  });

  // Boletins PROGRAMADOS — planejamento interno, o tutor NAO pode ver
  await prisma.listaItem.create({
    data: {
      lista: `intbol_${APT}`,
      valor: JSON.stringify({ horario: '08:00', modelo: 'resumo', interno: 'nao mostrar ao tutor' }),
    },
  });

  console.log('\n2) Pet internado');
  const r = await internacao.doPet(thor.id);
  checa('reconhece a internacao', r.internado === true);
  checa('mostra desde quando', !!r.desde);
  checa('mostra a baia', r.baia === '4', String(r.baia));
  checa('traz a previsao de alta', !!r.previsaoAlta);

  console.log('\n3) Boletins');
  checa('mostra os 3 boletins validos', r.boletins.length === 3, String(r.boletins.length));
  checa('o mais recente vem primeiro', r.boletins[0].texto.startsWith('Thor passou bem'));
  checa('traz o turno', r.boletins[0].turno === 'manha');
  checa('mostra quem assinou', r.boletins[0].porQuem === 'Dra. Vivian');
  checa(
    'boletim automatico nao expoe "robo"',
    r.boletins.find((b) => b.texto.includes('fluidoterapia')).porQuem === null,
  );
  checa('boletim vazio e ignorado', !r.boletins.some((b) => !b.texto.trim()));
  checa(
    'boletim PROGRAMADO nao vaza pro tutor',
    !r.boletins.some((b) => b.texto.includes('nao mostrar ao tutor')),
  );

  console.log('\n4) Depois da alta');
  await prisma.$executeRawUnsafe(
    `UPDATE "Appointment" SET notes = $1 WHERE id = $2`,
    JSON.stringify({
      type: 'HOSPITALIZATION', dailyRate: 100, priority: 'HIGH',
      actualDischargeDate: new Date().toISOString(),
    }),
    APT,
  );
  const depois = await internacao.doPet(thor.id);
  checa('some da tela quando tem alta', depois.internado === false);
  checa('e nao mostra mais os boletins', depois.boletins.length === 0);
}

main().catch(erroFatal).finally(() => fim(limpar));
