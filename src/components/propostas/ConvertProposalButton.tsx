'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { convertProposalToProject } from '@/app/actions/convert-proposal'

interface ConvertProposalButtonProps {
  propostaId: number
  projetoId?: number | null
  status: string
}

export function ConvertProposalButton({ propostaId, projetoId, status }: ConvertProposalButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Já convertida
  if (projetoId) {
    return (
      <a
        href={`/projetos/${projetoId}`}
        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        ✓ Ver Projeto #{projetoId}
      </a>
    )
  }

  // Só é possível converter propostas aprovadas ou enviadas
  const canConvert = ['APROVADA', 'ENVIADA', 'ASSINADA'].includes(status)

  if (!canConvert) {
    return null
  }

  async function handleConvert() {
    if (!confirm('Converter esta proposta em projeto? Esta ação não pode ser desfeita.')) return

    setLoading(true)
    setError(null)

    try {
      const result = await convertProposalToProject(propostaId)
      if (result.success && result.projetoId) {
        router.push(`/projetos/${result.projetoId}`)
      } else {
        setError(result.error || 'Erro desconhecido')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao converter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleConvert}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Convertendo...' : '🔄 Converter em Projeto'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
