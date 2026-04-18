'use client';

import { useEffect, useState, useCallback } from 'react';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@gladpros/ui/card';
import { Button } from '@gladpros/ui/button';
import { Input } from '@gladpros/ui/input';
import { Label } from '@gladpros/ui/label';
import { Building, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

interface EmpresaData {
  id: number;
  nome: string;
  razaoSocial: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  addressStreet: string | null;
  addressUnit: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCounty: string | null;
  tipoTributacao: string;
  atualizadoEm: string | null;
}

export default function GeralPage() {
  const { toast } = useToast();
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    razaoSocial: '',
    cnpj: '',
    email: '',
    telefone: '',
    addressStreet: '',
    addressUnit: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCounty: '',
  });

  const loadEmpresa = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/empresa');
      if (!res.ok) throw new Error('Erro ao carregar');
      const { data } = await res.json();
      setEmpresa(data);
      setForm({
        nome: data.nome || '',
        razaoSocial: data.razaoSocial || '',
        cnpj: data.cnpj || '',
        email: data.email || '',
        telefone: data.telefone || '',
        addressStreet: data.addressStreet || '',
        addressUnit: data.addressUnit || '',
        addressCity: data.addressCity || '',
        addressState: data.addressState || '',
        addressZip: data.addressZip || '',
        addressCounty: data.addressCounty || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpresa();
  }, [loadEmpresa]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cnpj: form.cnpj || null,
          email: form.email || null,
          telefone: form.telefone || null,
          addressStreet: form.addressStreet || null,
          addressUnit: form.addressUnit || null,
          addressCity: form.addressCity || null,
          addressState: form.addressState || null,
          addressZip: form.addressZip || null,
          addressCounty: form.addressCounty || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao salvar');
      }

      const { data } = await res.json();
      setEmpresa(data);
      toast({ title: 'Salvo', description: 'Dados da empresa atualizados com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Empresa não encontrada</h2>
        <p className="text-sm text-muted-foreground mt-1">Execute o seed inicial para criar o registro da empresa.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title="Configurações Gerais"
        description="Nome da empresa, dados fiscais, endereço e contato."
        icon={<Building />}
        accentColor="#3b82f6"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Geral' },
        ]}
      />

      {/* Identificação */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Identificação da Empresa</CardTitle>
          <CardDescription>Dados oficiais e regime tributário</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Fantasia *</Label>
            <Input id="nome" value={form.nome} onChange={(e) => updateField('nome', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="razaoSocial">Razão Social *</Label>
            <Input id="razaoSocial" value={form.razaoSocial} onChange={(e) => updateField('razaoSocial', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">EIN / Tax ID</Label>
            <Input id="cnpj" value={form.cnpj} onChange={(e) => updateField('cnpj', e.target.value)} placeholder="XX-XXXXXXX" />
          </div>
          <div className="space-y-2">
            <Label>Regime Tributário</Label>
            <Input value={empresa.tipoTributacao} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Alterável em Financeiro &gt; Fiscal</p>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" value={form.telefone} onChange={(e) => updateField('telefone', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="addressStreet">Rua / Logradouro</Label>
            <Input id="addressStreet" value={form.addressStreet} onChange={(e) => updateField('addressStreet', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressUnit">Complemento</Label>
            <Input id="addressUnit" value={form.addressUnit} onChange={(e) => updateField('addressUnit', e.target.value)} placeholder="Suite, Apt, etc." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressCity">Cidade</Label>
            <Input id="addressCity" value={form.addressCity} onChange={(e) => updateField('addressCity', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressState">Estado</Label>
            <Input id="addressState" value={form.addressState} onChange={(e) => updateField('addressState', e.target.value)} maxLength={2} placeholder="TX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressZip">ZIP Code</Label>
            <Input id="addressZip" value={form.addressZip} onChange={(e) => updateField('addressZip', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressCounty">County</Label>
            <Input id="addressCounty" value={form.addressCounty} onChange={(e) => updateField('addressCounty', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
