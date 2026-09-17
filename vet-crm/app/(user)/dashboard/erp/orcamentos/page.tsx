// A LISTA DE ORÇAMENTOS MORA NA CONSULTA DE VENDAS (Cintia, 17/09/2026: tudo num lugar só, sem
// várias abas sobre o mesmo assunto). O endereço antigo continua funcionando e leva para lá —
// é o mesmo caminho que "Vendas em aberto" e "Todas as vendas" seguiram em 17/09.
import { redirect } from "next/navigation";

export default function OrcamentosPage() {
  redirect("/dashboard/erp/consulta-vendas?modo=orcamentos");
}
