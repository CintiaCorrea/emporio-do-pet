import { redirect } from "next/navigation";

// "VENDAS EM ABERTO" SAIU DO AR (Cintia, 17/09/2026: "Pode tirar"). Estava fora do menu e tudo o que
// fazia já existe em Vendas: o filtro "Em aberto" e receber várias de uma vez, na gaveta única.
// Cada mudança em vendas precisava ser consertada aqui também.
//
// O endereço redireciona em vez de sumir: quem tiver a página salva chega em Vendas.
export default function VendasEmAbertoRedirect() {
  redirect("/dashboard/erp/consulta-vendas");
}
