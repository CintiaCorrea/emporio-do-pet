'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  PageShell,
  HeaderCard,
  Card,
  Btn,
  Label,
  Input,
  Select,
  Pill,
  EmptyState,
  B44,
} from '@/components/ui/base44';
import { LISTA_PERFIS, LISTA_PERFIL_USUARIO } from '@/lib/permissions';

type Role = 'ADMIN' | 'VETERINARIAN' | 'RECEPTIONIST';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isApproved: boolean;
  isBlocked: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  VETERINARIAN: 'Veterinário(a)',
  RECEPTIONIST: 'Recepção'};

const ROLE_TONE: Record<Role, 'info' | 'neutral' | 'warn'> = {
  ADMIN: 'info',
  VETERINARIAN: 'neutral',
  RECEPTIONIST: 'warn'};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('RECEPTIONIST');
  const [submitting, setSubmitting] = useState(false);

  // C3 — perfil de acesso por usuário
  const [perfis, setPerfis] = useState<string[]>([]);           // nomes dos perfis de acesso
  const [perfilMap, setPerfilMap] = useState<Record<string, string>>({}); // userId -> perfilNome
  const [perfilItemId, setPerfilItemId] = useState<string | null>(null);  // id do item perfil_usuario (p/ PATCH)

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (e: any) {
      toast.error('Erro ao carregar usuários: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // C3 — carrega perfis de acesso e o mapa usuário→perfil de /api/listas
  const loadPerfis = async () => {
    try {
      const res = await fetch('/api/listas?includeInactive=true', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.itens || data.data || [];
      const nomes: string[] = [];
      let map: Record<string, string> = {};
      let itemId: string | null = null;
      for (const it of arr) {
        if (it.lista === LISTA_PERFIS) {
          try {
            const o = JSON.parse(it.valor);
            if (o && o.nome) nomes.push(o.nome);
          } catch {}
        } else if (it.lista === LISTA_PERFIL_USUARIO) {
          itemId = it.id;
          try {
            const o = JSON.parse(it.valor);
            map = o.map || {};
          } catch {}
        }
      }
      setPerfis(nomes);
      setPerfilMap(map);
      setPerfilItemId(itemId);
    } catch (e: any) {
      // silencioso: a tela de usuários continua funcional mesmo sem perfis
    }
  };

  useEffect(() => {
    load();
    loadPerfis();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      toast.success(`Usuário ${name} criado!`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('RECEPTIONIST');
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // C3 — troca o perfil de acesso de um usuário e persiste em /api/listas
  const handlePerfilChange = async (userId: string, novoPerfil: string) => {
    const map = { ...perfilMap };
    if (novoPerfil) map[userId] = novoPerfil;
    else delete map[userId];
    setPerfilMap(map);

    try {
      const body = JSON.stringify({ valor: JSON.stringify({ map }) });
      if (perfilItemId) {
        const res = await fetch(`/api/listas/${perfilItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        const res = await fetch('/api/listas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lista: LISTA_PERFIL_USUARIO, valor: JSON.stringify({ map }) })});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created = await res.json().catch(() => ({}));
        if (created && created.id) setPerfilItemId(created.id);
      }
      window.dispatchEvent(new Event('perms:changed'));
      toast.success('Perfil atualizado');
    } catch (e: any) {
      toast.error('Erro ao salvar perfil: ' + e.message);
    }
  };

  return (
    <PageShell pad="p-6">
      <Toaster position="top-right" />

      <HeaderCard className="flex justify-between items-center">
        <div>
          <h1 className="text-[18px] font-medium" style={{ color: B44.navy }}>Equipe</h1>
          <p className="text-[12px]" style={{ color: B44.text2 }}>Usuários com acesso ao sistema</p>
        </div>
        <Btn variant={showForm ? 'ghost' : 'primary'} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '＋ Novo usuário'}
        </Btn>
      </HeaderCard>

      {showForm && (
        <Card title="Criar novo usuário" emoji="👤" className="mb-3">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome completo</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Senha inicial</Label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="text-[11px] mt-1" style={{ color: B44.text3 }}>
                  A pessoa pode trocar depois em "Alterar senha".
                </p>
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="RECEPTIONIST">Recepção</option>
                  <option value="VETERINARIAN">Veterinário(a)</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Btn type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar usuário'}
              </Btn>
              <Btn type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Btn>
            </div>
          </form>
        </Card>
      )}

      <Card pad="0">
        {loading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : users.length === 0 ? (
          <EmptyState>Nenhum usuário cadastrado ainda.</EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${B44.lineSoft}` }}>
                    <th className="text-left py-2.5 px-4 text-[10px] font-medium uppercase tracking-wide" style={{ color: B44.text3 }}>Nome</th>
                    <th className="text-left py-2.5 px-4 text-[10px] font-medium uppercase tracking-wide" style={{ color: B44.text3 }}>E-mail</th>
                    <th className="text-left py-2.5 px-4 text-[10px] font-medium uppercase tracking-wide" style={{ color: B44.text3 }}>Papel</th>
                    <th className="text-left py-2.5 px-4 text-[10px] font-medium uppercase tracking-wide" style={{ color: B44.text3 }}>Status</th>
                    <th className="text-left py-2.5 px-4 text-[10px] font-medium uppercase tracking-wide" style={{ color: B44.text3 }}>Perfil de acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${B44.lineSoft}` }}>
                      <td className="py-2.5 px-4 font-medium" style={{ color: B44.navy }}>{u.name || '—'}</td>
                      <td className="py-2.5 px-4" style={{ color: B44.text2 }}>{u.email}</td>
                      <td className="py-2.5 px-4">
                        <Pill tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Pill>
                      </td>
                      <td className="py-2.5 px-4">
                        {u.isBlocked ? (
                          <Pill tone="danger">Bloqueado</Pill>
                        ) : u.isApproved ? (
                          <Pill tone="ok">Ativo</Pill>
                        ) : (
                          <Pill tone="warn">Pendente</Pill>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <Select
                          value={perfilMap[u.id] || ''}
                          onChange={(e) => handlePerfilChange(u.id, e.target.value)}
                          style={{ minWidth: 170 }}
                        >
                          <option value="">— (pelo cargo) —</option>
                          {perfis.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] px-4 py-2.5" style={{ color: B44.text3 }}>
              Sem perfil escolhido = usa o padrão do cargo (Admin/Vet/Recepção).
            </p>
          </>
        )}
      </Card>
    </PageShell>
  );
}
