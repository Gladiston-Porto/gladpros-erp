
import { prisma } from "@/lib/prisma";
import PropostaForm from "@/components/propostas/PropostaForm";
import { adaptAPIToPropostaForm, PropostaComRelacoes } from "@/components/propostas/adapter";
import { notFound } from "next/navigation";
import { ClientesProvider } from "@/components/propostas/ClientesContext";
import { ConvertProposalButton } from "@/components/propostas/ConvertProposalButton";
import { Button } from "@gladpros/ui/button";
import { Download } from "lucide-react";

interface PropostaPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PropostaPageProps) {
  const { id } = await params
  return {
    title: `Editar Proposta ${id}`,
    description: `Detalhes da proposta ${id}`
  }
}

export default async function PropostaPage({ params }: PropostaPageProps) {
  const { id } = await params
  const propostaId = parseInt(id)

  if (isNaN(propostaId)) {
    return notFound()
  }

  const proposta = await prisma.proposta.findUnique({
    where: { id: propostaId },
    include: {
      PropostaMaterial: true,
      PropostaEtapa: true,
      Cliente: true
    }
  })

  if (!proposta) {
    return notFound()
  }

  const formData = adaptAPIToPropostaForm(proposta as unknown as PropostaComRelacoes);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-4">
        <a href={`/api/propostas/${proposta.id}/pdf`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Download PDF
          </Button>
        </a>
        <ConvertProposalButton
          propostaId={proposta.id}
          projetoId={proposta.projetoId}
          status={proposta.status}
        />
      </div>
      <ClientesProvider>
        <PropostaForm initialData={formData} propostaId={id} />
      </ClientesProvider>
    </div>
  );
}
