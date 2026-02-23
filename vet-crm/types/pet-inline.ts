export interface PetInline {
  id?: string;
  tempId: string;
  name: string;
  species: string;
  breed: string;
  status: string;
  sex: string;
  sterilization: string;
  birthDate: string;
  coat: string;
  coatColor: string;
  weight: string;
  microchip: string;
  allergies: string;
  medicalNotes: string;
  observations: string;
  documents: string[];
  avatar?: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export const emptyPetInline = (): PetInline => ({
  tempId: `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  name: "",
  species: "Canina",
  breed: "",
  status: "Ativo",
  sex: "",
  sterilization: "",
  birthDate: "",
  coat: "",
  coatColor: "",
  weight: "",
  microchip: "",
  allergies: "",
  medicalNotes: "",
  observations: "",
  documents: [],
  avatar: "",
  isNew: true,
});

export function normalizeBreed(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ");
}

export function parseAllergies(raw: string): string[] {
  return raw
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseWeight(raw: string): number | undefined {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export function parseBirthDateToISOString(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;

  const tryDate = (year: number, month: number, day: number): string | undefined => {
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return undefined;
    if (year < 1900 || year > 3000) return undefined;
    if (month < 1 || month > 12) return undefined;
    if (day < 1 || day > 31) return undefined;

    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return undefined;
    return d.toISOString();
  };

  const datePart = s.split(/[T\s]/)[0]?.trim() || s;

  const isoCal = datePart.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (isoCal) {
    const result = tryDate(Number(isoCal[1]), Number(isoCal[2]), Number(isoCal[3]));
    if (result) return result;
  }

  const normalized = datePart.replace(/[.\-]/g, "/").replace(/\s+/g, "");
  const br = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    let year = Number(br[3]);
    if (br[3].length === 2) {
      year = year <= 49 ? 2000 + year : 1900 + year;
    }
    const result = tryDate(year, month, day);
    if (result) return result;
  }

  const fallback = new Date(s);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return undefined;
}

export function formatDateMask(value: string): string {
  const digits = value.replace(/\D/g, "");
  
  if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
}

export function formatISOToDisplay(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}
