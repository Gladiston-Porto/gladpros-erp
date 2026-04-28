
import { prisma } from "@/lib/prisma";
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { can, type Role } from '@/shared/lib/rbac-core';
import PropostaForm from "@/components/propostas/PropostaForm";
import { adaptAPIToPropostaForm, PropostaComRelacoes } from "@/components/propostas/adapter";
import { notFound, redirect } from "next/navigation";
import { ClientesProvider } from "@/components/propostas/ClientesContext";
import { ConvertProposalButton } from "@/components/propostas/ConvertProposalButton";
import { AprovacoesInternasPanel } from "@/components/propostas/AprovacoesInternasPanel";
import { GerarInvoiceButton } from "@/components/propostas/GerarInvoiceButton";
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

function getDiasSemResposta(enviadaParaOCliente: Date): number {
  return Math.floor((Date.now() - enviadaParaOCliente.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function PropostaPage({ params }: PropostaPageProps) {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'propostas', 'read')) redirect('/403');

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

  const diasSemResposta =
    proposta.status === 'ENVIADA' && proposta.enviadaParaOCliente
      ? getDiasSemResposta(proposta.enviadaParaOCliente)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-4 flex-wrap">
        {diasSemResposta !== null && diasSemResposta >= 3 && (
          <span
            className={[
              'inline-flex items-center rounded-2xl px-3 py-1 text-xs font-medium border',
              diasSemResposta > 7
                ? 'bg-destructive/10 text-destructive border-destructive/30'
                : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
            ].join(' ')}
          >
            Enviada há {diasSemResposta} dia{diasSemResposta !== 1 ? 's' : ''} sem resposta
          </span>
        )}

        <a href={`/api/propostas/${proposta.id}/pdf`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Download PDF
          </Button>
        </a>

        <GerarInvoiceButton propostaId={proposta.id} status={proposta.status} />

        <ConvertProposalButton
          propostaId={proposta.id}
          projetoId={proposta.projetoId}
          status={proposta.status}
        />
      </div>

      {(can(user.role as Role, 'propostas', 'update') &&
        ['ADMIN', 'FINANCEIRO', 'GERENTE'].includes(user.role)) && (
        <AprovacoesInternasPanel
          propostaId={proposta.id}
          aprovacaoInternaFinanceira={proposta.aprovacaoInternaFinanceira ?? false}
          aprovacaoInternaTecnica={proposta.aprovacaoInternaTecnica ?? false}
          userRole={user.role}
        />
      )}

      <ClientesProvider>
        <PropostaForm initialData={formData} propostaId={id} />
      </ClientesProvider>
    </div>
  );
}
