// Busca de endereço por CEP (ViaCEP — grátis, sem chave). Retorna null se inválido/não encontrado.
export type CepInfo = { logradouro: string; bairro: string; localidade: string; uf: string };

export async function buscarCep(cepRaw: string): Promise<CepInfo | null> {
  const cep = (cepRaw || "").replace(/\D/g, "");
  if (cep.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || d.erro) return null;
    return {
      logradouro: d.logradouro || "",
      bairro: d.bairro || "",
      localidade: d.localidade || "",
      uf: d.uf || "",
    };
  } catch {
    return null;
  }
}
