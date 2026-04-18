import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Usuários - GladPros',
  description: 'Gerenciamento de usuários do sistema',
}

export default function UsuariosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  )
}