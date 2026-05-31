export type AppRole = "ADMIN" | "VETERINARIAN" | "RECEPTIONIST";

export function normalizeRole(r?: string | null): AppRole {
  const v = (r || "").toUpperCase();
  if (v === "VETERINARIAN" || v === "VET") return "VETERINARIAN";
  if (v === "RECEPTIONIST" || v === "RECEPCAO") return "RECEPTIONIST";
  return "ADMIN";
}

export function roleLabel(r: AppRole): string {
  return r === "ADMIN" ? "Administradora" : r === "VETERINARIAN" ? "Veterinária" : "Recepção";
}

export function roleShort(r: AppRole): string {
  return r === "ADMIN" ? "Admin" : r === "VETERINARIAN" ? "Veterinário" : "Recepção";
}
