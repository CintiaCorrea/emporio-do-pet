import { redirect } from "next/navigation";
// [EMP-COWORK] tela antiga de cadastro congelada -> usa a nossa tela/modal (Cintia 07/06)
export default function Page() {
  redirect("/dashboard/crm/leads");
}
