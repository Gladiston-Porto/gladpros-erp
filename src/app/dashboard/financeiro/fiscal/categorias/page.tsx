"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@gladpros/ui/dialog"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { PageHeader } from "@gladpros/ui/page-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@gladpros/ui/table"
import { useToast } from "@gladpros/ui/toast"
import { parseApiError } from "@/lib/api/parseApiError"
import {
  FileText,
  Pen,
  Search,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface ExpenseCategory {
  id: number
  nome: string
  slug: string | null
  scheduleCLine: string | null
  dedutivel: boolean
  ativo: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ExpenseCategoriesPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Edit modal
  const [editItem, setEditItem] = useState<ExpenseCategory | null>(null)
  const [editForm, setEditForm] = useState({ scheduleCLine: "", dedutivel: true, nome: "" })
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/financeiro/expense-categories")
      if (!res.ok) throw new Error("Erro ao carregar")
      const json = await res.json()
      setCategories(json.data || [])
    } catch {
      toast.error("Erro ao carregar categorias")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  const openEdit = (cat: ExpenseCategory) => {
    setEditItem(cat)
    setEditForm({
      scheduleCLine: cat.scheduleCLine || "",
      dedutivel: cat.dedutivel,
      nome: cat.nome,
    })
    setFieldErrors({})
  }

  const handleSave = async () => {
    if (!editItem) return

    const localErrors: Record<string, string> = {}
    if (!editForm.nome.trim()) localErrors.nome = "Nome é obrigatório"
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      toast.error(Object.values(localErrors)[0])
      return
    }
    setFieldErrors({})

    setSaving(true)
    try {
      const res = await fetch(`/api/financeiro/expense-categories/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editForm.nome || undefined,
          scheduleCLine: editForm.scheduleCLine || null,
          dedutivel: editForm.dedutivel,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const { fieldErrors: serverErrors, firstMessage } = parseApiError(json, "Erro ao salvar categoria")
        setFieldErrors(serverErrors)
        toast.error(firstMessage)
        return
      }
      toast.success("Categoria atualizada")
      setEditItem(null)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro")
    } finally {
      setSaving(false)
    }
  }

  const filtered = categories.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.scheduleCLine && c.scheduleCLine.toLowerCase().includes(search.toLowerCase())) ||
    (c.slug && c.slug.toLowerCase().includes(search.toLowerCase()))
  )

  const deductibleCount = categories.filter((c) => c.dedutivel).length
  const mappedCount = categories.filter((c) => c.scheduleCLine).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias de Despesas"
        description="Gerencie o mapeamento Schedule C para cada categoria"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro", href: "/dashboard/financeiro" },
          { label: "Fiscal", href: "/dashboard/financeiro/fiscal" },
          { label: "Categorias" },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Categorias</p>
            <p className="text-lg font-bold">{categories.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Dedutíveis</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{deductibleCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Mapeadas (Schedule C)</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{mappedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Categorias
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categorias..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar categorias"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhuma categoria encontrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Schedule C Line</TableHead>
                  <TableHead>Dedutível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{cat.nome}</p>
                        {cat.slug && <p className="text-xs text-muted-foreground">{cat.slug}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cat.scheduleCLine ? (
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          {cat.scheduleCLine}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cat.dedutivel ? (
                        <Badge variant="default">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {cat.ativo ? (
                        <Badge variant="outline">Ativa</Badge>
                      ) : (
                        <Badge variant="destructive">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(cat)}
                        aria-label={`Editar ${cat.nome}`}
                      >
                        <Pen className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="cat-nome">Nome <span className="text-destructive">*</span></Label>
                <Input
                  id="cat-nome"
                  value={editForm.nome}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, nome: e.target.value }))
                    if (fieldErrors.nome) setFieldErrors((p) => { const n = { ...p }; delete n.nome; return n })
                  }}
                  aria-invalid={!!fieldErrors.nome}
                />
                {fieldErrors.nome && <p className="mt-1 text-sm text-destructive">{fieldErrors.nome}</p>}
              </div>
              <div>
                <Label htmlFor="cat-line">Schedule C Line</Label>
                <Input
                  id="cat-line"
                  placeholder="Ex: Line 8, Line 22, COGS"
                  value={editForm.scheduleCLine}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, scheduleCLine: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Linha do Schedule C do IRS (Form 1040). Deixe vazio se não se aplica.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cat-dedutivel"
                  checked={editForm.dedutivel}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, dedutivel: e.target.checked }))}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  title="Despesa dedutível"
                />
                <Label htmlFor="cat-dedutivel">Despesa dedutível</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
