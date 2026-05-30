"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LuArrowLeft, LuPawPrint, LuVenetianMask, LuCalendar, LuUser, LuSave, LuCamera, LuLoaderCircle, LuTrash, LuFiles } from "react-icons/lu";
import toast from "react-hot-toast";

interface Tutor {
  id: string;
  name: string;
}

interface Pet {
  id?: string;
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
  documents: string[]; // IDs dos templates de documentos selecionados
  owner: string;
  tutorId?: string;
  avatar?: string;
}

interface ApiResponse {
  tutors: Tutor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function normalizeBreed(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ");
}

function parseAllergies(raw: string): string[] {
  return raw
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseWeight(raw: string): number | undefined {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function parseBirthDateToISOString(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;

  // Helper to validate and return ISO string
  const tryDate = (year: number, month: number, day: number): string | undefined => {
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return undefined;
    if (year < 1900 || year > 3000) return undefined;
    if (month < 1 || month > 12) return undefined;
    if (day < 1 || day > 31) return undefined;

    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return undefined;
    return d.toISOString();
  };

  // Remove time portion if present (e.g., "20/01/2026 10:30" or "2026-01-20T00:00:00Z")
  const datePart = s.split(/[T\s]/)[0]?.trim() || s;

  // Try ISO format first: yyyy-mm-dd / yyyy/mm/dd / yyyy.mm.dd
  const isoCal = datePart.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (isoCal) {
    const result = tryDate(Number(isoCal[1]), Number(isoCal[2]), Number(isoCal[3]));
    if (result) return result;
  }

  // Try pt-BR format: dd/mm/aaaa or dd-mm-aaaa or dd.mm.aaaa (1 or 2 digit day/month, 2 or 4 digit year)
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

  // Fallback: try native Date parsing (handles many formats)
  const fallback = new Date(s);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return undefined;
}

function formatBirthDateForInput(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

// Funções de mapeamento
const mapSpeciesToBackend = (species: string): 'CANINE' | 'FELINE' | 'BIRD' | 'RODENT' | 'REPTILE' | 'OTHER' => {
  const mapping: { [key: string]: any } = {
    'Canina': 'CANINE',
    'Felina': 'FELINE', 
    'Ave': 'BIRD',
    'Roedor': 'RODENT',
    'Réptil': 'REPTILE'
  };
  return mapping[species] || 'OTHER';
};

const mapSpeciesToFrontend = (species: string): string => {
  const mapping: { [key: string]: string } = {
    'CANINE': 'Canina',
    'FELINE': 'Felina',
    'BIRD': 'Ave',
    'RODENT': 'Roedor',
    'REPTILE': 'Réptil',
    'OTHER': 'Outro'
  };
  return mapping[species] || species;
};

const mapStatusToBackend = (status: string): 'ACTIVE' | 'INACTIVE' | 'DECEASED' | 'TRANSFERRED' => {
  const mapping: { [key: string]: any } = {
    'Ativo': 'ACTIVE',
    'Inativo': 'INACTIVE',
    'Óbito': 'DECEASED',
    'Transferido': 'TRANSFERRED'
  };
  return mapping[status] || 'ACTIVE';
};

const mapStatusToFrontend = (status: string): string => {
  const mapping: { [key: string]: string } = {
    'ACTIVE': 'Ativo',
    'INACTIVE': 'Inativo',
    'DECEASED': 'Óbito',
    'TRANSFERRED': 'Transferido'
  };
  return mapping[status] || status;
};

const mapGenderToBackend = (gender: string): 'MALE' | 'FEMALE' | 'OTHER' => {
  const mapping: { [key: string]: any } = {
    'Macho': 'MALE',
    'Fêmea': 'FEMALE',
    'Indefinido': 'OTHER'
  };
  return mapping[gender] || 'OTHER';
};

const mapGenderToFrontend = (gender: string): string => {
  const mapping: { [key: string]: string } = {
    'MALE': 'Macho',
    'FEMALE': 'Fêmea',
    'OTHER': 'Indefinido'
  };
  return mapping[gender] || gender;
};

const mapSterilizationToBackend = (sterilization: string): 'NOT_STERILIZED' | 'STERILIZED' | 'SCHEDULED' => {
  const mapping: { [key: string]: any } = {
    'Não': 'NOT_STERILIZED',
    'Sim': 'STERILIZED',
    'Agendado': 'SCHEDULED'
  };
  return mapping[sterilization] || 'NOT_STERILIZED';
};

const mapSterilizationToFrontend = (sterilization: string): string => {
  const mapping: { [key: string]: string } = {
    'NOT_STERILIZED': 'Não',
    'STERILIZED': 'Sim',
    'SCHEDULED': 'Agendado'
  };
  return mapping[sterilization] || sterilization;
};

const mapCoatToBackend = (coat: string): 'SHORT' | 'LONG' | 'SMOOTH' | 'WAVY' | 'CURLY' | 'GOLDEN' | 'BLACK' | 'WHITE' | 'BROWN' | 'MIXED' => {
  const mapping: { [key: string]: any } = {
    'Curta': 'SHORT',
    'Longa': 'LONG',
    'Lisa': 'SMOOTH',
    'Ondulada': 'WAVY',
    'Dourado': 'GOLDEN'
  };
  return mapping[coat] || 'SHORT';
};

const mapCoatToFrontend = (coat: string): string => {
  const mapping: { [key: string]: string } = {
    'SHORT': 'Curta',
    'LONG': 'Longa',
    'SMOOTH': 'Lisa',
    'WAVY': 'Ondulada',
    'CURLY': 'Encaracolada',
    'GOLDEN': 'Dourado',
    'BLACK': 'Preta',
    'WHITE': 'Branca',
    'BROWN': 'Marrom',
    'MIXED': 'Mista'
  };
  return mapping[coat] || coat;
};

// Pet vazio para fallback
const emptyPet: Pet = {
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
  owner: "",
  avatar: ""};

interface DocumentTemplate {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  category: string | null;
  updatedAt: string;
}

export default function EditPetPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;

  const [pet, setPet] = useState<Pet>(emptyPet);
  const [breedOptions, setBreedOptions] = useState<string[]>([]);
  const [newBreed, setNewBreed] = useState<string>("");
  const [breedsLoading, setBreedsLoading] = useState(false);
  const [breedsSubmitting, setBreedsSubmitting] = useState(false);
  const [breedsError, setBreedsError] = useState<string | null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'foto' | 'extras' | 'documentos'>('geral');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [docTemplates, setDocTemplates] = useState<DocumentTemplate[]>([]);
  const [docTemplatesLoading, setDocTemplatesLoading] = useState(false);
  const [docTemplatesError, setDocTemplatesError] = useState<string | null>(null);
  const [docSearch, setDocSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar raças do banco (por espécie)
  useEffect(() => {
    let cancelled = false;

    const fetchBreeds = async () => {
      try {
        setBreedsLoading(true);
        setBreedsError(null);

        const res = await fetch(`/api/breeds?species=${encodeURIComponent(pet.species)}`, { method: "GET" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar raças");
        }

        const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.breeds) ? data.breeds : [];
        const names = arr
          .map((item) => (typeof item === "string" ? item : item?.name))
          .filter((v) => typeof v === "string")
          .map((v) => normalizeBreed(v))
          .filter(Boolean);

        const unique = Array.from(new Map(names.map((b) => [b.toLowerCase(), b])).values());
        if (!cancelled) setBreedOptions(unique);
      } catch (e) {
        if (!cancelled) setBreedsError(e instanceof Error ? e.message : "Erro ao carregar raças");
      } finally {
        if (!cancelled) setBreedsLoading(false);
      }
    };

    // Se não houver espécie selecionada, limpa
    if (!pet.species) {
      setBreedOptions([]);
      setBreedsError(null);
      setBreedsLoading(false);
      return;
    }

    fetchBreeds();
    return () => {
      cancelled = true;
    };
  }, [pet.species]);

  const currentBreeds = useMemo(() => {
    const list = breedOptions || [];
    const normalized = list.map((b) => normalizeBreed(b)).filter(Boolean);
    const srd = normalized.filter((b) => b.toLowerCase() === "srd");
    const rest = normalized.filter((b) => b.toLowerCase() !== "srd").sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [...srd, ...rest];
  }, [breedOptions]);

  const breedExists = useMemo(() => {
    const key = normalizeBreed(newBreed).toLowerCase();
    if (!key) return false;
    return currentBreeds.some((b) => normalizeBreed(b).toLowerCase() === key);
  }, [currentBreeds, newBreed]);

  // Carregar pet específico e tutores
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar pet
        const petResponse = await fetch(`/api/pets/${petId}`);
        if (!petResponse.ok) {
          throw new Error(`Pet não encontrado: ${petResponse.status}`);
        }
        const petData = await petResponse.json();
        
        console.log('Dados recebidos do backend:', petData);
        
        // Mapear dados do backend para o frontend
        const mappedPetData: Pet = {
          id: petData.id,
          name: petData.name || "",
          species: mapSpeciesToFrontend(petData.species),
          breed: petData.breed || "",
          status: mapStatusToFrontend(petData.status),
          sex: mapGenderToFrontend(petData.gender),
          sterilization: mapSterilizationToFrontend(petData.sterilization),
          birthDate: petData.birthDate ? formatBirthDateForInput(petData.birthDate) : "",
          coat: mapCoatToFrontend(petData.coat),
          coatColor: petData.coatColor || "",
          weight: petData.weight ? String(petData.weight) : "",
          microchip: petData.microchip || "",
          allergies: Array.isArray(petData.allergies) ? petData.allergies.join("\n") : "",
          medicalNotes: petData.medicalNotes || "",
          observations: petData.observations || "",
          documents: Array.isArray(petData.documents) ? petData.documents : [],
          owner: petData.tutor?.name || "",
          tutorId: petData.tutorId || "",
          avatar: petData.avatar || ""};
        
        setPet(mappedPetData);

        // Carregar tutores
        const tutorsResponse = await fetch('/api/tutors');
        if (!tutorsResponse.ok) {
          throw new Error(`Erro ao carregar tutores: ${tutorsResponse.status}`);
        }
        
        const tutorsData: ApiResponse = await tutorsResponse.json();
        const tutorsArray = tutorsData.tutors || [];
        
        if (!Array.isArray(tutorsArray)) {
          console.warn('A propriedade tutors não é um array:', tutorsArray);
          setTutors([]);
          return;
        }
        
        setTutors(tutorsArray);

        console.log('Pet mapeado para frontend:', mappedPetData);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (petId) {
      fetchData();
    }
  }, [petId]);

  // Carregar templates de documentos (para selecionar no pet)
  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      try {
        setDocTemplatesLoading(true);
        setDocTemplatesError(null);

        // Por padrão, lista apenas templates publicados
        const res = await fetch('/api/documents?status=PUBLISHED');
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Erro ao carregar templates de documentos');

        const docs: DocumentTemplate[] = Array.isArray(data?.documents) ? data.documents : [];
        if (!cancelled) setDocTemplates(docs);
      } catch (e) {
        if (!cancelled) setDocTemplatesError(e instanceof Error ? e.message : 'Erro ao carregar templates de documentos');
      } finally {
        if (!cancelled) setDocTemplatesLoading(false);
      }
    };

    fetchDocs();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDocTemplates = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return docTemplates;
    return docTemplates.filter((d) => d.title?.toLowerCase().includes(q));
  }, [docTemplates, docSearch]);

  const togglePetDocument = (docId: string) => {
    setPet((prev) => {
      const has = prev.documents.includes(docId);
      return { ...prev, documents: has ? prev.documents.filter((id) => id !== docId) : [...prev.documents, docId] };
    });
  };

  // Máscara para data: formata automaticamente dd/mm/aaaa
  const formatDateMask = (value: string): string => {
    // Remove tudo que não for número
    const digits = value.replace(/\D/g, "");
    
    // Aplica a máscara dd/mm/aaaa
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'tutorId') {
      const selectedTutor = tutors.find(tutor => tutor.id === value);
      setPet(prev => ({ 
        ...prev, 
        tutorId: value,
        owner: selectedTutor ? selectedTutor.name : ""
      }));
    } else if (name === 'birthDate') {
      // Aplicar máscara de data
      const maskedValue = formatDateMask(value);
      setPet((prev) => ({ ...prev, birthDate: maskedValue }));
    } else {
      setPet((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const sanitize = <T,>(value: T) => {
        if (typeof value === 'string' && value.trim() === '') return undefined;
        return value;
      };

      const birthDateIso = pet.birthDate?.trim()
        ? parseBirthDateToISOString(pet.birthDate)
        : undefined;
      if (pet.birthDate?.trim() && !birthDateIso) {
        throw new Error("Data de nascimento inválida. Use dd/mm/aaaa.");
      }

      // Preparar dados para envio
      const petToSubmit = {
        name: pet.name,
        species: mapSpeciesToBackend(pet.species),
        breed: sanitize(pet.breed),
        status: mapStatusToBackend(pet.status),
        gender: mapGenderToBackend(pet.sex),
        sterilization: mapSterilizationToBackend(pet.sterilization),
        birthDate: birthDateIso,
        coat: sanitize(mapCoatToBackend(pet.coat)),
        coatColor: sanitize(pet.coatColor),
        weight: parseWeight(pet.weight),
        microchip: sanitize(pet.microchip),
        allergies: parseAllergies(pet.allergies),
        medicalNotes: sanitize(pet.medicalNotes),
        observations: sanitize(pet.observations),
        documents: pet.documents,
        avatar: sanitize(pet.avatar)};

      console.log('Dados enviados para backend:', petToSubmit);

      const response = await fetch(`/api/pets/${petId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(petToSubmit)});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar pet');
      }

      const updatedPet = await response.json();
      console.log("Pet atualizado com sucesso", updatedPet);
      
      toast.success('Pet atualizado com sucesso!');
      router.push('/dashboard/erp/pets');
      
    } catch (error) {
      console.error('Erro ao atualizar pet:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao atualizar pet';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const addBreedToCurrentSpecies = () => {
    const run = async () => {
      const normalized = normalizeBreed(newBreed || "");
      if (!normalized) return;
      if (breedExists) {
        setPet((prev) => ({ ...prev, breed: normalized }));
        setNewBreed("");
        return;
      }

      try {
        setBreedsSubmitting(true);
        setBreedsError(null);

        const res = await fetch("/api/breeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ species: pet.species, name: normalized })});

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Erro ao adicionar raça");
        }

        const createdName = typeof data?.name === "string" ? normalizeBreed(data.name) : normalized;
        setBreedOptions((prev) => {
          const map = new Map((prev || []).map((b) => [normalizeBreed(b).toLowerCase(), normalizeBreed(b)]));
          map.set(createdName.toLowerCase(), createdName);
          return Array.from(map.values());
        });
        setPet((prev) => ({ ...prev, breed: createdName }));
        setNewBreed("");
      } catch (e) {
        setBreedsError(e instanceof Error ? e.message : "Erro ao adicionar raça");
      } finally {
        setBreedsSubmitting(false);
      }
    };

    void run();
  };

  const openFilePicker = () => {
    if (isUploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const uploadPetAvatar = async (file: File) => {
    const maxBytes = 5 * 1024 * 1024;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > maxBytes) {
      setAvatarError("A imagem deve ter no máximo 5MB.");
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      const sigRes = await fetch("/api/cloudinary/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "petAvatar", petKey: petId })});
      const sigData = await sigRes.json().catch(() => null);
      if (!sigRes.ok) throw new Error(sigData?.error || "Erro ao preparar upload");

      const { cloudName, apiKey, timestamp, signature, folder, publicId, overwrite, invalidate } = sigData;

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", folder);
      form.append("public_id", publicId);
      form.append("overwrite", String(Boolean(overwrite)));
      form.append("invalidate", String(Boolean(invalidate)));

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form});
      const uploadData = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok) {
        const msg =
          (uploadData && typeof uploadData === "object" && "error" in uploadData && (uploadData as any).error?.message) ||
          `Falha no upload do Cloudinary (HTTP ${uploadRes.status})`;
        throw new Error(msg);
      }

      const secureUrl: string | undefined = uploadData?.secure_url;
      if (!secureUrl) throw new Error("Cloudinary não retornou a URL da imagem");

      setPet((prev) => ({ ...prev, avatar: secureUrl }));
    } catch (err) {
      console.error(err);
      setAvatarError(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadPetAvatar(file);
  };

  const removeAvatar = () => {
    setPet((prev) => ({ ...prev, avatar: "" }));
    setAvatarError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-cyan-50/10 w-full overflow-hidden">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Carregando...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !pet.name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-cyan-50/10 w-full overflow-hidden">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Erro</h2>
              <p className="text-gray-600 mb-6">{error || "Pet não encontrado"}</p>
              <Link 
                href="/dashboard/erp/pets" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all duration-300"
              >
                <LuArrowLeft className="w-4 h-4" />
                <span>Voltar para a lista</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-cyan-50/10 w-full overflow-hidden">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Editar Pet
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Edite as informações do pet no sistema
                  </p>
                </div>
                <Link 
                  href="/dashboard/erp/pets" 
                  className="group flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-semibold bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  <LuArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  <span>Voltar</span>
                </Link>
              </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-red-600 text-sm font-medium">
                  ❌ {error}
                </p>
              </div>
            )}

            {/* Main Card */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-green-500/10 overflow-hidden">
              {/* Pet Header */}
              <div className="bg-gradient-to-r from-green-600 to-cyan-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <LuPawPrint className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        {pet.name || "Editar Pet"}
                      </h1>
                      <p className="text-green-100 text-sm mt-1">
                        {pet.breed || "Raça"} • {pet.species || "Espécie"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                      <span className="text-white text-sm font-medium">{pet.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Modernizadas */}
              <div className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
                <div className="overflow-x-auto">
                  <div className="flex flex-nowrap min-w-max">
                  <button
                    onClick={() => setActiveTab('geral')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'geral'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuPawPrint className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'geral' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Geral</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('foto')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'foto'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuVenetianMask className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'foto' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Foto</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('extras')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'extras'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuUser className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'extras' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Extras</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('documentos')}
                    className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === 'documentos'
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <LuFiles className={`w-4 h-4 transition-transform duration-300 ${
                      activeTab === 'documentos' ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span>Documentos</span>
                  </button>
                  </div>
                </div>
              </div>

              {/* Form */}
              {activeTab === 'geral' && (
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Nome do Animal*
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={pet.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        placeholder="Digite o nome do pet"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Espécie*
                      </label>
                      <select
                        name="species"
                        value={pet.species}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="Canina">Canina</option>
                        <option value="Felina">Felina</option>
                        <option value="Ave">Ave</option>
                        <option value="Roedor">Roedor</option>
                        <option value="Réptil">Réptil</option>
                      </select>
                    </div>
                  </div>

                  {/* Raça e Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Raça
                      </label>
                      {/* Selector das raças existentes */}
                      <select
                        name="breed"
                        value={pet.breed}
                        onChange={handleChange}
                        disabled={breedsLoading}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Selecione...</option>
                        {currentBreeds.map((breed) => (
                          <option key={`${pet.species}:${breed}`} value={breed}>
                            {breed}
                          </option>
                        ))}
                      </select>

                      {/* Campo para cadastrar nova raça */}
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newBreed}
                          onChange={(e) => setNewBreed(e.target.value)}
                          className="flex-1 px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Nova raça (se não existir)"
                        />
                        <button
                          type="button"
                          onClick={addBreedToCurrentSpecies}
                          disabled={breedsSubmitting || breedsLoading || !normalizeBreed(newBreed || "")}
                          className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-white hover:border-gray-300/50 shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Adicionar esta raça ao banco para esta espécie"
                        >
                          {breedsSubmitting ? "Adicionando..." : "Adicionar"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {breedsLoading
                          ? "Carregando raças..."
                          : breedsError
                            ? `Erro ao carregar/adicionar raças: ${breedsError}`
                            : breedExists
                              ? "Essa raça já existe no banco. Ao adicionar, ela será apenas selecionada."
                              : "Selecione uma raça existente ou cadastre uma nova e clique em Adicionar."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Status*
                      </label>
                      <select
                        name="status"
                        value={pet.status}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Óbito">Óbito</option>
                        <option value="Transferido">Transferido</option>
                      </select>
                    </div>
                  </div>

                  {/* Sexo e Esterilização */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Sexo
                      </label>
                      <select
                        name="sex"
                        value={pet.sex}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Macho">Macho</option>
                        <option value="Fêmea">Fêmea</option>
                        <option value="Indefinido">Indefinido</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Esterilização
                      </label>
                      <select
                        name="sterilization"
                        value={pet.sterilization}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                        <option value="Agendado">Agendado</option>
                      </select>
                    </div>
                  </div>

                  {/* Nascimento e Pelagem */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuCalendar className="w-4 h-4 mr-2 text-blue-500" />
                        Data de Nascimento
                      </label>
                      <input
                        type="text"
                        name="birthDate"
                        value={pet.birthDate}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        placeholder="dd/mm/aaaa"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        Pelagem
                      </label>
                      <select
                        name="coat"
                        value={pet.coat}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Curta">Curta</option>
                        <option value="Longa">Longa</option>
                        <option value="Lisa">Lisa</option>
                        <option value="Ondulada">Ondulada</option>
                        <option value="Dourado">Dourado</option>
                      </select>
                    </div>
                  </div>

                  {/* Dono - Campo único */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <LuUser className="w-4 h-4 mr-2 text-purple-500" />
                      Dono do Animal*
                    </label>
                    {loading ? (
                      <div className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200/80 rounded-2xl text-gray-600 shadow-sm">
                        Carregando tutores...
                      </div>
                    ) : error ? (
                      <div className="w-full px-4 py-3 bg-red-50/80 border border-red-200/80 rounded-2xl text-red-600 shadow-sm">
                        Erro ao carregar tutores: {error}
                      </div>
                    ) : (
                      <select
                        name="tutorId"
                        value={pet.tutorId || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        required
                      >
                        <option value="">Selecione um tutor</option>
                        {Array.isArray(tutors) && tutors.map((tutor) => (
                          <option key={tutor.id} value={tutor.id}>
                            {tutor.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-4 mt-8 pt-8 border-t border-white/20">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-cyan-600 rounded-2xl hover:from-green-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 flex items-center space-x-2 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="relative z-10">Salvando...</span>
                        </>
                      ) : (
                        <>
                          <LuSave className="w-4 h-4 relative z-10" />
                          <span className="relative z-10">Salvar Alterações</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Outras Tabs */}
              {activeTab === 'foto' && (
                <div className="p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="relative w-40 h-40 mx-auto mb-4">
                      {pet.avatar ? (
                        <Image
                          src={pet.avatar}
                          alt={pet.name || "Foto do pet"}
                          fill
                          className="rounded-2xl object-cover ring-2 ring-white/60 shadow-lg"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <LuVenetianMask className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Foto do Pet</h3>
                    <p className="text-gray-600 mb-6">Envie uma foto e ela será salva no cadastro.</p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onAvatarFileChange}
                    />

                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={isUploadingAvatar}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isUploadingAvatar ? (
                          <LuLoaderCircle className="w-5 h-5 animate-spin" />
                        ) : (
                          <LuCamera className="w-5 h-5" />
                        )}
                        {isUploadingAvatar ? "Enviando..." : "Selecionar arquivo"}
                      </button>

                      {pet.avatar ? (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          disabled={isUploadingAvatar}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 border border-gray-200/80 text-gray-700 rounded-2xl hover:bg-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <LuTrash className="w-5 h-5" />
                          Remover
                        </button>
                      ) : null}
                    </div>

                    {avatarError ? (
                      <p className="mt-4 text-sm text-red-600">{avatarError}</p>
                    ) : null}
                  </div>
                </div>
              )}

              {activeTab === 'extras' && (
                <div className="p-8">
                  <div className="max-w-3xl mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Informações Extras</h3>
                    <p className="text-gray-600 mb-6">Campos opcionais para complementar o cadastro do pet.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Cor da Pelagem</label>
                        <input
                          type="text"
                          name="coatColor"
                          value={pet.coatColor}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Ex.: Preto e branco"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Peso (kg)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          name="weight"
                          value={pet.weight}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Ex.: 12,5"
                        />
                        <p className="text-xs text-gray-500">Aceita ponto ou vírgula.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Microchip</label>
                        <input
                          type="text"
                          name="microchip"
                          value={pet.microchip}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Número do microchip"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Alergias</label>
                        <textarea
                          name="allergies"
                          value={pet.allergies}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
                          placeholder={"Uma por linha (ou separadas por vírgula)\nEx.: Frango\nEx.: Pólen"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 mt-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Observações</label>
                        <textarea
                          name="observations"
                          value={pet.observations}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
                          placeholder="Observações gerais do pet (temperamento, cuidados, etc.)"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Notas Médicas Importantes</label>
                        <textarea
                          name="medicalNotes"
                          value={pet.medicalNotes}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm resize-none"
                          placeholder="Ex.: Faz uso contínuo de medicação X, histórico de convulsões..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documentos' && (
                <div className="p-8">
                  <div className="max-w-3xl mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Documentos</h3>
                    <p className="text-gray-600 mb-6">
                      Selecione quantos templates de documentos forem necessários para este pet.
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-700">Buscar template</label>
                        <input
                          type="text"
                          value={docSearch}
                          onChange={(e) => setDocSearch(e.target.value)}
                          placeholder="Ex.: termo, contrato, prontuário..."
                          className="mt-1 w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        />
                      </div>
                      <div className="sm:text-right pt-1">
                        <div className="text-sm font-semibold text-gray-900">
                          Selecionados: {pet.documents.length}
                        </div>
                        <Link
                          href="/dashboard/erp/documentos"
                          className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
                        >
                          Gerenciar templates
                        </Link>
                      </div>
                    </div>

                    <div className="bg-white/70 border border-gray-200/70 rounded-2xl overflow-hidden">
                      {docTemplatesLoading ? (
                        <div className="p-4 text-sm text-gray-600">Carregando templates...</div>
                      ) : docTemplatesError ? (
                        <div className="p-4 text-sm text-red-600">{docTemplatesError}</div>
                      ) : filteredDocTemplates.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">
                          Nenhum template publicado encontrado.
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {filteredDocTemplates.map((doc) => {
                            const checked = pet.documents.includes(doc.id);
                            return (
                              <li key={doc.id} className="p-4 hover:bg-gray-50/60 transition-colors">
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePetDocument(doc.id)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-900 truncate">{doc.title}</div>
                                    <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                                      {doc.category ? <span>Categoria: {doc.category}</span> : null}
                                      <span>Atualizado: {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  </div>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      Os templates selecionados serão vinculados ao pet (salvo como IDs no banco).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
