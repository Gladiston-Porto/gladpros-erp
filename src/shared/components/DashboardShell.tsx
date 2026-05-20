"use client"

import { Sidebar, DEFAULT_NAV_GROUPS } from "@/shared/components/GladPros"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@gladpros/ui/toast"
import { useConfirm } from "@gladpros/ui/confirm-dialog"
import React from "react"

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const { confirm, Dialog } = useConfirm()
  const [collapsed, setCollapsed] = React.useState(false)

  async function handleLogout() {
    const ok = await confirm({ title: 'Sair', message: 'Deseja encerrar a sessão?', confirmText: 'Sair', tone: 'danger' })
    if (!ok) return
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      toast.success('Até logo', 'Sessão encerrada')
      router.push('/login')
    } else {
      let msg = 'Não foi possível sair'
      try { const j = await res.json(); msg = j?.error || msg } catch {}
      toast.error('Erro', msg)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        groups={DEFAULT_NAV_GROUPS}
        activeHref={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onLogout={handleLogout}
      />
      <div className="flex-1 overflow-auto">{children}</div>
      <Dialog />
    </div>
  )
}

export function Panel({ title, badge, className = "", children }: {
  title: string;
  badge?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">{title}</h3>
        {typeof badge === "number" && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">{badge}</span>
        )}
      </div>
      {children ? (
        <div>{children}</div>
      ) : (
        <div className="grid h-44 place-content-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Área para gráficos/visualizações
        </div>
      )}
    </div>
  )
}
