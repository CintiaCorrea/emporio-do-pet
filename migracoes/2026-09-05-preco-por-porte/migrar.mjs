import fs from 'fs';
const DIR = 'C:/Users/cinti/AppData/Local/Temp/claude/C--Users-cinti/1ee06c9a-6c0e-4dc6-828b-40c5b137bb82/scratchpad';
const linhas = fs.readFileSync(`${DIR}/g2.txt`, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);

// SÓ MIGRA O QUE O SISTEMA REALMENTE DIZ.
// A Cintia: "pode seguir com a importação como está no sistema, os que não constarem quando e
// se precisarmos preenchemos". Então só entra cadastro com o PESO ESCRITO no nome. Item que só
// diz "P"/"M"/"G" fica de fora: deduzir que "G" é 20-30 kg seria eu inventando faixa de preço.
const RE_ACIMA = /ACIMA\s*DE\s*(\d+)\s*KG?\b/;
const RE_ENTRE = /(?:AT[EÉ]\s*)?(\d+)\s*(?:A|-)\s*(\d+)\s*KG?\b/;
const RE_ATE   = /AT[EÉ]\s*(\d+)\s*KG?\b/;
const RE_SO_N  = /\b(\d+)\s*KG?\b/;

function faixaDoNome(nome) {
  const N = nome.toUpperCase().replace(/\s+/g, ' ');
  let m;
  if ((m = N.match(RE_ACIMA))) return { ate: null, de: Number(m[1]), trecho: m[0] };
  if ((m = N.match(RE_ENTRE))) return { ate: Number(m[2]), de: Number(m[1]), trecho: m[0] };
  if ((m = N.match(RE_ATE)))   return { ate: Number(m[1]), de: 0, trecho: m[0] };
  if ((m = N.match(RE_SO_N)))  return { ate: Number(m[1]), de: 0, trecho: m[0] };
  return null;
}
// Tira o pedaço do peso do nome, preservando o resto (inclusive o "(PLANTAO)").
function nomeSemPeso(nome) {
  let s = nome;
  for (const re of [RE_ACIMA, RE_ENTRE, RE_ATE, RE_SO_N]) {
    const m = s.toUpperCase().match(re);
    if (m) { const i = s.toUpperCase().indexOf(m[0]); s = s.slice(0, i) + s.slice(i + m[0].length); break; }
  }
  return s.replace(/\s*-\s*(?=\(|$)/g, ' ').replace(/-\s*$/, '').replace(/\s{2,}/g, ' ').replace(/\s+([,)])/g, '$1').trim().replace(/[-–]\s*$/, '').trim();
}
const rotulo = (f) => (f.ate == null ? `acima de ${f.de} kg` : f.de === 0 ? `0 a ${f.ate} kg` : `${f.de} a ${f.ate} kg`);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const sql = [];
const migrados = [], deFora = [];

