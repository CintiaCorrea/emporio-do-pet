/**
 * Roda todos os testes do Portal do Tutor em sequencia e mostra um placar unico.
 *
 * Antes de rodar: `npm run build` (os testes usam o backend compilado em dist/).
 * Uso: node scripts/portal/rodar-todos.js
 */
const { execFileSync } = require('child_process');
const path = require('path');

const TESTES = [
  ['1-acesso.js', 'Acesso (login por telefone + cofre)'],
  ['2-ficha.js', 'Início + Minha ficha (com histórico)'],
  ['3-saude.js', 'Saúde, Peso e Fisioterapia'],
  ['4-whatsapp.js', 'Envio do código pelo WhatsApp'],
];

let quebrou = 0;

for (const [arquivo, titulo] of TESTES) {
  console.log(`\n\n########## ${titulo} ##########`);
  try {
    execFileSync(process.execPath, [path.join(__dirname, arquivo)], { stdio: 'inherit' });
  } catch {
    quebrou++;
  }
}

console.log(
  quebrou
    ? `\n\n❌ ${quebrou} de ${TESTES.length} blocos com falha — ver acima.`
    : `\n\n✅ Os ${TESTES.length} blocos passaram.`,
);
process.exit(quebrou ? 1 : 0);
