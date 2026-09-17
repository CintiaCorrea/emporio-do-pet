import { redirect } from "next/navigation";

// "TODAS AS VENDAS" (a tela antiga) SAIU DO AR (Cintia, 17/09/2026: "Pode tirar"). Estava fora do
// menu; procurar venda é na tela Vendas (Consulta de vendas), que já filtra, recebe e apaga pelo
// caminho único.
//
// O endereço redireciona em vez de sumir: quem tiver a página salva chega em Vendas.
export default function TodasAsVendasRedirect() {
  redirect("/dashboard/erp/consulta-vendas");
}
