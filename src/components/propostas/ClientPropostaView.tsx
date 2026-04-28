'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Checkbox } from "@gladpros/ui/checkbox"
import { Input } from "@gladpros/ui/input"
import { PDFExportButton } from "@gladpros/ui/pdfexport-button"
import { SignaturePad } from "@gladpros/ui/signature-pad";
import { cn, formatCurrency, formatDate } from "@/shared/lib/utils";
import { StatusProposta, StatusPropostaValues, PropostaWithRelations as PropostaWithDetails } from '@/shared/types/propostas';
import { 
  FileText,
  DollarSign,
  Building2,
  Mail,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ClientPropostaViewProps {
  proposta: PropostaWithDetails
  token: string
}

export default function ClientPropostaView({ proposta, token }: ClientPropostaViewProps) {
  const [loading, setLoading] = useState(false)
  const [signature, setSignature] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [clientName, setClientName] = useState(
    proposta.cliente?.nomeCompleto || proposta.cliente?.razaoSocial || ''
  )
  const router = useRouter()

  const handleSign = async () => {
    if (!signature.trim() || !termsAccepted || !clientName.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios e assine.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/client/proposta/${token}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assinaturaCliente: clientName,
          assinaturaImagem: signature,
          aceiteTermos: termsAccepted,
          ip: await getClientIP(),
          userAgent: navigator.userAgent
        })
      })

      if (!response.ok) {
        const _error = await response.json()
        throw new Error(_error.message || 'Erro ao assinar proposta')
      }

      alert('Proposta assinada com sucesso!')
      router.refresh()

    } catch (error) {
      alert('Erro ao assinar proposta: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return 'unknown'
    }
  }

  const getStatusColor = (status: StatusProposta) => {
    switch (status) {
      case StatusPropostaValues.RASCUNHO:
        return 'bg-muted text-muted-foreground'
      case StatusPropostaValues.ENVIADA:
        return 'bg-brand-primary/10 text-brand-primary'
      case StatusPropostaValues.ASSINADA:
        return 'bg-yellow-500/10 text-yellow-600'
      case StatusPropostaValues.APROVADA:
        return 'bg-green-500/10 text-green-600'
      case StatusPropostaValues.CANCELADA:
        return 'bg-destructive/10 text-destructive'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const canSign = proposta.status === StatusPropostaValues.ENVIADA

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header with Export Button */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <FileText className="h-8 w-8 text-brand-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-white">
                  Proposta Comercial
                </h1>
                <p className="text-muted-foreground">
                  {proposta.numeroProposta} • {formatDate(proposta.dataCriacao)}
                </p>
              </div>
            </div>
            
            <Badge className={getStatusColor(proposta.status)}>
              {proposta.status}
            </Badge>
          </div>

          <div className="flex gap-2">
            <PDFExportButton
              elementId="proposta-content"
              filename={`proposta-${proposta.numeroProposta}.pdf`}
              className="hidden print:hidden"
            >
              <FileText className="h-4 w-4 mr-2" />
              Baixar PDF
            </PDFExportButton>
          </div>
        </div>

        {/* Main Content */}
        <div id="proposta-content">
        
        {/* Client Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
                <p className="font-semibold">
                  {proposta.cliente?.nomeCompleto || proposta.cliente?.razaoSocial}
                </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{proposta.cliente?.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalhes da Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Descrição</h4>
              <p>{proposta.descricaoEscopo}</p>
              {proposta.observacoesParaCliente && (
                <p className="text-muted-foreground mt-2">{proposta.observacoesParaCliente}</p>
              )}
            </div>

            {proposta.valorEstimado && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valor Estimado
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(Number(proposta.valorEstimado))}
                </p>
              </div>
            )}

            {proposta.permite === 'SIM' && proposta.quaisPermites && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Permites Necessários
                </h4>
                <p>{proposta.quaisPermites}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Etapas */}
        {proposta.etapas && proposta.etapas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Etapas do Trabalho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposta.etapas.map((etapa, index) => (
                  <div key={etapa.id} className="border-l-4 border-l-blue-500 pl-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">
                          {index + 1}. {etapa.servico}
                        </h4>
                        <p className="text-muted-foreground mt-1">{etapa.descricao}</p>
                      </div>
                      <Badge variant="outline">
                        {etapa.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Materiais */}
        {proposta.materiais && proposta.materiais.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Lista de Materiais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-left py-2">Quantidade</th>
                      <th className="text-left py-2">Unidade</th>
                      {proposta.materiais?.some(m => m.precoUnitario) && (
                        <th className="text-right py-2">Valor Unit.</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {proposta.materiais.map((material) => (
                      <tr key={material.id} className="border-b">
                        <td className="py-2">
                            <p className="font-medium">{material.nome}</p>
                            {material.observacao && (
                              <p className="text-sm text-muted-foreground">
                                {material.observacao}
                              </p>
                            )}
                        </td>
                        <td className="py-2">{Number(material.quantidade)}</td>
                        <td className="py-2">{material.unidade}</td>
                        {proposta.materiais?.some(m => m.precoUnitario) && (
                          <td className="py-2 text-right">
                            {material.precoUnitario ?
                              formatCurrency(Number(material.precoUnitario)) :
                              '-'
                            }
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        {canSign && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Assinatura Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nome do Responsável *
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  required
                />
              </div>

              <SignaturePad
                onSignature={setSignature}
                width={600}
                height={200}
                className="w-full"
              />

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  Declaro que li, entendi e aceito todos os termos e condições 
                  desta proposta comercial. Confirmo que tenho autoridade para 
                  assinar em nome da empresa/pessoa mencionada.
                </label>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSign}
                  disabled={loading || !signature || !termsAccepted || !clientName.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Processando...' : 'Assinar Proposta'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Signed */}
        {proposta.status === StatusPropostaValues.ASSINADA && proposta.assinadaEm && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Proposta Assinada
                </h3>
                <p className="text-muted-foreground">
                  Esta proposta foi assinada em {formatDate(proposta.assinadaEm)}
                </p>
                {proposta.assinaturaResponsavel && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Assinado por: {proposta.assinaturaResponsavel}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm">
          <p>GladPros - Sistema de Gestão de Propostas</p>
          <p>Este documento foi gerado automaticamente em {formatDate(new Date())}</p>
        </div>
        
        </div> {/* End of proposta-content */}
      </div>
    </div>
  )
}
