'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Se chegou até aqui, o middleware não redirecionou
    // Isso significa que o usuário está autenticado, redirecionar para dashboard
    router.replace('/dashboard')
  }, [router])

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-600 to-purple-700">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-lg">Carregando GladPros...</p>
        <p className="mt-2 text-sm opacity-80">Redirecionando para o painel...</p>
      </div>
    </div>
  )
}