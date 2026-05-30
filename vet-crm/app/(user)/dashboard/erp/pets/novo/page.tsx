"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LuArrowLeft, LuPawPrint, LuVenetianMask, LuCalendar, LuUser, LuSave, LuCamera, LuLoaderCircle, LuTrash, LuFiles } from "react-icons/lu";
import toast from "react-hot-toast";

interface Tutor {
  id: string;
  name: string;
  // outros campos do tutor se necessário
}

interface Pet {
  id? (() => null) : string;
  name: string;
  species: string;
  breed: string;
  status: string;
  sex: string;
  sterilization: string;
  birthDate: string;
  coat: string;
  coatColor: string;
  weight: string; // armazenar como string para input controlado; converter no submit
  microchip: string;
  allergies: string; // uma por linha; converter no submit
  medicalNotes: string;
  observations: string;
  documents: string[]; // IDs dos templates de documentos selecionados
  owner: string;
  tutorId? (() => null) : string; // Adicionando campo para vincular ao tutor
  avatar? (() => null) : string; // URL da foto (Cloudinary)
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

// Pet vazio para criação
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

interface ApiResponse {
  tutors: Tutor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function NewPetPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTutorId = searchParams.get('tutorId');
  const [pet, setPet] = useState<Pet>(() => ({
    ...emptyPet,
    ...(preselectedTutorId ? { tutorId: preselectedTutorId } : {})}));
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
  const petKeyRef = useRef<string>("");
  if (!petKeyRef.current) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = (globalThis as any).crypto;
      if (c && typeof c.randomUUID === "function") {
        petKeyRef.current = c.randomUUID();
      }
    } catch {
      // ignore
    }
    if (!petKeyRef.current) {
      petKeyRef.current = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

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
    // Ordena só para UX, mantendo SRD no topo quando existir
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

  // Carregar tutores da API
  useEffect(() => {
    const fetchTutors = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/tutors');
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar tutores: ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        
        // Acessar a propriedade tutors do objeto de resposta
        const tutorsArray = data.tutors || [];
        
        if (!Array.isArray(tutorsArray)) {
          console.warn('A propriedade tutors não é um array:', tutorsArray);
          setTutors([]);
          return;
        }
        
        setTutors(tutorsArray);

        if (preselectedTutorId) {
          const matched = tutorsArray.find((t: Tutor) => t.id === preselectedTutorId);
          if (matched) {
            setPet(prev => ({ ...prev, tutorId: preselectedTutorId, owner: matched.name }));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar tutores:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
        setTutors([]); // Garantir que tutors seja um array vazio em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, []);

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
      // Quando o tutor é alterado, atualizar tanto o tutorId quanto o nome do owner
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

      // Preparar dados para envio (sem o campo owner que não existe no backend)
      const petToSubmit = {
        ...pet,
        owner: undefined,
        tutorId: sanitize(pet.tutorId),
        breed: sanitize(pet.breed),
        coat: sanitize(pet.coat),
        coatColor: sanitize(pet.coatColor),
        microchip: sanitize(pet.microchip),
        observations: sanitize(pet.observations),
        avatar: sanitize(pet.avatar),
        weight: parseWeight(pet.weight),
        allergies: parseAllergies(pet.allergies),
        medicalNotes: sanitize(pet.medicalNotes),
        documents: pet.documents,
        birthDate: birthDateIso};

      // Enviar dados do novo pet para a API
      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(petToSubmit)});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar pet');
      }

      const newPet = await response.json();
      console.log("Pet criado com sucesso", newPet);
      
      // Feedback de sucesso e redirecionamento
      toast.success('Pet cadastrado com sucesso!');
      router.push('/dashboard/erp/pets');
      
    } catch (error) {
      console.error('Erro ao criar pet:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao criar pet';
      setError(message);
      toast.error(message);
      // Aqui você pode adicionar feedback de erro mais elaborado para o usuário
    } finally {
      setSubmitting(false);
    }
  };

  const addBreedToCurrentSpecies = () => {
    const run = async () => {
      const normalized = normalizeBreed(newBreed || "");
      if (!normalized) return;
      if (breedExists) {
        // Se já existe, apenas seleciona e limpa o campo
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
        // Seleciona a raça recém-criada e limpa o campo
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
    // Basic validation
    const maxBytes = 5 * 1024 * 1024; // 5MB
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
      // 1) get signed params
      const sigRes = await fetch("/api/cloudinary/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "petAvatar", petKey: petKeyRef.current })});
      const sigData = await sigRes.json().catch(() => null);
      if (!sigRes.ok) throw new Error(sigData?.error || "Erro ao preparar upload");

      const { cloudName, apiKey, timestamp, signature, folder, publicId, overwrite, invalidate } = sigData;

      // 2) upload to cloudinary
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
    // allow re-select same file later
    e.target.value = "";
    if (!file) return;
    await uploadPetAvatar(file);
  };

  const removeAvatar = () => {
    setPet((prev) => ({ ...prev, avatar: "" }));
    setAvatarError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-cyan-50/10 w-full overflow-hidden">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Novo Pet
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Cadastre um novo pet no sistema
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
              {/* Pet Header - Simplificado para criação */}
              <div className="bg-gradient-to-r from-green-600 to-cyan-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <LuPawPrint className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        {pet.name || "Novo Pet"}
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
                          <span className="relative z-10">Cadastrando...</span>
                        </>
                      ) : (
                        <>
                          <LuSave className="w-4 h-4 relative z-10" />
                          <span className="relative z-10">Cadastrar Pet</span>
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

export default function NewPetPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <NewPetPageContent />
    </Suspense>
  );
}
