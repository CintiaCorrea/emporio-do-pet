// Busca o pet COMPLETO (o MESMO objeto da ficha, /api/pets/:id) para o cabeçalho do timbrado sair
// CHEIO — peso, sexo, idade, pelagem, raça, espécie + nome/CPF/endereço do tutor — igual à receita.
// Padrão único de cabeçalho pedido pela Cintia: todo documento (receita, orçamento, comanda) completo.
export async function carregarPetTutorParaImpressao(
  petId?: string,
  fallbackPet?: any,
  fallbackTutor?: any,
): Promise<{ pet: any; tutor: any }> {
  if (petId) {
    try {
      const full = await fetch(`/api/pets/${petId}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
      if (full && (full.id || full.name)) return { pet: full, tutor: full.tutor ?? fallbackTutor };
    } catch { /* rede — usa o fallback */ }
  }
  return { pet: fallbackPet, tutor: fallbackTutor };
}
