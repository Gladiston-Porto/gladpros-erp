"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@gladpros/ui/dialog"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { PageHeader } from "@gladpros/ui/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@gladpros/ui/table"
import { useToast } from "@gladpros/ui/toast"
import { parseApiError } from "@/lib/api/parseApiError"
import {
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

type TipoCompensacao = "OWNER_DRAW" | "SALARY" | "DISTRIBUTION"

interface Compensation {
  id: number
  tipo: TipoCompensacao
  valor: number
  data: string
  descricao: string | null
  referencia: string | null
  worker: { id: number; name: string }
  bankAccount: { id: number; nome: string } | null
}

interface CompensationSummary {
  year: number
  totalDraws: number
  totalSalary: number
  totalDistributions: number
  totalCompensation: number
  regime: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

function tipoLabel(tipo: TipoCompensacao) {
  const map: Record<TipoCompensacao, string> = {
    OWNER_DRAW: "Owner Draw",
    SALARY: "Salário",
    DISTRIBUTION: "Distribuição",
  }
  return map[tipo] || tipo
}

function tipoBadge(tipo: TipoCompensacao) {
  switch (tipo) {
    case "SALARY":
      return <Badge variant="default">Salário</Badge>
    case "DISTRIBUTION":
      return <Badge variant="secondary">Distribuição</Badge>
    default:
      return <Badge variant="outline">Owner Draw</Badge>
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OwnerCompensationPage() {
  const toast = useToast()
  const [items, setItems] = useState<Compensation[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [summary, setSummary] = useState<CompensationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [year] = useState(new Date().getFullYear())

  // Form state
  const [form, setForm] = useState({
    tipo: "OWNER_DRAW" as TipoCompensacao,
    valor: "",
    data: new Date().toISOString().split("T")[0],
    descricao: "",
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Regime state
  const [regime, setRegime] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [listRes, summaryRes, regimeRes] = await Promise.all([
        fetch(`/api/financeiro/owner-compensation?year=${year}&pageSize=50`),
        fetch(`/api/financeiro/owner-compensation/summary?year=${year}`),
        fetch("/api/financeiro/tax/regime"),
      ])
      if (listRes.ok) {
        const listJson = await listRes.json()
        setItems(listJson.data || [])
        setPagination(listJson.pagination || null)
      }
      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json()
        setSummary(summaryJson.data)
      }
      if (regimeRes.ok) {
        const regimeJson = await regimeRes.json()
        setRegime(regimeJson.data?.tipoTributacao || null)
      }
    } catch {
      toast.error("Erro ao carregar dados de compensação")
    } finally {
      setLoading(false)
    }
  }, [year, toast])

  useEffect(() => { loadData() }, [loadData])

  // Determine available types based on regime
  const availableTypes: TipoCompensacao[] =
    regime === "S_CORP" ? ["SALARY", "DISTRIBUTION"] : ["OWNER_DRAW"]

  const handleSubmit = async () => {
    const localErrors: Record<string, string> = {}
    if (!form.valor || Number(form.valor) <= 0) localErrors.valor = "Informe um valor válido"
    if (!form.data) localErrors.data = "Data é obrigatória"
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      toast.error(Object.values(localErrors)[0])
      return
    }
    setFieldErrors({})

    setSubmitting(true)
    try {
      const res = await fetch("/api/financeiro/owner-compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: 1, // Owner worker — seeded in Phase 1
          tipo: form.tipo,
          valor: Number(form.valor),
          data: form.data,
          descricao: form.descricao || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const { fieldErrors: serverErrors, firstMessage } = parseApiError(json, "Erro ao criar compensação")
        setFieldErrors(serverErrors)
        toast.error(firstMessage)
        return
      }
      toast.success(`${tipoLabel(form.tipo)} registrado!`)
      setShowForm(false)
      setForm({ tipo: availableTypes[0] || "OWNER_DRAW", valor: "", data: new Date().toISOString().split("T")[0], descricao: "" })
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return
    try {
      const res = await fetch(`/api/financeiro/owner-compensation/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Erro ao excluir")
      }
      toast.success("Registro excluído")
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compensação do Proprietário"
        description={regime === "S_CORP" ? "Salários e distribuições (S-Corp)" : "Owner Draws (LLC)"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro", href: "/dashboard/financeiro" },
          { label: "Fiscal", href: "/dashboard/financeiro/fiscal" },
          { label: "Compensação" },
        ]}
        actions={
          <Button size="lg" onClick={() => { setForm({ tipo: availableTypes[0] || "OWNER_DRAW", valor: "", data: new Date().toISOString().split("T")[0], descricao: "" }); setFieldErrors({}); setShowForm(true) }}>
            <Plus className="h-4 w-4" />
            Registrar
          </Button>
        }
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Compensação {year}</p>
              <p className="text-lg font-bold">{fmt(summary.totalCompensation)}</p>
            </CardContent>
          </Card>
          {summary.totalDraws > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Owner Draws</p>
                <p className="text-lg font-bold">{fmt(summary.totalDraws)}</p>
              </CardContent>
            </Card>
          )}
          {summary.totalSalary > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Salários (S-Corp)</p>
                <p className="text-lg font-bold">{fmt(summary.totalSalary)}</p>
              </CardContent>
            </Card>
          )}
          {summary.totalDistributions > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Distribuições</p>
                <p className="text-lg font-bold">{fmt(summary.totalDistributions)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Lançamentos — {year}
            {pagination && <span className="text-sm font-normal text-muted-foreground">({pagination.total} registros)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              Nenhuma compensação registrada em {year}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {new Date(item.data).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago",
                      })}
                    </TableCell>
                    <TableCell>{tipoBadge(item.tipo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.descricao || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(Number(item.valor))}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Excluir registro"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {regime === "S_CORP" ? "Registrar Salário/Distribuição" : "Registrar Owner Draw"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="comp-tipo">Tipo <span className="text-destructive">*</span></Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((prev) => ({ ...prev, tipo: v as TipoCompensacao }))}
              >
                <SelectTrigger id="comp-tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t}>{tipoLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.tipo && <p className="mt-1 text-sm text-destructive">{fieldErrors.tipo}</p>}
            </div>
            <div>
              <Label htmlFor="comp-valor">Valor (USD) <span className="text-destructive">*</span></Label>
              <Input
                id="comp-valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.valor}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, valor: e.target.value }))
                  if (fieldErrors.valor) setFieldErrors((p) => { const n = { ...p }; delete n.valor; return n })
                }}
                aria-invalid={!!fieldErrors.valor}
              />
              {fieldErrors.valor && <p className="mt-1 text-sm text-destructive">{fieldErrors.valor}</p>}
            </div>
            <div>
              <Label htmlFor="comp-data">Data <span className="text-destructive">*</span></Label>
              <Input
                id="comp-data"
                type="date"
                value={form.data}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, data: e.target.value }))
                  if (fieldErrors.data) setFieldErrors((p) => { const n = { ...p }; delete n.data; return n })
                }}
                aria-invalid={!!fieldErrors.data}
              />
              {fieldErrors.data && <p className="mt-1 text-sm text-destructive">{fieldErrors.data}</p>}
            </div>
            <div>
              <Label htmlFor="comp-desc">Descrição (opcional)</Label>
              <Input
                id="comp-desc"
                placeholder="Ex: Draw mensal de abril"
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
