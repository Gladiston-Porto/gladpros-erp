// src/components/profile/UserProfile.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Settings, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@gladpros/ui/tabs";
import { useToast } from "@gladpros/ui/toast";
import { AvatarUpload } from './AvatarUpload';
import { authApi } from '@/lib/api/client';

interface UserProfileData {
  id: string;
  email: string;
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

interface UserProfileProps {
  user: UserProfileData;
  onUpdate: (data: Partial<UserProfileData>) => Promise<void>;
  onAvatarUpload?: (file: File) => Promise<void>;
  isLoading?: boolean;
}

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return '';
}

function displayToIso(display: string): string {
  const m = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1]}-${m[2]}`;
  return '';
}

function SecurityTab() {
  const { success, error } = useToast();

  const [pwForm, setPwForm] = useState({ senhaAtual: '', novaSenha: '', confirmacao: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwShow, setPwShow] = useState({ atual: false, nova: false, conf: false });

  const [pinForm, setPinForm] = useState({ senhaAtual: '', novoPIN: '' });
  const [pinSaving, setPinSaving] = useState(false);

  const [sqForm, setSqForm] = useState({ senhaAtual: '', perguntaSecreta: '', respostaSecreta: '' });
  const [sqSaving, setSqSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (pwForm.novaSenha !== pwForm.confirmacao) { error('Erro', 'As senhas não coincidem'); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword(pwForm.senhaAtual, pwForm.novaSenha);
      success('Senha alterada', 'Sua senha foi alterada com sucesso');
      setPwForm({ senhaAtual: '', novaSenha: '', confirmacao: '' });
    } catch (err) {
      error('Erro', (err as Error).message || 'Erro ao alterar senha');
    } finally { setPwSaving(false); }
  };

  const handlePinChange = async () => {
    setPinSaving(true);
    try {
      await authApi.changePin(pinForm.senhaAtual, pinForm.novoPIN);
      success('PIN alterado', 'Seu PIN de segurança foi alterado com sucesso');
      setPinForm({ senhaAtual: '', novoPIN: '' });
    } catch (err) {
      error('Erro', (err as Error).message || 'Erro ao alterar PIN');
    } finally { setPinSaving(false); }
  };

  const handleSecurityChange = async () => {
    setSqSaving(true);
    try {
      await authApi.changeSecurityQuestion(sqForm.senhaAtual, sqForm.perguntaSecreta, sqForm.respostaSecreta);
      success('Atualizado', 'Pergunta de segurança atualizada');
      setSqForm({ senhaAtual: '', perguntaSecreta: '', respostaSecreta: '' });
    } catch (err) {
      error('Erro', (err as Error).message || 'Erro ao atualizar pergunta');
    } finally { setSqSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" />Alterar Senha</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senhaAtual">Senha Atual</Label>
            <div className="relative">
              <Input id="senhaAtual" type={pwShow.atual ? 'text' : 'password'} value={pwForm.senhaAtual} onChange={e => setPwForm(p => ({ ...p, senhaAtual: e.target.value }))} placeholder="Digite sua senha atual" className="pr-10" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setPwShow(p => ({ ...p, atual: !p.atual }))} aria-label="Mostrar/ocultar senha atual">
                {pwShow.atual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <div className="relative">
                <Input id="novaSenha" type={pwShow.nova ? 'text' : 'password'} value={pwForm.novaSenha} onChange={e => setPwForm(p => ({ ...p, novaSenha: e.target.value }))} placeholder="Mín. 8 chars, 1 maiúscula, 1 número" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setPwShow(p => ({ ...p, nova: !p.nova }))} aria-label="Mostrar/ocultar nova senha">
                  {pwShow.nova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmacaoSenha">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input id="confirmacaoSenha" type={pwShow.conf ? 'text' : 'password'} value={pwForm.confirmacao} onChange={e => setPwForm(p => ({ ...p, confirmacao: e.target.value }))} placeholder="Repita a nova senha" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setPwShow(p => ({ ...p, conf: !p.conf }))} aria-label="Mostrar/ocultar confirmação">
                  {pwShow.conf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePasswordChange} disabled={pwSaving || !pwForm.senhaAtual || !pwForm.novaSenha || !pwForm.confirmacao}>
              {pwSaving ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" />PIN de Segurança</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">O PIN de 4 dígitos é usado para desbloquear sua conta.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senhaParaPin">Senha Atual</Label>
              <Input id="senhaParaPin" type="password" value={pinForm.senhaAtual} onChange={e => setPinForm(p => ({ ...p, senhaAtual: e.target.value }))} placeholder="Confirme sua senha" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novoPIN">Novo PIN (4 dígitos)</Label>
              <Input id="novoPIN" type="password" value={pinForm.novoPIN} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPinForm(p => ({ ...p, novoPIN: v })); }} placeholder="0000" maxLength={4} inputMode="numeric" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePinChange} disabled={pinSaving || !pinForm.senhaAtual || pinForm.novoPIN.length !== 4}>
              {pinSaving ? 'Alterando...' : 'Alterar PIN'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" />Pergunta de Segurança</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Usada para recuperação de conta caso você esqueça sua senha ou PIN.</p>
          <div className="space-y-2">
            <Label htmlFor="senhaParaSQ">Senha Atual</Label>
            <Input id="senhaParaSQ" type="password" value={sqForm.senhaAtual} onChange={e => setSqForm(p => ({ ...p, senhaAtual: e.target.value }))} placeholder="Confirme sua senha" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perguntaSecreta">Pergunta Secreta</Label>
            <Input id="perguntaSecreta" value={sqForm.perguntaSecreta} onChange={e => setSqForm(p => ({ ...p, perguntaSecreta: e.target.value }))} placeholder="Ex: Qual o nome do seu primeiro animal de estimação?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="respostaSecreta">Resposta</Label>
            <Input id="respostaSecreta" value={sqForm.respostaSecreta} onChange={e => setSqForm(p => ({ ...p, respostaSecreta: e.target.value }))} placeholder="Sua resposta" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSecurityChange} disabled={sqSaving || !sqForm.senhaAtual || !sqForm.perguntaSecreta || !sqForm.respostaSecreta}>
              {sqSaving ? 'Salvando...' : 'Salvar Pergunta'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function UserProfile({ user, onUpdate, onAvatarUpload, isLoading = false }: UserProfileProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const { error: toastError } = useToast();
  const [formData, setFormData] = useState({
    nomeCompleto: user.nomeCompleto || '',
    telefone: user.telefone || '',
    endereco1: user.endereco1 || '',
    endereco2: user.endereco2 || '',
    cidade: user.cidade || '',
    estado: user.estado || '',
    zipcode: user.zipcode || '',
    dataNascimento: isoToDisplay(user.dataNascimento || '')
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, string | null> = {
        nomeCompleto: formData.nomeCompleto,
        telefone: formData.telefone || null,
        endereco1: formData.endereco1 || null,
        endereco2: formData.endereco2 || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        zipcode: formData.zipcode || null,
        dataNascimento: formData.dataNascimento ? displayToIso(formData.dataNascimento) : null,
      };
      await onUpdate(payload);
    } catch (err) {
      toastError('Erro', (err as Error).message || 'Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const userInitials = user.nomeCompleto
    ? user.nomeCompleto.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user.email ? user.email[0].toUpperCase() : 'U');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-wide">Meu Perfil</h1>
        <p className="mt-1 text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
      </div>
      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="avatar">Foto</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeCompleto">Nome Completo</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-muted opacity-70"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', applyPhoneMask(e.target.value))}
                    placeholder="(469) 000-0000"
                    maxLength={14}
                    inputMode="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input
                    id="dataNascimento"
                    type="text"
                    value={formData.dataNascimento}
                    onChange={(e) => handleInputChange('dataNascimento', applyDateMask(e.target.value))}
                    placeholder="MM/DD/YYYY"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco1">Endereço</Label>
                <Input
                  id="endereco1"
                  value={formData.endereco1}
                  onChange={(e) => handleInputChange('endereco1', e.target.value)}
                  placeholder="Rua, número, bairro"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    placeholder="SP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipcode">CEP</Label>
                  <Input
                    id="zipcode"
                    value={formData.zipcode}
                    onChange={(e) => handleInputChange('zipcode', e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avatar" className="space-y-6">
          <AvatarUpload
            currentAvatar={user.avatarUrl}
            onAvatarChange={onAvatarUpload || (() => Promise.resolve())}
            userInitials={userInitials}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferências do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações por Email</h4>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações sobre atividades da conta
                    </p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked aria-label="Notificações por Email" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Tema Escuro</h4>
                    <p className="text-sm text-muted-foreground">
                      Usar tema escuro na interface
                    </p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked aria-label="Tema Escuro" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Idioma</h4>
                    <p className="text-sm text-muted-foreground">
                      Idioma da interface do sistema
                    </p>
                  </div>
                  <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" aria-label="Idioma da interface">
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Salvar Preferências</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