for (const l of linhas) {
  const [grupo, raiz, , , itensRaw] = l.split('§');
  const itens = itensRaw.split('¦').map((x) => {
    const [codigo, nome, preco] = x.split('~');
    return { codigo: Number(codigo), nome, preco: Number(preco), f: faixaDoNome(nome) };
  });
  const comPeso = itens.filter((i) => i.f);
  const semPeso = itens.filter((i) => !i.f);

  if (comPeso.length < 2) { deFora.push({ grupo, raiz, motivo: 'nenhum cadastro traz o peso escrito no nome', itens }); continue; }
  const limites = comPeso.map((i) => String(i.f.ate));
  if (new Set(limites).size !== limites.length) { deFora.push({ grupo, raiz, motivo: 'dois cadastros cairiam na MESMA faixa — provavelmente não são o mesmo item', itens: comPeso }); continue; }

  comPeso.sort((a, b) => (a.f.ate == null ? Infinity : a.f.ate) - (b.f.ate == null ? Infinity : b.f.ate));
  // As faixas precisam ENCOSTAR: o "de" de cada uma é o "até" da anterior, e não o que estava
  // escrito no nome. Sem isso a Tartarectomia ficaria com "0 a 5 kg" e "0 a 10 kg" — duas
  // faixas dizendo cobrir o mesmo cão de 3 kg.
  const faixas = [];
  let anterior = 0;
  if (comPeso[0].f.de > 0) {
    // O item NÃO cobre os mais leves — a Fluidoterapia começa em 10 kg. Uma faixa em branco na
    // frente diz isso, em vez de esticar o primeiro preço pra baixo e cobrar a mais de quem
    // hoje não paga nada. Preço em branco = "não vendemos para esse porte".
    faixas.push({ ate: comPeso[0].f.de, rotulo: `0 a ${comPeso[0].f.de} kg`, preco: null });
    anterior = comPeso[0].f.de;
  }
  for (const i of comPeso) {
    const rot = i.f.ate == null
      ? `acima de ${anterior} kg`
      : anterior === 0 ? `0 a ${i.f.ate} kg` : `${anterior} a ${i.f.ate} kg`;
    faixas.push({ ate: i.f.ate, rotulo: rot, preco: i.preco });
    if (i.f.ate != null) anterior = i.f.ate;
  }

  // A ÚLTIMA FAIXA PRECISA SER ABERTA, senão um animal acima do teto não cai em faixa nenhuma
  // e a tela diz "peso não cadastrado" — mentira, o peso está lá; o que falta é o preço.
  // Sem preço, ela avisa "não vendemos para esse porte", que é a verdade. A Cintia preenche depois.
  let acrescentouTeto = false;
  if (faixas[faixas.length - 1].ate != null) {
    const teto = faixas[faixas.length - 1].ate;
    faixas.push({ ate: null, rotulo: `acima de ${teto} kg`, preco: null });
    acrescentouTeto = true;
  }

  const fica = comPeso[0];
  const nomeNovo = nomeSemPeso(fica.nome);
  const arquivar = comPeso.slice(1).map((i) => i.codigo);

  sql.push(`update cat_itens set nome=${q(nomeNovo)}, "precosPorte"=${q(JSON.stringify(faixas))}, preco=${faixas[0].preco}, "updatedAt"=now() where codigo=${fica.codigo};`);
  if (arquivar.length) sql.push(`update cat_itens set arquivado=true, ativo=false, "updatedAt"=now() where codigo in (${arquivar.join(',')});`);

  migrados.push({ grupo, nomeNovo, fica: fica.codigo, arquivados: arquivar.length, faixas: faixas.length, semTeto: acrescentouTeto, sobraram: semPeso.map((i) => i.nome) });
}

fs.writeFileSync(`${DIR}/migrar.sql`, `begin;\n${sql.join('\n')}\ncommit;\n`);
fs.writeFileSync(`${DIR}/migrar-relatorio.json`, JSON.stringify({ migrados, deFora }, null, 1));

console.log(`MIGRA ${migrados.length} grupos · ${migrados.reduce((s, m) => s + m.arquivados, 0)} cadastros arquivados`);
console.log(`SEM TETO (faixa "acima de" criada em branco): ${migrados.filter((m) => m.semTeto).length}`);
console.log(`SOBRAM SOZINHOS (peso não escrito no nome): ${migrados.reduce((s, m) => s + m.sobraram.length, 0)}`);
console.log(`FICAM COMO ESTAO: ${deFora.length} grupos`);
console.log('\n--- amostra do que vai virar ---');
for (const m of migrados.slice(0, 8)) console.log(`  #${m.fica} ${m.nomeNovo} · ${m.faixas} faixas · arquiva ${m.arquivados}`);
console.log('\n--- ficam como estao ---');
for (const d of deFora) console.log(`  [${d.grupo}] ${d.raiz} — ${d.motivo}`);
