"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  FolderKanban,
  Package,
  FolderOpen,
  BarChart3,
  ClipboardList,
  UserCog,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowLeftRight,
  ArrowDownLeft,
  Receipt,
  HandCoins,
  Wallet,
  Calculator,
  ShieldCheck,
  Activity,
  Plug,
  UserCircle,
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  Settings,
  Camera,
  KeyRound,
  Sliders,
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Briefcase,
} from "lucide-react";
import { useConfirm } from "@gladpros/ui/confirm-dialog";
import { useTheme } from "@/components/ThemeProvider";
import { ToastContainer } from "@gladpros/ui/toast";
import type { Role } from "@/shared/lib/rbac-core";
import { filterNavGroupsByRole } from "@/shared/lib/sidebar-rbac";

/**
 * =============================
 * GladPros — DashboardShell (CLIENT)
 * =============================
 * OBJETIVO: Remover a duplicação do Sidebar nas páginas.
 * USO:
 *  - O layout server-side do dashboard (app/(dashboard)/layout.tsx) deve importar ESTE componente
 *    e envolver {children}. A page.tsx de cada módulo renderiza SOMENTE o conteúdo do módulo.
 *
 * EXEMPLO (server layout):
 *  import { requireServerUser } from "@/lib/requireServerUser";
 *  import DashboardShell from "@/components/GladPros";
 *  export default async function Layout({ children }) {
 *    const user = await requireServerUser();
 *    return <DashboardShell user={user}>{children}</DashboardShell>;
 *  }
 */

// Tipos mínimos
export type UserRole = "ADMIN" | "GERENTE" | "FINANCEIRO" | "USUARIO" | "ESTOQUE" | "CLIENTE";
export type AppUser = { name: string; role: UserRole; avatarUrl?: string };
export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; requiredRoles?: Role[] };
export type NavGroup = { title?: string; items: NavItem[] };

// Navegação padrão do GladPros (pode ser sobrescrita via prop se desejar)
export const DEFAULT_NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "COMERCIAL",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/propostas", label: "Propostas", icon: ScrollText },
      { href: "/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/ordens-servico", label: "Ordens de Serviço", icon: ClipboardList },
    ]
  },
  {
    title: "OPERACIONAL",
    items: [
      { href: "/estoque", label: "Estoque", icon: Package },
      { href: "/documentos", label: "Documentos", icon: FolderOpen },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    ]
  },
  {
    title: "PESSOAS",
    items: [
      { href: "/rh/workers", label: "Workers", icon: UserCog },
    ]
  },
  {
    title: "FINANCEIRO",
    items: [
      { href: "/dashboard/financeiro", label: "Visão Geral", icon: TrendingUp },
      { href: "/dashboard/financeiro/receitas", label: "Receitas", icon: ArrowDownLeft },
      { href: "/dashboard/financeiro/despesas", label: "Despesas", icon: TrendingDown },
      { href: "/dashboard/financeiro/contas", label: "Contas", icon: CreditCard },
      { href: "/dashboard/financeiro/transferencias", label: "Transferências", icon: ArrowLeftRight },
      { href: "/dashboard/financeiro/fluxo-caixa", label: "Fluxo de Caixa", icon: Wallet },
      { href: "/dashboard/financeiro/conciliacao", label: "Conciliação", icon: RefreshCw },
      { href: "/dashboard/financeiro/relatorios", label: "Relatórios", icon: BarChart3 },
    ]
  },
  {
    title: "FATURAMENTO",
    items: [
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/invoices/relatorios", label: "Relatórios de Invoices", icon: BarChart3 },
    ]
  },
  {
    title: "FISCAL",
    items: [
      { href: "/dashboard/financeiro/fiscal", label: "Painel Fiscal", icon: Calculator },
      { href: "/dashboard/financeiro/fiscal/impostos-estimados", label: "Impostos Estimados", icon: Bell },
      { href: "/dashboard/financeiro/payables", label: "Payables (1099)", icon: HandCoins },
      { href: "/dashboard/financeiro/fiscal/compensacao", label: "Compensação do Owner", icon: Wallet },
      { href: "/dashboard/financeiro/fiscal/relatorios", label: "Relatórios Fiscais", icon: BarChart3 },
      { href: "/dashboard/financeiro/fiscal/categorias", label: "Categorias Fiscais", icon: ClipboardList },
    ]
  },
  {
    title: "SISTEMA",
    items: [
      { href: "/usuarios", label: "Usuários", icon: ShieldCheck },
      { href: "/admin/eventos", label: "Eventos", icon: Activity, requiredRoles: ["ADMIN"] },
      { href: "/admin/integracao", label: "Integração", icon: Plug, requiredRoles: ["ADMIN"] },
      { href: "/perfil", label: "Perfil", icon: UserCircle },
    ]
  }
];

