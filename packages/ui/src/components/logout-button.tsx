// src/components/ui/LogoutButton.tsx
"use client"

import { useRouter } from "next/navigation"
import { useConfirm } from "./confirm-dialog"

export default function LogoutButton({ 
  children, 
  className = "text-red-600 hover:text-red-700 transition-colors" 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const router = useRouter()
  const { confirm } = useConfirm()

  async function handleLogout() {
    const confirmed = await confirm({
      title: "Confirmar Logout",
      message: "Tem certeza que deseja sair do sistema?",
      confirmText: "Sair",
      cancelText: "Cancelar",
      tone: "default"
    })

    if (!confirmed) return

    try {
      // Chamar API de logout
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        // Redirecionar para login
        router.push('/login')
      } else {
        console.error('Erro no logout:', response.statusText)
        // Mesmo assim redirecionar (fallback)
        router.push('/login')
      }
    } catch (error) {
      console.error('Erro no logout:', error)
      // Fallback: redirecionar mesmo com erro
      router.push('/login')
    }
  }

  return (
    <button onClick={handleLogout} className={className}>
      {children}
    </button>
  )
}
