// Esta tela virou uma ABA de Configuração de vendas (17/09/2026). O endereço antigo continua
// funcionando e leva para lá — ninguém perde link salvo.
import { redirect } from "next/navigation";

export default function Pagina() {
  redirect("/dashboard/erp/configuracoes-vendas?aba=demonstrativo");
}
