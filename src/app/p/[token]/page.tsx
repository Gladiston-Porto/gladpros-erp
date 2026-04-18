import { notFound } from 'next/navigation'
import ClientPropostaView from '@/components/propostas/ClientPropostaView'
import { prisma } from '@/lib/prisma'
import { PropostaWithRelations } from '@/shared/types/propostas'

interface Props {
  params: Promise<{
    token: string
  }>
}

async function getPropostaByToken(token: string): Promise<PropostaWithRelations | null> {
  try {
    const raw = await prisma.proposta.findFirst({
      where: {
        tokenPublico: token,
        deletedAt: null
      },
      include: {
        Cliente: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            razaoSocial: true,
          }
        },
        PropostaEtapa: {
          orderBy: { id: 'asc' }
        },
        PropostaMaterial: {
          orderBy: { id: 'asc' }
        },
        AnexoProposta: {
          orderBy: { criadoEm: 'asc' }
        },
        PropostaLog: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!raw) return null

    // Map Prisma relation names (PascalCase) to UI type names (camelCase)
    return {
      ...raw,
      cliente: raw.Cliente,
      etapas: raw.PropostaEtapa,
      materiais: raw.PropostaMaterial,
      anexos: raw.AnexoProposta,
      logs: raw.PropostaLog,
    } as unknown as PropostaWithRelations
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return null
  }
}

export default async function ClientPropostaPage({ params }: Props) {
  const { token } = await params
  const proposta = await getPropostaByToken(token)

  if (!proposta) {
    notFound()
  }

  return <ClientPropostaView proposta={proposta} token={token} />
}

// Generate metadata
export async function generateMetadata({ params }: Props) {
  const { token } = await params
  const proposta = await getPropostaByToken(token)

  if (!proposta) {
    return {
      title: 'Proposta não encontrada'
    }
  }

  return {
    title: `Proposta ${proposta.numeroProposta} - GladPros`,
    description: `Visualização da proposta comercial ${proposta.numeroProposta}`,
  }
}
