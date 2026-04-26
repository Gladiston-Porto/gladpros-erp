// src/app/(dashboard)/perfil/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { UserProfile } from "@/components/profile/UserProfile";
import { useToast } from "@gladpros/ui/toast";
import { authApi } from "@/lib/api/client";

interface UserData {
  id: string;
  email: string;
  nome?: string;
  role?: string;
  status?: string;
  nomeCompleto?: string;
  telefone?: string;
  endereco1?: string;
  endereco2?: string;
  cidade?: string;
  estado?: string;
  zipcode?: string;
  avatarUrl?: string;
  dataNascimento?: string;
  createdAt: string;
  ultimoLoginEm?: string | null;
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
}

function getAvatarBg(name: string): string {
  const palette = ['bg-sky-600', 'bg-teal-600', 'bg-orange-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600'];
  return palette[name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length];
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  ADMIN:      { label: 'Administrador', className: 'bg-red-500/20 text-red-100 border border-red-400/30' },
  GERENTE:    { label: 'Gerente',       className: 'bg-teal-500/20 text-teal-100 border border-teal-400/30' },
  FINANCEIRO: { label: 'Financeiro',    className: 'bg-blue-500/20 text-blue-100 border border-blue-400/30' },
  ESTOQUE:    { label: 'Estoque',       className: 'bg-orange-500/20 text-orange-100 border border-orange-400/30' },
  USUARIO:    { label: 'Usuário',       className: 'bg-white/20 text-white border border-white/30' },
  CLIENTE:    { label: 'Cliente',       className: 'bg-purple-500/20 text-purple-100 border border-purple-400/30' },
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { success, error } = useToast();
  const router = useRouter();

  const fetchUserData = useCallback(async () => {
    try {
      const data = await authApi.getMe();
      setUser({
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
        status: data.status,
        nomeCompleto: data.nomeCompleto || data.nome || '',
        telefone: data.telefone || '',
        endereco1: data.endereco1 || '',
        endereco2: data.endereco2 || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        zipcode: data.zipcode || '',
        avatarUrl: data.avatarUrl || '',
        dataNascimento: data.dataNascimento || '',
        createdAt: data.createdAt || new Date().toISOString(),
        ultimoLoginEm: data.ultimoLoginEm ?? null,
      });
    } catch {
      error('Erro', 'Não foi possível carregar seus dados de perfil');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleUpdateProfile = async (data: Partial<UserData>) => {
    await authApi.updateMe(data as Record<string, string | null>);
    success('Salvo', 'Perfil atualizado com sucesso');
    await fetchUserData();
  };

  const handleAvatarUpload = async (file: File) => {
    const result = await authApi.uploadAvatar(file);
    setUser((prev) => (prev ? { ...prev, avatarUrl: result.avatarUrl } : prev));
    success('Foto salva', 'Sua foto de perfil foi atualizada');
    router.refresh();
  };

  /* ── Loading skeleton ─────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
        <div className="h-10 rounded-xl bg-muted animate-pulse w-full" />
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Não foi possível carregar os dados do perfil.</p>
      </div>
    );
  }

  const displayName = user.nomeCompleto || user.email;
  const initials = getInitials(displayName);
  const avatarBg = getAvatarBg(displayName);
  const roleBadge = ROLE_BADGE[user.role ?? ''] ?? ROLE_BADGE.USUARIO;
  const isActive = user.status === 'ATIVO';

  return (
    <div className="space-y-6">
      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 text-white">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/30"
              />
            ) : (
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white ring-2 ring-white/30 ${avatarBg}`}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Nome + info */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-widest opacity-60">Meu Perfil</p>
            <h1 className="mt-1 font-title text-2xl font-bold tracking-wide truncate">
              {displayName}
            </h1>
            <p className="mt-0.5 text-sm opacity-75 truncate">{user.email}</p>
            <p className="mt-1 text-sm opacity-50">
              Gerencie suas informações pessoais, foto, segurança e preferências
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {user.role && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge.className}`}
                >
                  <Shield className="h-3 w-3" />
                  {roleBadge.label}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isActive
                    ? 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-100'
                    : 'border border-red-400/30 bg-red-500/20 text-red-100'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-red-300'}`} />
                {isActive ? 'Ativo' : 'Inativo'}
              </span>
              {user.ultimoLoginEm && (
                <span className="text-xs opacity-50">
                  Último login:{' '}
                  {new Date(user.ultimoLoginEm).toLocaleDateString('en-US', {
                    timeZone: 'America/Chicago',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs de conteúdo ──────────────────────────────────── */}
      <Suspense fallback={<div className="h-96 rounded-2xl bg-muted animate-pulse" />}>
        <UserProfile
          user={user}
          onUpdate={handleUpdateProfile}
          onAvatarUpload={handleAvatarUpload}
          isLoading={isLoading}
        />
      </Suspense>
    </div>
  );
}
