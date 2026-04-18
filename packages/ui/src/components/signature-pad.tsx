'use client'

import { useRef, useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";

interface SignaturePadProps {
  onSignature: (signatureData: string) => void
  width?: number
  height?: number
  className?: string
}

export function SignaturePad({
  onSignature,
  width = 400,
  height = 200,
  className = ''
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar canvas
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Preencher fundo branco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    setIsEmpty(false)

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX, clientY
    if ('touches' in e) {
      e.preventDefault() // Prevent scrolling
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)

    if (!isEmpty) {
      const canvas = canvasRef.current
      if (canvas) {
        const signatureData = canvas.toDataURL('image/png')
        onSignature(signatureData)
      }
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    setIsEmpty(true)
    onSignature('')
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Assinatura Digital</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="border border-gray-200 rounded cursor-crosshair touch-none"
            style={{ maxWidth: '100%', height: 'auto' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={clearSignature}
            disabled={isEmpty}
          >
            Limpar
          </Button>

          <p className="text-sm text-muted-foreground self-center">
            {isEmpty ? 'Assine no espaço acima' : 'Assinatura capturada'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
