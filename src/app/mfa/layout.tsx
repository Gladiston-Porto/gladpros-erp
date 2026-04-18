export const metadata = {
  title: 'Autenticação MFA - GladPros',
  description: 'Verificação de segurança em duas etapas',
}

export default function MFALayout({
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
