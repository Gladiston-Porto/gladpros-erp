// src/app/(dashboard)/usuarios/page.tsx
"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@gladpros/ui/confirm-dialog";
import { useToast } from "@gladpros/ui/toast";
import { AdvancedPagination } from "@gladpros/ui/advanced-pagination";
import { Plus, Users } from "lucide-react";
import { Button } from '@gladpros/ui/button';
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Card, CardContent } from "@gladpros/ui/card";
import { usersApi } from '@/lib/api/client';
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { UsersTable } from "./_components/UsersTable";
import { UsersToolbar } from "./_components/UsersToolbar";
import type { SortKey, UserRole, Usuario } from "./_components/types";

// Funções temporárias
function exportUsersToCSV(users: Usuario[]): void {
  const headers = ['ID', 'Nome', 'Email', 'Nível', 'Status', 'Telefone', 'Cidade', 'Estado', 'Criado em'];
  const rows = users.map((u) => [
    u.id,
    u.nomeCompleto,
    u.email,
    u.role,
    (u.ativo ?? u.status === 'ATIVO') ? 'Ativo' : 'Inativo',
    u.telefone ?? '',
    u.cidade ?? '',
    u.estado ?? '',
    u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('en-US') : '',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function getUsers(params?: any, init?: RequestInit) {
  return usersApi.getUsers(params, init);
}

async function deleteUser(id: string | number) {
  return usersApi.deleteUser(id);
}

async function toggleUserStatus(id: string | number) {
  return usersApi.toggleUserStatus(id);
}

export default function UsersPage() {
  const router = useRouter();
  const { confirm, Dialog } = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"nome" | "email" | "role" | "ativo" | "criadoEm">("criadoEm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebouncedValue(q, 300);

  const updateQuery = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const updateRole = useCallback((value: string) => {
    setRole(value);
    setPage(1);
  }, []);

  const updateStatus = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await getUsers(
        { q: debouncedQuery, role, status, page, pageSize, sortKey, sortDir },
        { signal: ac.signal },
      );
      if (ac.signal.aborted) return;
      setData(res.items);
      setTotal(res.total);
    } catch (err: any) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      toast.error("Erro", err.message || "Erro ao carregar usuários");
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  }, [debouncedQuery, role, status, page, pageSize, sortKey, sortDir, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function onDelete(id: number) {
    const ok = await confirm({ title: "Remover usuário", message: "Tem certeza que deseja remover este usuário?", confirmText: "Remover", tone: "danger" });
    if (!ok) return;
    try {
      await deleteUser(String(id));
      toast.success('Removido', 'Usuário removido com sucesso');
      load();
    } catch (error) {
      toast.error('Erro', 'Falha ao remover usuário');
    }
  }

  async function onToggleStatus(id: number, currentStatus: boolean) {
    const action = currentStatus ? "desativar" : "ativar";
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} usuário`,
      message: `Tem certeza que deseja ${action} este usuário?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      tone: currentStatus ? "danger" : "default"
    });
    if (!ok) return;

    try {
      await toggleUserStatus(String(id));
      toast.success('Sucesso', 'Status atualizado');
      load();
    } catch (error) {
      toast.error('Erro', (error as Error).message || 'Erro ao alterar status do usuário');
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const heroStats = useMemo(() => {
    const roles: Record<UserRole, number> = {
      ADMIN: 0,
      GERENTE: 0,
      FINANCEIRO: 0,
      USUARIO: 0,
      ESTOQUE: 0,
      CLIENTE: 0,
    };

    let activeCount = 0;
    data.forEach((user) => {
      const isActive = user.ativo ?? (user.status === "ATIVO");
      if (isActive) activeCount += 1;
      roles[user.role] = (roles[user.role] ?? 0) + 1;
    });

    const inactiveCount = data.length - activeCount;
    const activeShare = total ? Math.min(100, Math.round((activeCount / Math.max(total, 1)) * 100)) : 0;
    const topRoles = Object.entries(roles)
      .sort(([, a], [, b]) => b - a)
      .map(([role, count]) => ({ role: role as UserRole, count }))
      .filter((entry) => entry.count > 0)
      .slice(0, 2);

    return {
      active: activeCount,
      inactive: inactiveCount,
      roles,
      topRoles,
      activeShare,
    };
  }, [data, total]);

  // Ações em lote
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const ok = await confirm({
      title: "Remover usuários",
      message: `Tem certeza que deseja remover ${selectedIds.length} usuário(s)?`,
      confirmText: "Remover",
      tone: "danger"
    });

    if (!ok) return;

    try {
      await Promise.all(selectedIds.map((id) => deleteUser(String(id))));
      toast.success('Removidos', `${selectedIds.length} usuário(s) removido(s) com sucesso`);
      setSelectedIds([]);
      load();
    } catch (error) {
      toast.error('Erro', 'Falha ao remover usuários');
    }
  };

  const handleBulkStatusChange = async (newStatus: boolean) => {
    if (selectedIds.length === 0) return;

    const action = newStatus ? "ativar" : "desativar";
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} usuários`,
      message: `Tem certeza que deseja ${action} ${selectedIds.length} usuário(s)?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      tone: newStatus ? "default" : "danger"
    });

    if (!ok) return;

    try {
      await Promise.all(selectedIds.map((id) => toggleUserStatus(String(id))));
      toast.success('Sucesso', `Status de ${selectedIds.length} usuário(s) alterado`);
      setSelectedIds([]);
      load();
    } catch (error) {
      toast.error('Erro', 'Erro ao alterar status dos usuários');
    }
  };

  const handleExport = () => {
    if (selectedIds.length === 0) return;
    const selectedUsers = data.filter((u) => selectedIds.includes(u.id));
    exportUsersToCSV(selectedUsers);
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Usuários"
        description="Gerencie acessos, funções e status de login"
        icon={<Users />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Usuários' },
        ]}
        actions={
          <Button asChild size="default">
            <Link href="/usuarios/novo">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        }
      />

      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="text-muted-foreground font-medium">{selectedIds.length} usuário(s) selecionado(s)</span>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <button type="button" onClick={() => handleBulkStatusChange(true)} className="rounded-md border border-border px-3 py-1 text-sm text-emerald-600 transition hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">Ativar</button>
              <button type="button" onClick={() => handleBulkStatusChange(false)} className="rounded-md border border-border px-3 py-1 text-sm text-amber-600 transition hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30">Desativar</button>
              <button type="button" onClick={handleBulkDelete} className="rounded-md border border-border px-3 py-1 text-sm text-destructive transition hover:border-destructive hover:bg-destructive/5">Excluir</button>
              <button type="button" onClick={handleExport} disabled={exporting} className="rounded-md border border-border px-3 py-1 text-sm text-primary transition hover:bg-muted disabled:cursor-wait disabled:opacity-60">{exporting ? 'Exportando...' : 'Exportar'}</button>
            </div>
          </CardContent>
        </Card>
      )}

      <UsersToolbar
        q={q}
        onQ={updateQuery}
        role={role}
        onRole={updateRole}
        status={status}
        onStatus={updateStatus}
        total={total}
        showNew={false}
        users={data.filter((u) => selectedIds.includes(u.id))}
        scope="selected"
        exporting={exporting}
        onExportAllFiltered={async (format) => {
          if (format === 'csv') {
            exportUsersToCSV(data);
          } else {
            setExporting(true);
            try {
              const blob = await usersApi.exportUsers('pdf', { q, role, status, sortKey, sortDir });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `usuarios.pdf`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Exportação', 'PDF baixado com sucesso');
            } catch (err: any) {
              toast.error('Erro', err.message || 'Falha ao exportar PDF');
            } finally {
              setExporting(false);
            }
          }
        }}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm opacity-60">Carregando…</div>
          ) : (
            <UsersTable
              data={data}
              onEdit={(id) => router.push(`/usuarios/${id}`)}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              onSelectedChange={setSelectedIds}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(k, d) => { setSortKey(k); setSortDir(d); }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog />

      <AdvancedPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
        }}
        className="mt-4"
      />
    </div>
  );
}
