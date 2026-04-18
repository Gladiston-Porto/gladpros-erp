import { PropostaFormModular } from '@/components/propostas/PropostaFormModular'
import { ClientesProvider } from '@/components/propostas/ClientesContext'

export default function PropostaModularPage() {
  return (
    <ClientesProvider>
      <PropostaFormModular />
    </ClientesProvider>
  )
}
