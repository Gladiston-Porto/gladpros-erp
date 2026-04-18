// src/app/(dashboard)/perfil/page.tsx
'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/components/profile/UserProfile";
import { SessionsList } from "@/components/profile/SessionsList";
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
}

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
        createdAt: data.createdAt || new Date().toISOString()
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
    setUser(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : prev);
    success('Foto salva', 'Sua foto de perfil foi atualizada');
    // Atualiza o cabeçalho (Server Component do layout relê o usuário)
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Não foi possível carregar os dados do perfil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <UserProfile
          user={user}
          onUpdate={handleUpdateProfile}
          onAvatarUpload={handleAvatarUpload}
          isLoading={isLoading}
        />
        
        <SessionsList userId={user.id} />
      </div>
    </div>
  );
}
