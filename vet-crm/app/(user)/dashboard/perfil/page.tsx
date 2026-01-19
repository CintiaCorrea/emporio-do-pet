'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { 
  LuUser, 
  LuMail, 
  LuPhone, 
  LuMapPin, 
  LuCalendar,
  LuPencil,
  LuCamera,
  LuShield,
  LuKey,
  LuSave,
  LuX,
  LuLoaderCircle
} from 'react-icons/lu';

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    bio: '',
  });

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '',
        address: '',
        bio: '',
      });
    }
  }, [session]);

  const userName = session?.user?.name || 'Usuário';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implementar chamada à API para atualizar perfil
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
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
              <div className="h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"></div>
              
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
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-lg">
                        {getInitials(userName)}
                      </div>
                    )}
                    <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100">
                      <LuCamera className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
                  <p className="text-gray-500 text-sm mt-1">{userEmail}</p>
                  
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      Ativo
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      <LuShield className="w-3 h-3" />
                      Administrador
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <LuCalendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Membro desde Janeiro 2024</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <LuMapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">São Paulo, Brasil</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card de segurança */}
            <div className="mt-6 bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <LuKey className="w-5 h-5 text-gray-400" />
                Segurança
              </h3>
              <button className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors text-left">
                Alterar senha
              </button>
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
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
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
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                      <LuMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                  ) : (
                    <p className="py-3 px-4 bg-gray-50 rounded-xl text-gray-900">{formData.email || '—'}</p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <LuPhone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  ) : (
                    <p className="py-3 px-4 bg-gray-50 rounded-xl text-gray-900">{formData.phone || '—'}</p>
                  )}
                </div>

                {/* Endereço */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <LuMapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="Sua cidade, estado"
                      />
                    </div>
                  ) : (
                    <p className="py-3 px-4 bg-gray-50 rounded-xl text-gray-900">{formData.address || '—'}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sobre você
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      placeholder="Conte um pouco sobre você..."
                    />
                  ) : (
                    <p className="py-3 px-4 bg-gray-50 rounded-xl text-gray-900 min-h-[100px]">
                      {formData.bio || '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-5">
                <p className="text-3xl font-bold text-gray-900">127</p>
                <p className="text-sm text-gray-500 mt-1">Atendimentos</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-5">
                <p className="text-3xl font-bold text-gray-900">48</p>
                <p className="text-sm text-gray-500 mt-1">Tutores cadastrados</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-5">
                <p className="text-3xl font-bold text-gray-900">95%</p>
                <p className="text-sm text-gray-500 mt-1">Avaliação positiva</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

