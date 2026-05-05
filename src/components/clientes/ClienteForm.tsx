"use client";
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react'
import type { ClienteCreateInput, ClienteUpdateInput, TipoCliente, TipoDocumentoPF } from '@/shared/types/cliente'
import { formatTelefone } from "@/shared/lib/helpers/cliente-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@gladpros/ui/card";
import { Input } from "@gladpros/ui/input";
import { Button } from "@gladpros/ui/button";

type FormData = ClienteCreateInput

type SimilarMatch = { id: number; nome: string; tipo: string; email: string | null; telefoneFormatado?: string }
type SimilarResult = { byTelefone: SimilarMatch[]; byAddress: SimilarMatch[]; hasMatches: boolean }

interface ClienteFormProps {
  cliente?: Partial<FormData> & { id?: number } | null
  onSubmit: (data: ClienteCreateInput | ClienteUpdateInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ClienteForm({ cliente, onSubmit, onCancel, loading = false }: ClienteFormProps) {
  const [formData, setFormData] = useState({
    tipo: (cliente?.tipo as TipoCliente) || 'PF',
    nomeCompleto: (cliente?.nomeCompleto as string) || '',
    razaoSocial: (cliente?.razaoSocial as string) || '',
    nomeFantasia: (cliente?.nomeFantasia as string) || '',
    email: (cliente?.email as string) || '',
    telefone: (cliente?.telefone as string) || '',
    tipoDocumentoPF: (cliente?.tipoDocumentoPF as TipoDocumentoPF) || 'SSN',
    ssn: (cliente?.ssn as string) || '',
    itin: (cliente?.itin as string) || '',
    ein: (cliente?.ein as string) || '',

    // Address Fields
    addressStreet: (cliente?.addressStreet as string) || '',
    addressUnit: (cliente?.addressUnit as string) || '',
    addressCity: (cliente?.addressCity as string) || '',
    addressState: (cliente?.addressState as string) || 'TX',
    addressZip: (cliente?.addressZip as string) || '',
    addressCounty: (cliente?.addressCounty as string) || '',

    observacoes: (cliente?.observacoes as string) || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [similarAlert, setSimilarAlert] = useState<SimilarResult | null>(null)
  const [zipLookupStatus, setZipLookupStatus] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zipAbortRef = useRef<AbortController | null>(null)

  // ZIP auto-fill: quando o usuário sai do campo ZIP, busca cidade/estado automaticamente
  const handleZipBlur = async () => {
    const baseZip = (formData.addressZip || '').replace(/\D/g, '').slice(0, 5)
    if (baseZip.length !== 5) return
    // Não sobrescreve cidade já preenchida pelo usuário
    if (formData.addressCity.trim()) return

    if (zipAbortRef.current) zipAbortRef.current.abort()
    zipAbortRef.current = new AbortController()

    setZipLookupStatus('loading')
    try {
      const res = await fetch(`/api/clientes/zip-lookup?zip=${baseZip}`, { signal: zipAbortRef.current.signal })
      const json = await res.json()
      if (json.success && json.data?.city) {
        setFormData((prev) => ({
          ...prev,
          addressCity: json.data.city,
          addressState: json.data.state ?? prev.addressState,
        }))
        setZipLookupStatus('found')
      } else {
        setZipLookupStatus('notfound')
      }
    } catch {
      // Erro de rede ou abort — não quebrar o formulário
      setZipLookupStatus('idle')
    }
  }

  // Detecção não-bloqueante de cadastros similares (telefone/endereço)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const telefoneDigits = formData.telefone.replace(/\D/g, '')
    const hasPhone = telefoneDigits.length === 10
    const hasAddress = formData.addressStreet.trim().length >= 5 && formData.addressCity.trim().length >= 2

    if (!hasPhone && !hasAddress) {
      setSimilarAlert(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams()
      if (hasPhone) params.set('telefone', telefoneDigits)
      if (hasAddress) {
        params.set('addressStreet', formData.addressStreet.trim())
        params.set('addressCity', formData.addressCity.trim())
        if (formData.addressState) params.set('addressState', formData.addressState)
      }
      if (cliente?.id) params.set('excludeId', String(cliente.id))

      try {
        const res = await fetch(`/api/clientes/similar?${params.toString()}`)
        if (!res.ok) return
        const json = await res.json()
        setSimilarAlert(json.success && json.data.hasMatches ? json.data : null)
      } catch {
        // Ignorar erros silenciosamente — aviso é opcional, não deve quebrar o form
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [formData.telefone, formData.addressStreet, formData.addressCity, formData.addressState, cliente?.id])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as string]) setErrors((e) => ({ ...e, [field as string]: '' }))
  }

  // Helpers validação e normalização
  const requiredTrim = (v: string) => (typeof v === "string" ? v.trim() : "");

  const normalizeNullable = (v: string) => {
    const t = (v ?? "").trim();
    return t.length ? t : null;
  };

  const validate = () => {
    const e: Record<string, string> = {}
    const zipRegex = /^(\d{5}|\d{5}-\d{4})$/; // padrão US

    const emailTrimmed = requiredTrim(formData.email).toLowerCase();
    if (!emailTrimmed) e.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) e.email = "E-mail inválido";

    const phoneDigits = String(formData.telefone || "").replace(/\D/g, "");
    if (!phoneDigits) e.telefone = "Telefone é obrigatório";
    else if (phoneDigits.length !== 10) e.telefone = "Telefone deve ter 10 dígitos. Ex: (469)334-6918";

    // Address (Strict)
    const street = requiredTrim(formData.addressStreet);
    const city = requiredTrim(formData.addressCity);
    const state = requiredTrim(formData.addressState).toUpperCase();
    const zip = requiredTrim(formData.addressZip);

    if (!street) e.addressStreet = "Logradouro é obrigatório";
    if (!city) e.addressCity = "Cidade é obrigatória";
    if (!state) e.addressState = "Estado é obrigatório";
    else if (!/^[A-Z]{2}$/.test(state)) e.addressState = "Estado deve ter 2 letras (Ex: TX)";

    if (!zip) e.addressZip = "ZIP Code é obrigatório";
    else if (!zipRegex.test(zip)) e.addressZip = "ZIP inválido (Ex: 75201 ou 75201-1234)";

    if (formData.tipo === 'PF') {
      const nome = requiredTrim(formData.nomeCompleto || "");
      if (!nome) e.nomeCompleto = 'Nome completo é obrigatório'

      if (formData.tipoDocumentoPF === 'SSN' && formData.ssn) {
        if (!/^\d{3}-\d{2}-\d{4}$|^\d{9}$/.test(formData.ssn)) e.ssn = 'SSN inválido'
      }
      if (formData.tipoDocumentoPF === 'ITIN' && formData.itin) {
        if (!/^9\d{2}-\d{2}-\d{4}$|^9\d{8}$/.test(formData.itin)) e.itin = 'ITIN inválido'
      }
    } else {
      const empresa = requiredTrim(formData.nomeFantasia || "");
      if (!empresa) e.nomeFantasia = 'Nome da Empresa é obrigatório'
      if (formData.ein && !/^\d{2}-\d{7}$|^\d{9}$/.test(formData.ein)) e.ein = 'EIN inválido'
    }
    return e
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }

    // Normalização Segura
    const payload: ClienteCreateInput = {
      ...formData,
      email: formData.email.trim().toLowerCase(),
      telefone: String(formData.telefone).replace(/\D/g, ""),
      // Address Normalization
      addressStreet: requiredTrim(formData.addressStreet),
      addressCity: requiredTrim(formData.addressCity),
      addressState: requiredTrim(formData.addressState).toUpperCase(),
      addressZip: requiredTrim(formData.addressZip),
      addressUnit: normalizeNullable(formData.addressUnit),
      addressCounty: normalizeNullable(formData.addressCounty),
      // Name/Other Normalization
      nomeCompleto: normalizeNullable(formData.nomeCompleto),
      razaoSocial: normalizeNullable(formData.razaoSocial),
      nomeFantasia: normalizeNullable(formData.nomeFantasia),
      observacoes: normalizeNullable(formData.observacoes),
      ein: normalizeNullable(formData.ein),
      ssn: normalizeNullable(formData.ssn),
      itin: normalizeNullable(formData.itin),
    }

    // Normalize document fields based on type
    if (payload.tipo === 'PF') {
      payload.ein = null
      payload.razaoSocial = null
      payload.nomeFantasia = null
      if (payload.tipoDocumentoPF === 'SSN') payload.itin = null
      else if (payload.tipoDocumentoPF === 'ITIN') payload.ssn = null
    } else if (payload.tipo === 'PJ') {
      payload.ssn = null
      payload.itin = null
      payload.tipoDocumentoPF = null
      payload.nomeCompleto = null
    }

    try {
      await onSubmit(payload)
    } catch (err: unknown) {
      const fieldErrors: Record<string, string> = {}
      if (err && typeof err === 'object' && 'fieldErrors' in err && typeof (err as Record<string, unknown>).fieldErrors === 'object') {
        Object.assign(fieldErrors, (err as Record<string, unknown>).fieldErrors)
      }
      const issues = (err as Record<string, unknown>)?.details || (err as Record<string, unknown>)?.issues
      if (Array.isArray(issues)) {
        issues.forEach((issue: Record<string, unknown>) => {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : issue.path
          if (typeof path === 'string' && path) {
            fieldErrors[path] = (issue.message as string) || 'Valor inválido'
          }
        })
      }
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors)
        return
      }
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA - DADOS PRINCIPAIS */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
              <CardDescription>Dados básicos do cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo de Cliente Switch */}
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-sm font-medium">Tipo:</span>
                <div className="flex rounded-2xl border border-border bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => handleInputChange('tipo', 'PF')}
                    className={`min-h-12 rounded-2xl px-4 py-2 text-sm font-medium transition-all ${formData.tipo === 'PF' ? 'bg-card text-brand-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Pessoa Física
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('tipo', 'PJ')}
                    className={`min-h-12 rounded-2xl px-4 py-2 text-sm font-medium transition-all ${formData.tipo === 'PJ' ? 'bg-card text-brand-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Empresa
                  </button>
                </div>
              </div>

              {formData.tipo === 'PF' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Nome Completo <span className="text-error">*</span></label>
                    <Input
                      name="nomeCompleto"
                      aria-label="Nome Completo"
                      data-testid="cliente-form-nome-completo"
                      placeholder="Ex: João da Silva"
                      value={formData.nomeCompleto || ''}
                      onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                      className={errors.nomeCompleto ? "border-error focus-visible:ring-error" : ""}
                    />
                    {errors.nomeCompleto && <span className="text-xs text-error mt-1">{errors.nomeCompleto}</span>}
                  </div>

                  {/* Documentos PF */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Documento (SSN/ITIN)</label>
                    <div className="flex gap-2 mb-2">
                      {['SSN', 'ITIN'].map((doc) => (
                        <button
                          key={doc}
                          type="button"
                          onClick={() => handleInputChange('tipoDocumentoPF', doc)}
                          className={`min-h-12 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors ${formData.tipoDocumentoPF === doc ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
                        >
                          {doc}
                        </button>
                      ))}
                    </div>
                    {formData.tipoDocumentoPF === 'SSN' ? (
                        <Input
                          name="ssn"
                          aria-label="SSN"
                          data-testid="cliente-form-ssn"
                          placeholder="000-00-0000"
                          value={formData.ssn || ''}
                          onChange={(e) => handleInputChange('ssn', e.target.value)}
                        className={errors.ssn ? "border-error" : ""}
                      />
                    ) : (
                        <Input
                          name="itin"
                          aria-label="ITIN"
                          data-testid="cliente-form-itin"
                          placeholder="9XX-XX-XXXX"
                          value={formData.itin || ''}
                          onChange={(e) => handleInputChange('itin', e.target.value)}
                        className={errors.itin ? "border-error" : ""}
                      />
                    )}
                    {(errors.ssn || errors.itin) && <span className="text-xs text-error mt-1">{errors.ssn || errors.itin}</span>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Nome Fantasia / DBA <span className="text-error">*</span></label>
                    <Input
                      name="nomeFantasia"
                      aria-label="Nome Fantasia ou DBA"
                      data-testid="cliente-form-nome-fantasia"
                      placeholder="Tech Solutions Inc"
                      value={formData.nomeFantasia || ''}
                      onChange={(e) => handleInputChange('nomeFantasia', e.target.value)}
                      className={errors.nomeFantasia ? "border-error focus-visible:ring-error" : ""}
                    />
                    {errors.nomeFantasia && <span className="text-xs text-error mt-1">{errors.nomeFantasia}</span>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">
                      Razão Social (Legal Name)
                      <span className="text-muted-foreground font-light text-xs ml-1">(Opcional — nome jurídico completo da empresa)</span>
                    </label>
                    <Input
                      name="razaoSocial"
                      aria-label="Razão Social"
                      data-testid="cliente-form-razao-social"
                      placeholder="Tech Solutions LLC"
                      value={formData.razaoSocial || ''}
                      onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">EIN (Empresa)</label>
                    <Input
                      name="ein"
                      aria-label="EIN"
                      data-testid="cliente-form-ein"
                      placeholder="00-0000000"
                      value={formData.ein || ''}
                      onChange={(e) => handleInputChange('ein', e.target.value)}
                      className={errors.ein ? "border-error" : ""}
                    />
                    {errors.ein && <span className="text-xs text-error mt-1">{errors.ein}</span>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço e Localização</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-8">
                <label className="text-sm font-medium mb-1 block">Logradouro (Street) <span className="text-error">*</span></label>
                <Input
                  name="addressStreet"
                  aria-label="Logradouro"
                  data-testid="cliente-form-address-street"
                  value={formData.addressStreet || ''}
                  onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                  placeholder="123 Main St"
                  className={errors.addressStreet ? "border-error" : ""}
                />
                {errors.addressStreet && <span className="text-xs text-error">{errors.addressStreet}</span>}
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="text-sm font-medium mb-1 block">Apt / Unidade</label>
                <Input
                  name="addressUnit"
                  aria-label="Apt Unidade"
                  data-testid="cliente-form-address-unit"
                  value={formData.addressUnit || ''}
                  onChange={(e) => handleInputChange('addressUnit', e.target.value)}
                  placeholder="Apt 4B"
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className="text-sm font-medium mb-1 block">Cidade (City) <span className="text-error">*</span></label>
                <Input
                  name="addressCity"
                  aria-label="Cidade"
                  data-testid="cliente-form-address-city"
                  value={formData.addressCity || ''}
                  onChange={(e) => handleInputChange('addressCity', e.target.value)}
                  placeholder="City Name"
                  className={errors.addressCity ? "border-error" : ""}
                />
                {errors.addressCity && <span className="text-xs text-error">{errors.addressCity}</span>}
              </div>

              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Estado <span className="text-error">*</span></label>
                <select
                  name="addressState"
                  aria-label="Estado"
                  data-testid="cliente-form-address-state"
                  value={formData.addressState || 'TX'}
                  onChange={(e) => handleInputChange('addressState', e.target.value)}
                  className={`flex min-h-12 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${errors.addressState ? "border-error" : ""}`}
                >
                  <option value="">Selecione...</option>
                  <option value="AL">AL</option><option value="AK">AK</option><option value="AZ">AZ</option><option value="AR">AR</option>
                  <option value="CA">CA</option><option value="CO">CO</option><option value="CT">CT</option><option value="DE">DE</option>
                  <option value="FL">FL</option><option value="GA">GA</option><option value="HI">HI</option><option value="ID">ID</option>
                  <option value="IL">IL</option><option value="IN">IN</option><option value="IA">IA</option><option value="KS">KS</option>
                  <option value="KY">KY</option><option value="LA">LA</option><option value="ME">ME</option><option value="MD">MD</option>
                  <option value="MA">MA</option><option value="MI">MI</option><option value="MN">MN</option><option value="MS">MS</option>
                  <option value="MO">MO</option><option value="MT">MT</option><option value="NE">NE</option><option value="NV">NV</option>
                  <option value="NH">NH</option><option value="NJ">NJ</option><option value="NM">NM</option><option value="NY">NY</option>
                  <option value="NC">NC</option><option value="ND">ND</option><option value="OH">OH</option><option value="OK">OK</option>
                  <option value="OR">OR</option><option value="PA">PA</option><option value="RI">RI</option><option value="SC">SC</option>
                  <option value="SD">SD</option><option value="TN">TN</option><option value="TX">TX</option><option value="UT">UT</option>
                  <option value="VT">VT</option><option value="VA">VA</option><option value="WA">WA</option><option value="WV">WV</option>
                  <option value="WI">WI</option><option value="WY">WY</option><option value="DC">DC</option>
                </select>
                {errors.addressState && <span className="text-xs text-error">{errors.addressState}</span>}
              </div>

              <div className="col-span-6 md:col-span-4">
                <label className="text-sm font-medium mb-1 block">ZIP Code <span className="text-error">*</span></label>
                <div className="relative">
                  <Input
                    name="addressZip"
                    aria-label="ZIP Code"
                    data-testid="cliente-form-address-zip"
                    value={formData.addressZip || ''}
                    onChange={(e) => handleInputChange('addressZip', e.target.value)}
                    onBlur={handleZipBlur}
                    placeholder="12345"
                    className={errors.addressZip ? "border-error" : ""}
                  />
                  {zipLookupStatus === 'loading' && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {zipLookupStatus === 'found' && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.addressZip && <span className="text-xs text-error">{errors.addressZip}</span>}
                {zipLookupStatus === 'notfound' && !errors.addressZip && (
                  <span className="text-xs text-muted-foreground">ZIP não reconhecido — verifique o código</span>
                )}
              </div>

              <div className="col-span-12 md:col-span-12">
                <label className="text-sm font-medium mb-1 block">Condado (County) <span className="text-muted-foreground font-light text-xs ml-1">(Opcional, mas recomendado para Tax)</span></label>
                <Input
                  name="addressCounty"
                  aria-label="County"
                  data-testid="cliente-form-address-county"
                  value={formData.addressCounty || ''}
                  onChange={(e) => handleInputChange('addressCounty', e.target.value)}
                  placeholder="Dallas County"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA - CONTATO & INFO */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">E-mail <span className="text-error">*</span></label>
                <Input
                  type="email"
                  name="email"
                  aria-label="E-mail"
                  data-testid="cliente-form-email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="cliente@email.com"
                  className={errors.email ? "border-error" : ""}
                />
                {errors.email && <span className="text-xs text-error">{errors.email}</span>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefone <span className="text-error">*</span></label>
                <Input
                  type="tel"
                  name="telefone"
                  aria-label="Telefone"
                  data-testid="cliente-form-telefone"
                  value={formatTelefone(formData.telefone)}
                  onChange={(e) => handleInputChange('telefone', e.target.value.replace(/\D/g, ''))}
                  placeholder="(555) 123-4567"
                  className={errors.telefone ? "border-error" : ""}
                />
                {errors.telefone && <span className="text-xs text-error">{errors.telefone}</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                name="observacoes"
                aria-label="Observações"
                data-testid="cliente-form-observacoes"
                className="min-h-[120px] w-full rounded-2xl border border-input bg-background px-3 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.observacoes || ''}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Notas internas sobre o cliente..."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AVISO NÃO-BLOQUEANTE: possível duplicidade de telefone ou endereço */}
      {similarAlert?.hasMatches && (
        <div
          role="alert"
          data-testid="similar-clients-alert"
          className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div className="space-y-1.5">
              <p className="font-medium text-yellow-700">Possível cadastro duplicado</p>
              {similarAlert.byTelefone.length > 0 && (
                <p className="text-yellow-600">
                  Telefone já cadastrado em:{' '}
                  {similarAlert.byTelefone.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ', '}
                      <Link
                        href={`/clientes/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-yellow-800"
                      >
                        {c.nome}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              {similarAlert.byAddress.length > 0 && (
                <p className="text-yellow-600">
                  Endereço similar em:{' '}
                  {similarAlert.byAddress.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ', '}
                      <Link
                        href={`/clientes/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-yellow-800"
                      >
                        {c.nome}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              <p className="text-xs text-yellow-600/80/80">
                Verifique se é um cliente existente antes de continuar. Você pode salvar mesmo assim se for um cadastro diferente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STICKY ACTIONS FOOTER */}
      <div className="z-10 mt-6 flex items-center justify-end gap-3 rounded-2xl border border-border bg-card/90 p-4 pt-6 shadow-sm backdrop-blur-md md:sticky md:bottom-0">
        <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="min-w-[120px]" data-testid="cliente-form-submit">
          {loading ? 'Salvando...' : 'Salvar Cliente'}
        </Button>
      </div>
    </form>
  )
}
