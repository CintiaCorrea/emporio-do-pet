import { redirect } from "next/navigation";

// Endereço antigo — redireciona pro novo, mais simpático.
export default function CadastroRedirect() {
  redirect("/queremos-te-conhecer");
}
