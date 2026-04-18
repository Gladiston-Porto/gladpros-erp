'use client'

import React, { useRef, useState, useEffect } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Textarea } from "./textarea";
import { Button } from "./button";
import { Input } from "./input";
import { Checkbox } from "./checkbox";;



import { AlertTriangle, Pen, RotateCcw, Check, X } from 'lucide-react'

interface ProposalSignaturePadProps {
  /**
   * Callback quando a assinatura é confirmada
   */
  onSignatureComplete: (signatureData: {
    type: 'canvas' | 'name'
    signatureName: string
    signatureImage?: string
    consent: boolean
    terms: boolean
    observations?: string
  }) => void
  
  /**
   * Callback para cancelar
   */
  onCancel: () => void
  
  /**
   * Props da proposta para contexto
   */
  proposta: {
    numeroProposta: string
    titulo: string
    precoPropostaCliente?: number
    condicoesGerais?: string
  }
  
  /**
   * Carregando assinatura
   */
  loading?: boolean
}

/**
 * Componente de assinatura digital para propostas
 * Suporta assinatura por canvas ou nome + checkbox
 */
export function ProposalSignaturePad({ 
  onSignatureComplete, 
  onCancel, 
  proposta,
  loading = false
}: ProposalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  
  // Estados do formulário
  const [signatureType, setSignatureType] = useState<'canvas' | 'name'>('canvas')
  const [signatureName, setSignatureName] = useState('')
  const [consent, setConsent] = useState(false)
  const [terms, setTerms] = useState(false)
  const [observations, setObservations] = useState('')

  /**
   * Configurar canvas para assinatura
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar canvas
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#000000'

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Fundo branco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Linha de assinatura
    ctx.beginPath()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.moveTo(50, canvas.height - 30)
    ctx.lineTo(canvas.width - 50, canvas.height - 30)
    ctx.stroke()
    ctx.setLineDash([])
    
    // Texto da linha
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Assine aqui', canvas.width / 2, canvas.height - 10)
    
    // Restaurar configurações
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
  }, [])

  /**
   * Iniciar desenho no canvas
   */
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureType !== 'canvas') return
    
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let x, y
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  /**
   * Desenhar no canvas
   */
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureType !== 'canvas') return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let x, y
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineTo(x, y)
    ctx.stroke()
    
    setHasSignature(true)
  }

  /**
   * Parar de desenhar
   */
  const stopDrawing = () => {
    setIsDrawing(false)
  }

  /**
   * Limpar assinatura
   */
  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Limpar e redesenhar fundo
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Fundo branco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Linha de assinatura
    ctx.beginPath()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.moveTo(50, canvas.height - 30)
    ctx.lineTo(canvas.width - 50, canvas.height - 30)
    ctx.stroke()
    ctx.setLineDash([])
    
    // Texto da linha
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Assine aqui', canvas.width / 2, canvas.height - 10)
    
    // Restaurar configurações
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2

    setHasSignature(false)
  }

  /**
   * Confirmar assinatura
   */
  const confirmSignature = () => {
    if (signatureType === 'canvas' && !hasSignature) {
      alert('Por favor, desenhe sua assinatura no campo acima')
      return
    }

    if (signatureType === 'name' && !signatureName.trim()) {
      alert('Por favor, digite seu nome completo')
      return
    }

    if (!consent) {
      alert('Você deve concordar com os termos da proposta')
      return
    }

    if (!terms) {
      alert('Você deve concordar com os termos de assinatura digital')
      return
    }

    let signatureImage: string | undefined
    
    if (signatureType === 'canvas') {
      const canvas = canvasRef.current
      if (canvas) {
        signatureImage = canvas.toDataURL('image/png')
      }
    }

    onSignatureComplete({
      type: signatureType,
      signatureName: signatureType === 'canvas' ? 'Assinatura Digital' : signatureName,
      signatureImage,
      consent,
      terms,
      observations: observations.trim() || undefined
    })
  }

  /**
   * Verificar se pode assinar
   */
  const canSign = () => {
    const hasValidSignature = signatureType === 'canvas' ? hasSignature : signatureName.trim().length > 0
    return hasValidSignature && consent && terms
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Resumo da Proposta */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Pen className="h-5 w-5" />
            Assinatura Digital da Proposta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-gray-900">Proposta: {proposta.numeroProposta}</h4>
              <p className="text-gray-600 mt-1">{proposta.titulo}</p>
            </div>
            {proposta.precoPropostaCliente && (
              <div className="text-right">
                <h4 className="font-medium text-gray-900">Valor Total</h4>
                <p className="text-2xl font-bold text-green-600">
                  USD {proposta.precoPropostaCliente.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tipo de Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle>Método de Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              className={`p-4 border-2 rounded-lg transition-all ${
                signatureType === 'canvas'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSignatureType('canvas')}
            >
              <Pen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Desenhar Assinatura</h4>
              <p className="text-sm text-gray-500 mt-1">
                Use mouse ou toque para desenhar
              </p>
            </button>

            <button
              className={`p-4 border-2 rounded-lg transition-all ${
                signatureType === 'name'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSignatureType('name')}
            >
              <Check className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-medium">Digitar Nome</h4>
              <p className="text-sm text-gray-500 mt-1">
                Digite seu nome completo
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Canvas de Assinatura */}
      {signatureType === 'canvas' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Desenhe sua Assinatura</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSignature}
              disabled={!hasSignature}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full h-48 border border-gray-200 rounded cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Desenhe sua assinatura no campo acima usando mouse ou toque
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campo de Nome */}
      {signatureType === 'name' && (
        <Card>
          <CardHeader>
            <CardTitle>Digite seu Nome Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Seu nome completo"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="text-lg"
            />
            <p className="text-sm text-gray-500 mt-2">
              Este nome será registrado como sua assinatura digital
            </p>
          </CardContent>
        </Card>
      )}

      {/* Observações Opcionais */}
      <Card>
        <CardHeader>
          <CardTitle>Observações (Opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Comentários ou observações sobre esta proposta..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Termos e Condições */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            Termos e Condições
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Condições da Proposta */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked as boolean)}
            />
            <div>
              <label htmlFor="consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Concordo com os termos e condições desta proposta
              </label>
              {proposta.condicoesGerais && (
                <p className="text-xs text-gray-600 mt-1 max-h-20 overflow-y-auto">
                  {proposta.condicoesGerais}
                </p>
              )}
            </div>
          </div>

          {/* Termos de Assinatura Digital */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={terms}
              onCheckedChange={(checked) => setTerms(checked as boolean)}
            />
            <div>
              <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Aceito que minha assinatura digital tem validade legal
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Declaro que sou o responsável pela decisão de aprovação desta proposta 
                e que minha assinatura digital tem o mesmo valor legal de uma assinatura manuscrita.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>

        <Button
          onClick={confirmSignature}
          disabled={!canSign() || loading}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-2" />
          {loading ? 'Processando...' : 'Confirmar Assinatura'}
        </Button>
      </div>

      {/* Informações de Segurança */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p><strong>Informações de Segurança:</strong></p>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Sua assinatura será registrada com data, hora e endereço IP</li>
                <li>Este documento terá validade legal após a assinatura</li>
                <li>Uma cópia será enviada para seu email automaticamente</li>
                <li>Todas as ações são auditadas para segurança</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
