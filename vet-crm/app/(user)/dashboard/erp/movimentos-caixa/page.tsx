import { redirect } from "next/navigation";

// ESTA TELA FOI ABSORVIDA PELO CAIXA (Cintia, 09/09/2026: "movimento de caixa = caixa, pode
// passar tudo do caixa para movimento de caixa e eliminar caixa como ele é hoje").
//
// Havia duas entradas de menu para o mesmo assunto: a tela completa (lista de caixas, detalhe,
// conferência, papel) e esta, de 120 linhas, que só listava suprimento/sangria/despesa — coisa
// que a outra já mostrava dentro do dia. Ficou a completa, com o nome que ela usa: "Movimento
// de caixa".
//
// O endereço não foi apagado, redirecionado: quem tiver esta página salva no navegador continua
// chegando onde precisa, em vez de bater num 404 e achar que o sistema perdeu a tela.
export default function MovimentosDeCaixaRedirect() {
  redirect("/dashboard/erp/caixa");
}
