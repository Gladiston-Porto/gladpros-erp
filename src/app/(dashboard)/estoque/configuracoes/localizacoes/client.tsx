'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, MapPin, Pencil, Trash2, Warehouse, Car, Archive, Grid3X3, LayoutGrid, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@gladpros/ui/button'
import { Badge } from '@gladpros/ui/badge'
import { Input } from '@gladpros/ui/input'
import { Label } from '@gladpros/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@gladpros/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@gladpros/ui/select'

type LocalizacaoTipo = 'DEPOSITO' | 'PRATELEIRA' | 'BIN' | 'ARMARIO' | 'VAN'

interface Localizacao {
  id: number
  nome: string
  codigo: string
  tipo: LocalizacaoTipo
  descricao: string | null
  ativo: boolean
  _count: { saldosMateriais: number }
}

const TIPO_CONFIG: Record<LocalizacaoTipo, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  DEPOSITO: { label: 'Depósito / Warehouse', icon: Warehouse, color: 'text-blue-500' },
  VAN:      { label: 'Van / Veículo',        icon: Car,       color: 'text-orange-500' },
  ARMARIO:  { label: 'Armário',              icon: Archive,   color: 'text-purple-500' },
  PRATELEIRA:{ label: 'Prateleira',          icon: Grid3X3,   color: 'text-green-500' },
  BIN:      { label: 'Bin / Caixa',          icon: LayoutGrid, color: 'text-cyan-500' },
}

interface FormData {
  nome: string
  codigo: string
  tipo: LocalizacaoTipo | ''
  descricao: string
}

const EMPTY_FORM: FormData = { nome: '', codigo: '', tipo: '', descricao: '' }

function generateCodigo(nome: string): string {
  return nome
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 20)
}

export default function LocalizacoesPageClient() {
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Localizacao | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterAtivo, setFilterAtivo] = useState<'all' | 'true' | 'false'>('all')

  const loadLocalizacoes = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterAtivo !== 'all' ? `?ativo=${filterAtivo}` : ''
      const res = await fetch(`/api/estoque/localizacoes${params}`)
      const json = await res.json()
      setLocalizacoes(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [filterAtivo])

  useEffect(() => { loadLocalizacoes() }, [loadLocalizacoes])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setError('')
    setDialogOpen(true)
  }

  function openEdit(loc: Localizacao) {
    setEditTarget(loc)
    setForm({ nome: loc.nome, codigo: loc.codigo, tipo: loc.tipo, descricao: loc.descricao ?? '' })
    setError('')
    setDialogOpen(true)
  }

  function handleNomeChange(nome: string) {
    setForm(f => ({
      ...f,
      nome,
      // Auto-suggest codigo only when creating and codigo is empty or was auto-generated
      codigo: editTarget ? f.codigo : generateCodigo(nome),
    }))
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.codigo.trim() || !form.tipo) {
      setError('Nome, código e tipo são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { nome: form.nome.trim(), codigo: form.codigo.trim().toUpperCase(), tipo: form.tipo, descricao: form.descricao || undefined }
      const res = editTarget
        ? await fetch(`/api/estoque/localizacoes/${editTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/estoque/localizacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (!res.ok) {
        const json = await res.json()
        setError(json.message ?? json.error ?? 'Erro ao salvar')
        return
      }
      setDialogOpen(false)
      loadLocalizacoes()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtivo(loc: Localizacao) {
    await fetch(`/api/estoque/localizacoes/${loc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !loc.ativo }),
    })
    loadLocalizacoes()
  }

  async function handleDelete(loc: Localizacao) {
    if (!confirm(`Remover "${loc.nome}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/estoque/localizacoes/${loc.id}`, { method: 'DELETE' })
    loadLocalizacoes()
  }

  const ativos = localizacoes.filter(l => l.ativo).length
  const inativos = localizacoes.filter(l => !l.ativo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Locais de Armazenamento</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ativos} ativo{ativos !== 1 ? 's' : ''} · {inativos} inativo{inativos !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-brand-primary hover:bg-brand-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Localização
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'true', 'false'] as const).map(v => (
          <button
            key={v}
            onClick={() => setFilterAtivo(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterAtivo === v
                ? 'bg-brand-primary text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {v === 'all' ? 'Todos' : v === 'true' ? 'Ativos' : 'Inativos'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : localizacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <MapPin className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhuma localização encontrada.</p>
          <Button variant="outline" onClick={openCreate}>Criar primeira localização</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {localizacoes.map(loc => {
            const cfg = TIPO_CONFIG[loc.tipo]
            const Icon = cfg.icon
            return (
              <div
                key={loc.id}
                className={`bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 transition-opacity ${!loc.ativo ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm leading-tight">{loc.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono">{loc.codigo}</p>
                    </div>
                  </div>
                  <Badge variant={loc.ativo ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                    {loc.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                  <span className="text-xs text-muted-foreground">{loc._count.saldosMateriais} material{loc._count.saldosMateriais !== 1 ? 'is' : ''}</span>
                </div>

                {loc.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{loc.descricao}</p>
                )}

                <div className="flex gap-2 mt-auto pt-1 border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEdit(loc)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleToggleAtivo(loc)}>
                    {loc.ativo ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  </Button>
                  {loc._count.saldosMateriais === 0 && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(loc)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar Localização' : 'Nova Localização'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="loc-nome">Nome *</Label>
              <Input
                id="loc-nome"
                placeholder="Ex: Warehouse, Van do Gladiston"
                value={form.nome}
                onChange={e => handleNomeChange(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-codigo">Código *</Label>
              <Input
                id="loc-codigo"
                placeholder="Ex: WAREHOUSE, VAN-GL"
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Usado para identificação rápida. Único no sistema.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as LocalizacaoTipo }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_CONFIG) as [LocalizacaoTipo, typeof TIPO_CONFIG[LocalizacaoTipo]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-desc">Descrição</Label>
              <Input
                id="loc-desc"
                placeholder="Informações adicionais (opcional)"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-brand-primary hover:bg-brand-primary/90">
              {saving ? 'Salvando...' : editTarget ? 'Salvar alterações' : 'Criar localização'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
