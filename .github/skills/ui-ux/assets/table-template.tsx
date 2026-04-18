// @ts-nocheck
/**
 * GladPros — Table Template
 *
 * Copy and adapt for listing pages with data tables.
 * Replace: columns, data type, API endpoint, MODULE_KEY
 *
 * Features:
 * - Sortable columns
 * - Search filter
 * - Pagination (AdvancedPagination)
 * - Empty state
 * - Bulk selection
 * - Role-based action columns
 * - Loading skeleton
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  Input,
  Button,
  Badge,
  Checkbox,
  Skeleton,
  AdvancedPagination,
} from "@gladpros/ui"
import { Search, ArrowUpDown, Plus, Trash2, Pencil } from "lucide-react"
import { can, type Role } from "@/shared/lib/rbac-core"
// import { EmptyState } from "@/components/estoque/shared/EmptyState"

// -- Data Type --
interface Item {
  id: number
  name: string
  status: string
  createdAt: string
}

// -- Module Config --
const MODULE_KEY = "clientes" as const
const API_ENDPOINT = "/api/clientes"
const PAGE_SIZE = 20

interface TableProps {
  userRole: string
}

export default function ModuleTable({ userRole }: TableProps) {
  const [data, setData] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const canCreate = can(userRole as Role, MODULE_KEY, "create")
  const canUpdate = can(userRole as Role, MODULE_KEY, "update")
  const canDelete = can(userRole as Role, MODULE_KEY, "delete")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search,
        sortField,
        sortOrder,
      })
      const res = await fetch(`${API_ENDPOINT}?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }, [page, search, sortField, sortOrder])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.map(i => i.id)))
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 rounded-2xl"
              aria-label="Buscar itens"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk delete */}
            {canDelete && selected.size > 0 && (
              <Button variant="destructive" size="sm" className="rounded-2xl min-h-12">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selected.size})
              </Button>
            )}

            {/* Create */}
            {canCreate && (
              <Button className="rounded-2xl min-h-12">
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <TableSkeleton />
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {/* Replace with EmptyState component */}
            <p>Nenhum item encontrado.</p>
            {canCreate && (
              <Button variant="outline" className="mt-4 rounded-2xl min-h-12">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro item
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selected.size === data.length}
                        onCheckedChange={toggleAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                  )}
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      Nome <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("createdAt")}
                    >
                      Criado em <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  {(canUpdate || canDelete) && (
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Selecionar ${item.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/Chicago",
                        dateStyle: "medium",
                      }).format(new Date(item.createdAt))}
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" aria-label={`Editar ${item.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" aria-label={`Excluir ${item.name}`}>
                              <Trash2 className="h-4 w-4 text-error" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <AdvancedPagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  )
}
