export const metadata = {
  title: 'Login - GladPros',
  description: 'Sistema de autenticação GladPros',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