// Mapa de cores por nível - Padrão v2.0
// Usando as cores semânticas mapeadas em colors.ts e globals.css
const ROLE_THEME: Record<UserRole, { chip: string; glow: string }> = {
  ADMIN: { chip: "bg-brand-primary text-white", glow: "shadow-[0_0_0_3px_rgba(0,152,218,0.2)]" },
  GERENTE: { chip: "bg-brand-secondary text-white", glow: "shadow-[0_0_0_3px_rgba(255,140,0,0.2)]" },
  FINANCEIRO: { chip: "bg-warning text-white", glow: "shadow-[0_0_0_3px_rgba(245,158,11,0.2)]" }, // Warning
  USUARIO: { chip: "bg-brand-primary text-white", glow: "shadow-[0_0_0_3px_rgba(0,152,218,0.2)]" },
  ESTOQUE: { chip: "bg-info text-white", glow: "shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" }, // Info
  CLIENTE: { chip: "bg-error text-white", glow: "shadow-[0_0_0_3px_rgba(239,68,68,0.2)]" }, // Error/Danger
};

// =============================
// DASHBOARD SHELL (DEFAULT EXPORT)
// =============================
export default function DashboardShell({
  user,
  children,
  groups = DEFAULT_NAV_GROUPS,
}: {
  user: AppUser;
  children: React.ReactNode;
  groups?: NavGroup[];
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const { confirm, Dialog } = useConfirm();
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  const roleTheme = useMemo(() => ROLE_THEME[(user?.role || "USUARIO") as UserRole], [user?.role]);
  const filteredGroups = useMemo(() => filterNavGroupsByRole(groups, (user?.role || "USUARIO") as Role), [groups, user?.role]);

  // Logout unificado (confirmação + chamada API + redirecionamento)
  const handleLogout = async () => {
    if (isLoggingOut) return;
    const ok = await confirm({ title: "Sair", message: "Deseja encerrar a sessão?", confirmText: "Sair", tone: "danger" });
    if (!ok) return;
    setIsLoggingOut(true);
    try {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch { }
      // Limpeza defensiva de localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
    } finally {
      window.location.href = "/login";
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background" data-testid="shell-root">
      {/* HEADER */}
      <HeaderBar
        collapsed={collapsed}
        roleTheme={roleTheme}
        user={user}
        theme={theme}
        onToggleTheme={() => {
          const newTheme = theme === "light" ? "dark" : "light";
          setTheme(newTheme);
        }}
      />

      {/* SIDEBAR */}
      <Sidebar
        groups={filteredGroups}
        activeHref={pathname || "/dashboard"}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* CONTENT */}
      <div className={`${collapsed ? "pl-[84px]" : "pl-[280px]"} pt-16 transition-all duration-300`}>
        <main className="mx-auto max-w-[1440px] p-5 sm:p-6 lg:p-8" data-testid="shell-content">
          {children}
        </main>
      </div>
      {/* Global confirm dialog mount for this shell */}
      <Dialog />
      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

// =============================
// HEADER BAR
// =============================
export function HeaderBar({
  collapsed,
  roleTheme,
  user,
  theme,
  onToggleTheme,
}: {
  collapsed: boolean;
  roleTheme: { chip: string; glow: string };
  user: AppUser;
  theme: "light" | "dark";
  onToggleTheme: () => void;
 
}) {
  const _router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const profileMenuItems = [
    { label: 'Meu Perfil', href: '/perfil', icon: UserCircle },
    { label: 'Foto de Perfil', href: '/perfil?tab=avatar', icon: Camera },
    { label: 'Segurança', href: '/perfil?tab=security', icon: KeyRound },
    { label: 'Preferências', href: '/perfil?tab=preferences', icon: Sliders },
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl backdrop-saturate-150 dark:bg-background/70">
      <div className={`mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 ${collapsed ? "pl-24" : "pl-72"} transition-all duration-300`}>
        <div className="flex items-center gap-2">
          <span className="font-display text-base opacity-70">GladPros</span>
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleTheme.chip}`}>{user.role}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative hidden md:flex">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar…"
              className="w-[240px] rounded-xl border border-input bg-muted/50 px-9 py-2 text-sm outline-none placeholder:text-muted-foreground transition-all duration-200 focus:w-[300px] focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
            />
          </div>
          <button className="relative rounded-xl p-2 transition-colors duration-150 hover:bg-accent" aria-label="Alertas">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-content-center rounded-full bg-brand-secondary text-[10px] font-medium text-white animate-pulse-soft">3</span>
          </button>
          <button onClick={onToggleTheme} className="rounded-xl p-2 transition-colors duration-150 hover:bg-accent" aria-label="Alternar tema">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setProfileMenuOpen(v => !v)}
              className={`rounded-xl p-2 transition-colors duration-150 hover:bg-accent ${profileMenuOpen ? 'bg-accent' : ''}`}
              aria-label={profileMenuOpen ? 'Fechar menu de perfil' : 'Abrir menu de perfil'}
              aria-haspopup="true"
            >
              <Settings className="h-5 w-5" />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-border bg-popover shadow-lg py-1 animate-in fade-in slide-in-from-top-2">
                {profileMenuItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className={`ml-1 hidden items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 md:flex ${roleTheme.glow}`}>
            <Image
              src={user.avatarUrl || "/images/LOGO_200.png"}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full border border-border object-cover"
              alt="avatar"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (target.src.endsWith("/images/LOGO_200.png")) return
                target.src = "/images/LOGO_200.png"
              }}
            />
            <div className="mr-1 hidden sm:block">
              <div className="text-xs font-medium">{user.name}</div>
              <div className="text-[10px] text-muted-foreground">Sessão ativa</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// =============================
// SIDEBAR
// =============================
export function Sidebar({
  groups,
  activeHref,
  collapsed,
  onToggle,
  onLogout,
  isLoggingOut = false,
}: {
  groups: NavGroup[];
  activeHref: string;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
}) {
  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen ${collapsed ? "w-[84px]" : "w-[280px]"} transition-all duration-300`} aria-label="Sidebar" data-testid="shell-sidebar">
      <div
        className="relative flex h-full flex-col border-r border-white/10 bg-hero-gradient text-white dark:border-white/5"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-3">
            {collapsed ? (
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-white/10 shadow-md overflow-hidden">
                <Image src="/images/LOGO_ICONE2.png" alt="GP" width={36} height={36} />
              </div>
            ) : (
              <div className="relative h-9 w-[140px] leading-tight filter brightness-0 invert">
                <Image
                  src="/images/LOGO_200.png"
                  alt="GladPros"
                  fill
                  className="object-contain"
                  sizes="140px"
                  priority
                />
              </div>
            )}
          </div>
          <button onClick={onToggle} className="rounded-xl p-2 hover:bg-white/10 transition-colors duration-150" aria-label="Alternar sidebar">
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="mb-1">
              {!collapsed && group.title && (
                <div className="mb-1 mt-3 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35 select-none">
                  {group.title}
                </div>
              )}
              {collapsed && group.title && <div className="my-2 h-px bg-white/10 mx-2" />}

              {group.items.map((item, idx) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={activeHref === item.href || (activeHref?.startsWith(item.href) && item.href !== "/")}
                  collapsed={collapsed}
                  delay={idx * 0.03}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 pb-4 pt-3">
          <button
            onClick={onLogout}
            disabled={isLoggingOut}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              collapsed ? "justify-center" : ""
            } ${
              isLoggingOut
                ? "cursor-not-allowed text-white/40"
                : "text-white/55 hover:text-white hover:bg-white/10"
            }`}
            data-testid="sidebar-logout"
            {...(isLoggingOut ? { 'aria-busy': true } : {})}
          >
            {isLoggingOut ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/70 shrink-0" />
                {!collapsed && <span>Saindo…</span>}
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </>
            )}
          </button>
          {!collapsed && (
            <div className="mt-2 text-center text-[9px] text-white/25 tracking-widest">v3.0 · GladPros</div>
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  delay = 0,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  collapsed: boolean;
  delay?: number;
}) {
  return (
    <Link href={href} className="relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl">
      {/* Active accent bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-white z-10"
          aria-hidden
        />
      )}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        title={collapsed ? label : undefined}
        className={`my-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150 ${
          active
            ? "bg-white/15 font-semibold text-white"
            : "text-white/65 hover:text-white hover:bg-white/8"
        }`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-white/60"}`} />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="truncate leading-snug"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
}

// =============================
// Painel genérico reutilizável
// =============================
export function Panel({ title, badge, className = "", children }: { title: string; badge?: number; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover ${className}`} data-testid="panel">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">{title}</h3>
        {typeof badge === "number" && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">{badge}</span>}
      </div>
      {children ? (
        <div>{children}</div>
      ) : (
        <div className="grid h-44 place-content-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">Área para gráficos/visualizações</div>
      )}
    </div>
  );
}
