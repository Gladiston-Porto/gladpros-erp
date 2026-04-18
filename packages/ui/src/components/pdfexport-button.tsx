'use client'

import { useState } from 'react'
import { Button } from "./button";;
import { Download } from 'lucide-react'

interface PDFExportButtonProps {
  elementId: string
  filename?: string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function PDFExportButton({
  elementId,
  filename = 'documento.pdf',
  disabled = false,
  className = '',
  children
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    try {
      setIsGenerating(true)

      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error(`Elemento com ID '${elementId}' não encontrado`)
      }

      // Dynamic imports — jsPDF (~200 modules) and html2canvas (~150 modules)
      // are only loaded when the user actually clicks the button
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      // Create canvas from element
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 10000,
        logging: false
      })

      // Calculate dimensions
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 20 // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 10 // Top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - 20) // Account for margins

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pageHeight - 20)
      }

      // Save the PDF
      pdf.save(filename)

    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={generatePDF}
      disabled={disabled || isGenerating}
      className={className}
      variant="outline"
    >
      {isGenerating ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          Gerando PDF...
        </>
      ) : (
        <>
          {children || (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </>
          )}
        </>
      )}
    </Button>
  )
}
