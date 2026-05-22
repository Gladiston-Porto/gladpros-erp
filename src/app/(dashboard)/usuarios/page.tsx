// src/app/(dashboard)/usuarios/page.tsx
"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@gladpros/ui/confirm-dialog";
import { useToast } from "@gladpros/ui/toast";
import { AdvancedPagination } from "@gladpros/ui/advanced-pagination";
import { TableSkeleton } from "@gladpros/ui/loading";
import { ChevronDown, Download, FileText, Plus, Shield, Users, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { Button } from '@gladpros/ui/button';
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Card, CardContent } from "@gladpros/ui/card";
import { StatCard } from "@gladpros/ui/stat-card";
import { usersApi } from '@/lib/api/client';
import { UserViewDrawer } from "./_components/UserViewDrawer";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { UsersTable } from "./_components/UsersTable";
import { UsersToolbar } from "./_components/UsersToolbar";
import type { UserRole, Usuario } from "./_components/types";

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
    u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }) : '',
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

async function getUsers(params?: Record<string, string | number | undefined>, init?: RequestInit) {
  return usersApi.getUsers(params, init);
}

async function toggleUserStatus(id: string | number) {
  return usersApi.toggleUserStatus(id);
}

async function resendWelcomeEmail(id: number) {
  const res = await fetch(`/api/usuarios/${id}/resend-welcome`, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro ao reenviar email");
  return json;
}

async function unlockUserAccount(id: number) {
  const res = await fetch(`/api/usuarios/${id}/unlock`, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro ao desbloquear conta");
  return json;
}

export default function UsersPage() {
  const router = useRouter();
  const { confirm, Dialog } = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [primeiroAcesso, setPrimeiroAcesso] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [inactiveAlert, setInactiveAlert] = useState<{ count: number; days: number } | null>(null);
  const [sortKey, setSortKey] = useState<"nome" | "email" | "role" | "ativo" | "criadoEm">("criadoEm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [bulkExportMenuOpen, setBulkExportMenuOpen] = useState(false);
  const bulkExportMenuRef = useRef<HTMLDivElement>(null);
  const [viewUserId, setViewUserId] = useState<number | null>(null);
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

  const updatePrimeiroAcesso = useCallback((value: string) => {
    setPrimeiroAcesso(value);
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await getUsers(
        { q: debouncedQuery, role, status, primeiroAcesso: primeiroAcesso || undefined, page, pageSize, sortKey, sortDir },
        { signal: ac.signal },
      );
      if (ac.signal.aborted) return;
      setData(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : 'Erro ao carregar usuários';
      toast.error("Erro", message || "Erro ao carregar usuários");
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  }, [debouncedQuery, role, status, primeiroAcesso, page, pageSize, sortKey, sortDir, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Buscar alerta de usuários sem login recente (30 dias) — uma vez ao montar
  useEffect(() => {
    fetch("/api/usuarios/alerts/inactive?days=30")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setInactiveAlert({ count: json.data.count, days: json.data.days });
        }
      })
      .catch(() => {
        // silencioso — alerta é informativo, não crítico
      });
  }, []);

  async function onToggleStatus(id: number, currentStatus: boolean) {
    const action = currentStatus ? "desativar" : "ativar";
    const targetUser = data.find((u) => u.id === id);
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} usuário`,
      message: `Tem certeza que deseja ${action} este usuário?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      tone: currentStatus ? "danger" : "default",
      subject: targetUser
        ? { name: targetUser.nomeCompleto, description: targetUser.email, avatarUrl: targetUser.avatarUrl }
        : undefined,
      impactNote: currentStatus ? "O histórico e os dados do usuário serão preservados." : undefined,
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

  async function onResendWelcome(id: number) {
    const targetUser = data.find((u) => u.id === id);
    const ok = await confirm({
      title: "Reenviar email de boas-vindas",
      message: "Isso irá gerar uma nova senha provisória e um novo link de acesso para o usuário. Continuar?",
      confirmText: "Reenviar",
      tone: "default",
      subject: targetUser
        ? { name: targetUser.nomeCompleto, description: targetUser.email, avatarUrl: targetUser.avatarUrl }
        : undefined,
    });
    if (!ok) return;

    try {
      await resendWelcomeEmail(id);
      toast.success("Email enviado", `Email de boas-vindas reenviado para ${targetUser?.email ?? "o usuário"}`);
    } catch (error) {
      toast.error("Erro", (error as Error).message || "Erro ao reenviar email");
    }
  }

  async function onUnlock(id: number) {
    const targetUser = data.find((u) => u.id === id);
    const ok = await confirm({
      title: "Desbloquear conta",
      message: `A conta de ${targetUser?.nomeCompleto ?? "este usuário"} foi bloqueada por tentativas excessivas de login. Deseja desbloquear agora?`,
      confirmText: "Desbloquear",
      tone: "default",
      subject: targetUser
        ? { name: targetUser.nomeCompleto, description: targetUser.email, avatarUrl: targetUser.avatarUrl }
        : undefined,
    });
    if (!ok) return;

    try {
      await unlockUserAccount(id);
      toast.success("Conta desbloqueada", `A conta de ${targetUser?.nomeCompleto ?? "o usuário"} foi desbloqueada.`);
      load();
    } catch (error) {
      toast.error("Erro", (error as Error).message || "Erro ao desbloquear conta");
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
    let linkExpiradoCount = 0;
    data.forEach((user) => {
      const isActive = user.ativo ?? (user.status === "ATIVO");
      if (isActive) activeCount += 1;
      if (user.linkExpirado === true) linkExpiradoCount += 1;
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
      linkExpiradoCount,
      roles,
      topRoles,
      activeShare,
    };
  }, [data, total]);

  // Ações em lote
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
      setSelectionResetKey(k => k + 1);
      load();
     
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Erro', 'Erro ao alterar status dos usuários');
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedIds.length === 0) return;
    setBulkExportMenuOpen(false);
    const selectedUsers = data.filter((u) => selectedIds.includes(u.id));
    exportUsersToCSV(selectedUsers);
  };

  const handleBulkExportPDF = async () => {
    if (selectedIds.length === 0) return;
    setBulkExportMenuOpen(false);
    setExporting(true);
    try {
      const res = await fetch('/api/usuarios/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ids: selectedIds,
          filename: `usuarios-selecionados-${new Date().toISOString().slice(0, 10)}.pdf`,
        }),
      });
      if (!res.ok) throw new Error('Falha ao exportar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios-selecionados-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportado', 'PDF gerado com sucesso.');
    } catch {
      toast.error('Erro', 'Não foi possível exportar o PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      const filters = { q: debouncedQuery || undefined, role: role || undefined, status: status || undefined };
      const res = await fetch('/api/usuarios/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filters }),
      });
      if (!res.ok) throw new Error('Falha ao exportar CSV');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportado', 'CSV gerado com sucesso.');
    } catch {
      toast.error('Erro', 'Não foi possível exportar o CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      const filters = { q: debouncedQuery || undefined, role: role || undefined, status: status || undefined };
      const res = await fetch('/api/usuarios/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filters, filename: `usuarios-${new Date().toISOString().slice(0, 10)}.pdf` }),
      });
      if (!res.ok) throw new Error('Falha ao exportar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportado', 'PDF gerado com sucesso.');
    } catch {
      toast.error('Erro', 'Não foi possível exportar o PDF.');
    } finally {
      setExporting(false);
    }
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (bulkExportMenuRef.current && !bulkExportMenuRef.current.contains(e.target as Node)) {
        setBulkExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <div className="flex items-center gap-2">
            <div ref={exportMenuRef} className="relative">
              <Button
                variant="outline"
                size="default"
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={exporting}
                title="Exportar"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{exporting ? 'Exportando…' : 'Exportar'}</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted"
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    Exportar PDF
                  </button>
                </div>
              )}
            </div>
            <Button asChild size="default">
              <Link href="/usuarios/novo">
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de usuários" value={total} icon={<Users className="h-5 w-5" />} compact />
        <StatCard
          title="Ativos"
          value={heroStats.active}
          icon={<UserCheck className="h-5 w-5" />}
          description={`${heroStats.activeShare}% do total`}
          compact
        />
        <StatCard title="Inativos" value={heroStats.inactive} icon={<UserX className="h-5 w-5" />} compact />
        <StatCard title="Administradores" value={heroStats.roles.ADMIN} icon={<Shield className="h-5 w-5" />} compact />
      </div>

      {/* Alerta: usuários ativos sem login recente */}
      {inactiveAlert !== null && inactiveAlert.count > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{inactiveAlert.count} usuário(s) ativo(s)</strong> não fazem login há mais de{" "}
            <strong>{inactiveAlert.days} dias</strong>. Considere revisar essas contas.
          </span>
        </div>
      )}

      {/* Alerta: links de primeiro acesso expirados nesta página */}
      {heroStats.linkExpiradoCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{heroStats.linkExpiradoCount} usuário(s)</strong> com link de primeiro acesso expirado (mais de 7 dias).
            Use o botão <strong>Reenviar email</strong> para gerar um novo link.
          </span>
        </div>
      )}

      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="text-muted-foreground font-medium">{selectedIds.length} usuário(s) selecionado(s)</span>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <button type="button" onClick={() => handleBulkStatusChange(true)} className="rounded-md border border-border px-3 py-1 text-sm text-emerald-600 transition hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">Ativar</button>
              <button type="button" onClick={() => handleBulkStatusChange(false)} className="rounded-md border border-border px-3 py-1 text-sm text-amber-600 transition hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30">Desativar</button>
              <div ref={bulkExportMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setBulkExportMenuOpen((v) => !v)}
                  disabled={exporting}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-sm text-primary transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? 'Exportando...' : 'Exportar'}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {bulkExportMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                    <button
                      type="button"
                      onClick={handleBulkExportCSV}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Exportar CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkExportPDF}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 text-red-500" />
                      Exportar PDF
                    </button>
                  </div>
                )}
              </div>
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
        primeiroAcesso={primeiroAcesso}
        onPrimeiroAcesso={updatePrimeiroAcesso}
        total={total}
        showNew={false}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={8} columns={7} />
            </div>
          ) : (
            <UsersTable
              data={data}
              onEdit={(id) => router.push(`/usuarios/${id}`)}
              onView={(id) => setViewUserId(id)}
              onToggleStatus={onToggleStatus}
              onResendWelcome={onResendWelcome}
              onUnlock={onUnlock}
              onSelectedChange={setSelectedIds}
              resetKey={selectionResetKey}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(k, d) => { setSortKey(k); setSortDir(d); }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog />

      <UserViewDrawer userId={viewUserId} onClose={() => setViewUserId(null)} />

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
