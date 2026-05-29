'use client';

import Link from 'next/link';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { 
  LuUser, 
  LuCalendar,
  LuPencil,
  LuCamera,
  LuSave,
  LuX,
  LuLoaderCircle
} from 'react-icons/lu';

type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image?: string | null;
  isApproved?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ProfileStats = {
  tutorsTotal?: number;
  petsTotal?: number;
  appointmentsTotal?: number;
};

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: '',
    email: ''});

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const load = async () => {
      setIsLoadingProfile(true);
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Erro ao carregar perfil');

        const p = data as UserProfile;
        setProfile(p);
        setFormData({
          name: p.name || '',
          email: p.email || ''});
        setAvatarUrl(p.image || undefined);

        // Stats (real)
        const [tutorsRes, petsRes, appointmentsRes] = await Promise.all([
          fetch('/api/tutors?page=1&limit=1'),
          fetch('/api/pets?page=1&limit=1'),
          fetch('/api/appointments?page=1&limit=1'),
        ]);

        const [tutorsData, petsData, appointmentsData] = await Promise.all([
          tutorsRes.json().catch(() => null),
          petsRes.json().catch(() => null),
          appointmentsRes.json().catch(() => null),
        ]);

        setStats({
          tutorsTotal: tutorsRes.ok ? tutorsData?.pagination?.total : undefined,
          petsTotal: petsRes.ok ? petsData?.pagination?.total : undefined,
          appointmentsTotal: appointmentsRes.ok ? appointmentsData?.pagination?.total : undefined});
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    load();
  }, [session]);

  const userName = profile?.name || formData.name || session?.user?.name || 'Usuário';
  const userEmail = profile?.email || formData.email || session?.user?.email || '';
  const userImage = avatarUrl || profile?.image || session?.user?.image;

  const roleLabel = (() => {
    const role = (profile?.role || session?.user?.role || '').toUpperCase();
    if (role === 'ADMIN') return 'Administrador';
    if (role === 'VETERINARIAN') return 'Veterinário';
    if (role === 'RECEPTIONIST') return 'Recepcionista';
    return role || '—';
  })();

  const statusLabel = (() => {
    if (profile?.isBlocked) return { text: 'Bloqueado', className: 'bg-red-50 text-red-700' };
    if (profile?.isApproved === false) return { text: 'Pendente', className: 'bg-orange-50 text-orange-700' };
    return { text: 'Ativo', className: 'bg-cyan-50 text-cyan-700' };
  })();

  const memberSince = (() => {
    const createdAt = profile?.createdAt;
    if (!createdAt) return '—';
    try {
      return new Date(createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return '—';
    }
  })();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const openFilePicker = () => {
    if (isUploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const uploadAvatar = async (file: File) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }

    // Basic validation
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > maxBytes) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    const toastId = toast.loading('Enviando avatar...');

    try {
      // 1) get signed params
      const sigRes = await fetch('/api/cloudinary/signature', { method: 'POST' });
      const sigData = await sigRes.json();
      if (!sigRes.ok) throw new Error(sigData?.error || 'Erro ao preparar upload');

      const { cloudName, apiKey, timestamp, signature, folder, publicId, overwrite, invalidate } = sigData;

      // 2) upload to cloudinary
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', folder);
      form.append('public_id', publicId);
      form.append('overwrite', String(Boolean(overwrite)));
      form.append('invalidate', String(Boolean(invalidate)));

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form});
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        const msg =
          (uploadData && typeof uploadData === 'object' && 'error' in uploadData && (uploadData as any).error?.message) ||
          `Falha no upload do Cloudinary (HTTP ${uploadRes.status})`;
        throw new Error(msg);
      }

      const secureUrl: string | undefined = uploadData?.secure_url;
      if (!secureUrl) throw new Error('Cloudinary não retornou a URL da imagem');

      // Optimistic UI
      setAvatarUrl(secureUrl);

      // 3) persist to backend user.image via proxy
      const patchRes = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: secureUrl })});
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData?.error || 'Erro ao salvar avatar no usuário');

      // 4) update next-auth session (so Topbar updates immediately)
      await update({ image: secureUrl } as any);

      toast.success('Avatar atualizado!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar avatar', { id: toastId });
      // rollback optimistic if needed
      setAvatarUrl(session?.user?.image || undefined);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // allow re-select same file later
    e.target.value = '';
    if (!file) return;
    await uploadAvatar(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Sessão inválida. Faça login novamente.');

      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email })});
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao salvar perfil');

      setProfile((prev) => (prev ? { ...prev, name: data?.name ?? prev.name, email: data?.email ?? prev.email } : prev));
      await update({ name: formData.name, email: formData.email } as any);
      toast.success('Perfil atualizado!');
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-1">Gerencie suas informações pessoais</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Card do perfil principal */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 overflow-hidden">
              {/* Banner */}
              <div className="h-24 bg-gradient-to-br from-cyan-500 via-orange-500 to-rose-500"></div>
              
              {/* Avatar e info */}
              <div className="px-6 pb-6">
                <div className="relative -mt-12 mb-4">
                  <div className="relative w-24 h-24 mx-auto">
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={userName}
                        fill
                        className="rounded-2xl object-cover ring-4 ring-white shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-lg">
                        {getInitials(userName)}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onAvatarFileChange}
                    />
                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={isUploadingAvatar}
                      className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Alterar avatar"
                    >
                      {isUploadingAvatar ? (
                        <LuLoaderCircle className="w-4 h-4 text-gray-600 animate-spin" />
                      ) : (
                        <LuCamera className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
                  <p className="text-gray-500 text-sm mt-1">{userEmail}</p>
                  
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${statusLabel.className}`}>
                      <span className="w-1.5 h-1.5 bg-current rounded-full opacity-70"></span>
                      {statusLabel.text}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-700 text-xs font-medium rounded-full">
                      <span style={{fontSize:"14px"}}>🛡</span>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <LuCalendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Membro desde {memberSince}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card de segurança */}
            <div className="mt-6 bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span style={{fontSize:"14px"}}>🔑</span>
                Segurança
              </h3>
              <Link href="/change-password" className="block w-full py-3 px-4 bg-gray-50 hover:bg-cyan-50 hover:text-cyan-700 rounded-xl text-sm font-medium text-gray-700 transition-colors text-left">
                Alterar senha
              </Link>
              <button className="w-full mt-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors text-left">
                Autenticação de dois fatores
              </button>
            </div>
          </div>

          {/* Formulário de edição */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors"
                  >
                    <LuPencil className="w-4 h-4" />
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <LuX className="w-4 h-4" />
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <LuLoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <LuSave className="w-4 h-4" />
                      )}
                      Salvar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome completo
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <LuUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                        placeholder="Seu nome"
                      />
                    </div>
                  ) : (
                    <p className="py-3 px-4 bg-gray-50 rounded-xl text-gray-900">{formData.name || '—'}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                  ) : (
                    <p className="py-3 px-4 bg-gray-50 rounded-xl text-gray-900">{formData.email || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-5">
                <p className="text-3xl font-bold text-gray-900">
                  {typeof stats.appointmentsTotal === 'number' ? stats.appointmentsTotal.toLocaleString('pt-BR') : '—'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Agendamentos</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-5">
                <p className="text-3xl font-bold text-gray-900">
                  {typeof stats.tutorsTotal === 'number' ? stats.tutorsTotal.toLocaleString('pt-BR') : '—'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Tutores cadastrados</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-5">
                <p className="text-3xl font-bold text-gray-900">
                  {typeof stats.petsTotal === 'number' ? stats.petsTotal.toLocaleString('pt-BR') : '—'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Pets cadastrados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

