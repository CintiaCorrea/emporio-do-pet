// A TELA MUDOU DE LUGAR — de Configurações para Clientes.
//
// Cintia, 15/09/2026: "transferir esse item para a aba de clientes para que as recepcionistas
// possam verificar independente de mim".
//
// Ela morava em Configurações, que a recepção não abre — então todo cadastro recebido pelo link
// público esperava a Cintia olhar. Isto aqui é só a ponte para quem tiver o endereço antigo
// salvo ou anotado.
import { redirect } from "next/navigation";

export default function CadastrosRecebidosMudouDeLugar() {
  redirect("/dashboard/erp/cadastros-recebidos");
}
