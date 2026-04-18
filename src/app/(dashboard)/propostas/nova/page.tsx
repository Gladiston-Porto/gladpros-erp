// src/app/propostas/nova/page.tsx
import PropostaForm from "@/components/propostas/PropostaForm";
import { ClientesProvider } from "@/components/propostas/ClientesContext";

export default function NovaPropostaPage() {
  return (
    <ClientesProvider>
      <PropostaForm />
    </ClientesProvider>
  );
}
