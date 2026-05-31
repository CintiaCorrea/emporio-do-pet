// Normaliza species/status que vêm em PT do banco real ou em enum EN
export function speciesLabel(s?: string | null): string {
  if (!s) return "—";
  const k = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (k.match(/\b(cao|cachorro|canin|dog)/)) return "Cão";
  if (k.match(/\b(gat|felin|cat)/)) return "Gato";
  if (k.match(/\b(passaro|bird|ave)/)) return "Pássaro";
  if (k.match(/\b(roedor|rodent)/)) return "Roedor";
  if (k.match(/\b(reptil|reptile)/)) return "Réptil";
  if (k.match(/\b(peixe|fish)/)) return "Peixe";
  return s;
}

export function speciesKey(s?: string | null): string {
  if (!s) return "OTHER";
  const k = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (k.match(/\b(cao|cachorro|canin|dog)/)) return "CANINE";
  if (k.match(/\b(gat|felin|cat)/)) return "FELINE";
  if (k.match(/\b(passaro|bird|ave)/)) return "BIRD";
  if (k.match(/\b(roedor|rodent)/)) return "RODENT";
  if (k.match(/\b(reptil|reptile)/)) return "REPTILE";
  if (k.match(/\b(peixe|fish)/)) return "FISH";
  return "OTHER";
}

export function statusLabel(s?: string | null): { label: string; dot: string } {
  if (!s) return { label: "—", dot: "#94A3B8" };
  const k = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (k === "active" || k === "ativo")        return { label: "Ativo", dot: "#22C55E" };
  if (k === "inactive" || k === "inativo")    return { label: "Inativo", dot: "#94A3B8" };
  if (k === "deceased" || k === "falecido")   return { label: "Falecido", dot: "#6B7280" };
  if (k === "transferred" || k === "transferido") return { label: "Transferido", dot: "#F59E0B" };
  return { label: s, dot: "#94A3B8" };
}

export function genderLabel(g?: string | null): string {
  if (!g) return "—";
  const k = g.toLowerCase();
  if (k === "male" || k === "macho") return "Macho";
  if (k === "female" || k === "fêmea" || k === "femea") return "Fêmea";
  return g;
}

export function ageFromBirth(b?: string | null): string {
  if (!b) return "—";
  const d = new Date(b);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let anos = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) anos--;
  if (anos < 1) {
    const meses = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    return `${Math.max(0, meses)} mes${meses !== 1 ? "es" : ""}`;
  }
  return `${anos} ano${anos !== 1 ? "s" : ""}`;
}
