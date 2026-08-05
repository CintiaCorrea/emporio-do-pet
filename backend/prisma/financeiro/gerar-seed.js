// Gera o SQL de seed do modulo financeiro a partir do plano_de_contas.csv
// Idempotente: pode rodar de novo sem duplicar.
const fs = require('fs');

const CSV = 'D:/OneDrive/Documentos/Claude/Projects/Financeiro/plano_de_contas.csv';

// --- parser de CSV com aspas ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(f => f.trim() !== ''));
}

const q = (s) => s === null || s === undefined || s === '' ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;

const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
const header = rows.shift();

const NATUREZA = {
  'operacional': 'OPERACIONAL',
  'não operacional': 'NAO_OPERACIONAL',
  'nao operacional': 'NAO_OPERACIONAL',
  'investimento': 'INVESTIMENTO',
  'financiamento': 'FINANCIAMENTO',
};
const COMPORT = {
  'fixo': 'FIXO', 'variável': 'VARIAVEL', 'variavel': 'VARIAVEL',
  'n/a': 'NAO_APLICAVEL', '': 'NAO_APLICAVEL',
};
const TIPO = {
  'receita': 'RECEITA', 'despesa': 'DESPESA', 'transferência': 'TRANSFERENCIA', 'transferencia': 'TRANSFERENCIA',
};

const norm = (s) => (s || '').trim().toLowerCase();

const grupos = new Map(); // nome -> {ordem, tipo}
const cats = [];
for (const r of rows) {
  const [grupo, subgrupo, conta, tipo, natureza, comport] = r;
  if (!grupo || !conta) continue;
  const gnome = grupo.trim();
  if (!grupos.has(gnome)) {
    const m = gnome.match(/^(\d+)/);
    grupos.set(gnome, { ordem: m ? parseInt(m[1], 10) : 99, tipo: TIPO[norm(tipo)] || 'DESPESA' });
  }
  cats.push({
    grupo: gnome,
    subgrupo: (subgrupo || '').trim() || null,
    nome: conta.trim(),
    tipo: TIPO[norm(tipo)] || 'DESPESA',
    natureza: NATUREZA[norm(natureza)] || 'OPERACIONAL',
    comport: COMPORT[norm(comport)] || 'NAO_APLICAVEL',
  });
}

// --- Contas que faltavam no CSV (garimpadas do guia do Meu Dinheiro, aprovadas 18/07) ---
const EXTRAS = [
  { grupo: '3. Custos', subgrupo: 'Custos Variáveis', nome: 'Exames Terceirizados (Laboratório e Imagem Externos)', tipo: 'DESPESA', natureza: 'OPERACIONAL', comport: 'VARIAVEL' },
  { grupo: '4. Despesas Operacionais', subgrupo: 'Estrutura', nome: 'Seguros (Imóvel e Equipamentos)', tipo: 'DESPESA', natureza: 'OPERACIONAL', comport: 'FIXO' },
  { grupo: '4. Despesas Operacionais', subgrupo: 'Estrutura', nome: 'Limpeza e Conservação', tipo: 'DESPESA', natureza: 'OPERACIONAL', comport: 'FIXO' },
  { grupo: '5. Despesas Financeiras', subgrupo: null, nome: 'IOF', tipo: 'DESPESA', natureza: 'OPERACIONAL', comport: 'VARIAVEL' },
  { grupo: '6. Despesas Tributárias', subgrupo: null, nome: 'IRPJ / CSLL (fora do Simples)', tipo: 'DESPESA', natureza: 'OPERACIONAL', comport: 'VARIAVEL' },
  { grupo: '9. Financiamento', subgrupo: null, nome: 'Aporte de Sócios (Capital Social)', tipo: 'RECEITA', natureza: 'FINANCIAMENTO', comport: 'NAO_APLICAVEL' },
];
for (const e of EXTRAS) {
  if (!grupos.has(e.grupo)) throw new Error(`Grupo inexistente no CSV: ${e.grupo}`);
  cats.push(e);
}

const out = [];
out.push('-- Seed do modulo financeiro (gerado de plano_de_contas.csv + extras). Idempotente.');
out.push('SET client_encoding = \'UTF8\';');
out.push('BEGIN;');
out.push('');

// --- Marcas ---
out.push('-- Marcas');
for (const m of ['Empório do Pet', 'Mundo à Parte', 'Dra. Vivian Corrêa']) {
  out.push(`INSERT INTO fin_marcas (id,nome,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),${q(m)},true,now(),now()) ON CONFLICT (nome) DO NOTHING;`);
}
out.push('');

// --- Unidades ---
out.push('-- Unidades (Sede = propria; MAP HVG = parceria 65/35)');
out.push(`INSERT INTO fin_unidades (id,nome,tipo,ativo,"createdAt","updatedAt")
SELECT gen_random_uuid(),'Sede','PROPRIA',true,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM fin_unidades WHERE nome='Sede');`);
out.push(`INSERT INTO fin_unidades (id,nome,tipo,"percentualNos","marcaPadraoId",ativo,"createdAt","updatedAt")
SELECT gen_random_uuid(),'MAP HVG','PARCERIA',0.6500,(SELECT id FROM fin_marcas WHERE nome='Mundo à Parte'),true,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM fin_unidades WHERE nome='MAP HVG');`);
out.push('');

// --- Linhas de servico ---
out.push('-- Linhas de servico (centros de custo)');
const linhas = [
  'Centro Cirúrgico', 'Consultório / Ambulatório', 'Diagnóstico (Exames e Imagem)',
  'Internação / Hospital de Dia', 'Pet Shop / Farmácia', 'Fisioterapia',
  'Medicina Integrativa',
  'Comercial e Marketing', 'Financeiro e Tributário', 'Infraestrutura / Geral', 'RH',
];
linhas.forEach((l, i) => {
  out.push(`INSERT INTO fin_linhas_servico (id,nome,ordem,ativo,"createdAt","updatedAt") VALUES (gen_random_uuid(),${q(l)},${(i + 1) * 10},true,now(),now()) ON CONFLICT (nome) DO NOTHING;`);
});
out.push('');

// --- Grupos ---
out.push('-- Grupos do plano de contas');
for (const [nome, g] of grupos) {
  out.push(`INSERT INTO fin_grupos_categoria (id,ordem,nome,tipo,"createdAt","updatedAt") VALUES (gen_random_uuid(),${g.ordem},${q(nome)},'${g.tipo}',now(),now()) ON CONFLICT (nome) DO NOTHING;`);
}
out.push('');

// --- Categorias ---
out.push('-- Categorias (contas)');
cats.forEach((c, i) => {
  out.push(`INSERT INTO fin_categorias (id,nome,subgrupo,tipo,natureza,comportamento,ordem,ativo,"grupoId","createdAt","updatedAt")
SELECT gen_random_uuid(),${q(c.nome)},${q(c.subgrupo)},'${c.tipo}','${c.natureza}','${c.comport}',${(i + 1) * 10},true,g.id,now(),now()
FROM fin_grupos_categoria g WHERE g.nome=${q(c.grupo)}
ON CONFLICT ("grupoId",nome) DO NOTHING;`);
});
out.push('');
out.push('COMMIT;');

fs.writeFileSync(process.argv[2], out.join('\n'), 'utf8');
console.error(`grupos: ${grupos.size} | categorias: ${cats.length} | marcas: 3 | unidades: 2 | linhas: ${linhas.length}`);
