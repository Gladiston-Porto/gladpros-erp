// import { applyRBACMasking, type RBACContext } from './proposta-rbac'

// Context para RBAC (definido aqui temporariamente)
export interface RBACContext {
  userId?: number
  userRole?: string
  permissions: string[]
  isClientAccess: boolean
}

// Função placeholder para mascaramento RBAC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyRBACMasking = async (proposta: any) => {
  // TODO: Implementar lógica real de mascaramento
  return proposta
}

// Tipos de enum como strings para simplicidade
type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ASSINADA' | 'CANCELADA' | 'APROVADA'
type StatusPermite = 'SIM' | 'NAO'
type TipoAssinatura = 'CANVAS' | 'CHECKBOX'
type GatilhoFaturamento = 'NA_APROVACAO' | 'POR_MARCOS' | 'NA_ENTREGA' | 'CUSTOMIZADO'
type FormaPagamento = 'TRANSFERENCIA' | 'CARTAO' | 'PIX' | 'BOLETO' | 'DINHEIRO'

// Interface baseada no schema Prisma
export interface PropostaWithRelations {
  id: number
  numeroProposta: string
  clienteId: number
  dataCriacao: Date
  
  // Informações de contato e execução
  contatoNome: string
  contatoEmail: string
  contatoTelefone?: string | null
  localExecucaoEndereco: string
  
  // Título e escopo
  titulo: string
  descricaoEscopo: string
  tipoServico: string
  
  // Prazos e validade
  tempoParaAceite?: number | null
  validadeProposta?: Date | null
  prazoExecucaoEstimadoDias?: number | null
  janelaExecucaoPreferencial?: string | null
  restricoesDeAcesso?: string | null
  
  // Permissões e conformidades
  permite: StatusPermite
  quaisPermites?: string | null
  normasReferencias?: string | null
  inspecoesNecessarias?: string | null
  
  // Condições comerciais
  condicoesPagamento?: Record<string, unknown>
  garantia?: string | null
  exclusoes?: string | null
  condicoesGerais?: string | null
  descontosOfertados?: number | null
  opcoesAlternativas?: Record<string, unknown>
  
  // Estimativas internas
  valorEstimado?: number | null
  internalEstimate?: Record<string, unknown>
  precoPropostaCliente?: number | null
  moeda: string
  
  // Condições de faturamento
  gatilhoFaturamento?: GatilhoFaturamento | null
  percentualSinal?: number | null
  marcosPagamento?: Record<string, unknown>
  formaPagamentoPreferida?: FormaPagamento | null
  instrucoesPagamento?: string | null
  multaAtraso?: string | null
  descontosCondicionais?: string | null
  
  // Status e fluxo
  status: StatusProposta
  enviadaParaOCliente?: Date | null
  tokenPublico?: string | null
  tokenExpiresAt?: Date | null
  
  // Assinaturas e aprovação
  assinaturaTipo?: TipoAssinatura | null
  assinaturaCliente?: string | null
  assinaturaImagem?: string | null
  assinaturaIp?: string | null
  assinaturaUserAgent?: string | null
  assinadaEm?: Date | null
  
  assinaturaResponsavel?: string | null
  aprovacaoInternaTecnica?: boolean | null
  aprovacaoInternaFinanceira?: boolean | null
  aprovadaEm?: Date | null
  motivo_cancelamento?: string | null
  
  // Observações e riscos
  observacoesInternas?: string | null
  observacoesParaCliente?: string | null
  riscosIdentificados?: string | null
  
  // Conversão em projeto
  projetoId?: number | null
  dataConversao?: Date | null
  responsavelConversao?: number | null
  
  // Auditoria
  criadoPor?: number | null
  atualizadoPor?: number | null
  historicoAlteracoes?: Record<string, unknown>
  deletedAt?: Date | null
  deletedBy?: number | null
  criadoEm: Date
  atualizadoEm: Date

  // Relacionamentos
  etapas: PropostaEtapa[]
  materiais: PropostaMaterial[]
  anexos: AnexoProposta[]
}

export interface PropostaEtapa {
  id: number
  propostaId: number
  titulo: string
  descricao?: string | null
  ordem: number
  valorEstimado?: number | null
  duracaoEstimadaHoras?: number | null
  custoMaoObraEstimado?: number | null
  dependencias?: string | null
  status: string
  dataInicioEstimada?: Date | null
  dataFimEstimada?: Date | null
  dataInicioReal?: Date | null
  dataFimReal?: Date | null
  observacoes?: string | null
  criadoEm: Date
  atualizadoEm: Date
}

export interface PropostaMaterial {
  id: number
  propostaId: number
  nome: string
  descricao?: string | null
  quantidade: number
  unidade: string
  valorUnitario?: number | null
  fornecedor?: string | null
  fornecedorPreferencial?: string | null
  observacoes?: string | null
  especificacoes?: Record<string, unknown>
  status: string
  criadoEm: Date
  atualizadoEm: Date
}

export interface AnexoProposta {
  id: number
  propostaId: number
  nome: string
  tipo: string
  tamanho?: number | null
  url: string
  privado?: boolean | null
  descricao?: string | null
  uploadedBy?: number | null
  criadoEm: Date
}

export interface PDFGenerationOptions {
  /**
   * Incluir valores financeiros no PDF
   */
  includeValues?: boolean
  
  /**
   * Incluir etapas detalhadas
   */
  includeEtapas?: boolean
  
  /**
   * Incluir materiais detalhados
   */
  includeMateriais?: boolean
  
  /**
   * Incluir anexos públicos como links
   */
  includeAnexos?: boolean
  
  /**
   * Template do PDF (client = para cliente, internal = uso interno)
   */
  template?: 'client' | 'internal'
  
  /**
   * Adicionar marcas d'água
   */
  watermark?: string
  
  /**
   * Customizar cabeçalho/rodapé
   */
  header?: {
    logoUrl?: string
    empresa?: string
    contato?: string
  }
}

/**
 * Serviço para geração de PDFs de propostas com controle RBAC
 */
export class PropostaPDFService {
  /**
   * Gera PDF da proposta com mascaramento baseado em permissões
   */
  static async generatePDF(
    proposta: PropostaWithRelations,
    rbacContext: RBACContext,
    options: PDFGenerationOptions = {}
  ): Promise<{
    buffer: Buffer
    filename: string
    contentType: string
  }> {
    // Aplicar mascaramento RBAC nos dados
    const maskedProposta = await applyRBACMasking(proposta)
    
    const defaultOptions: Required<PDFGenerationOptions> = {
      includeValues: true,
      includeEtapas: true,
      includeMateriais: true,
      includeAnexos: false,
      template: rbacContext.isClientAccess ? 'client' : 'internal',
      watermark: rbacContext.isClientAccess ? 'CONFIDENCIAL' : '',
      header: {
        empresa: 'GladPros',
        contato: 'contato@gladpros.com'
      }
    }
    
    const finalOptions = { ...defaultOptions, ...options }
    
    // Gerar o PDF usando a biblioteca de sua escolha (puppeteer, jsPDF, etc.)
    const pdfBuffer = await this.renderPDF(maskedProposta, finalOptions)
    
    const filename = this.generateFilename(proposta, finalOptions.template)
    
    return {
      buffer: pdfBuffer,
      filename,
      contentType: 'application/pdf'
    }
  }

  /**
   * Gera HTML template para o PDF
   */
  private static generateHTML(
    proposta: PropostaWithRelations,
    options: Required<PDFGenerationOptions>
  ): string {
    const isClient = options.template === 'client'
    
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta ${proposta.numeroProposta}</title>
      <style>
        ${this.getPDFStyles(options)}
      </style>
    </head>
    <body>
      ${options.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}
      
      <!-- Cabeçalho -->
      <header>
        <div class="header-content">
          <div class="company-info">
            <h1>${options.header.empresa}</h1>
            ${options.header.contato ? `<p>${options.header.contato}</p>` : ''}
          </div>
          <div class="proposal-info">
            <h2>PROPOSTA COMERCIAL</h2>
            <p><strong>Nº:</strong> ${proposta.numeroProposta}</p>
            <p><strong>Data:</strong> ${proposta.enviadaParaOCliente ? new Date(proposta.enviadaParaOCliente).toLocaleDateString('pt-BR') : 'Não enviada'}</p>
          </div>
        </div>
      </header>

      <!-- Informações do Cliente -->
      <section class="client-info">
        <h3>Dados do Cliente</h3>
        <div class="info-grid">
          <div>
            <p><strong>Nome:</strong> ${proposta.contatoNome || 'N/A'}</p>
            <p><strong>Email:</strong> ${proposta.contatoEmail || 'N/A'}</p>
          </div>
          ${proposta.localExecucaoEndereco ? `
          <div>
            <p><strong>Local de Execução:</strong></p>
            <p>${proposta.localExecucaoEndereco}</p>
          </div>
          ` : ''}
        </div>
      </section>

      <!-- Escopo do Trabalho -->
      <section class="scope">
        <h3>Escopo do Trabalho</h3>
        ${proposta.titulo ? `<h4>${proposta.titulo}</h4>` : ''}
        ${proposta.descricaoEscopo ? `<p>${proposta.descricaoEscopo}</p>` : ''}
      </section>

      ${options.includeEtapas && proposta.etapas.length > 0 ? `
      <!-- Etapas -->
      <section class="etapas">
        <h3>Etapas do Trabalho</h3>
        <table>
          <thead>
            <tr>
              <th>Etapa</th>
              <th>Descrição</th>
              ${options.includeValues ? '<th>Valor Estimado</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${proposta.etapas.map((etapa, index) => `
            <tr>
              <td>${index + 1}. ${etapa.titulo}</td>
              <td>${etapa.descricao || '-'}</td>
              ${options.includeValues ? `<td>USD ${etapa.valorEstimado?.toFixed(2) || '0.00'}</td>` : ''}
            </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
      ` : ''}

      ${options.includeMateriais && proposta.materiais.length > 0 ? `
      <!-- Materiais -->
      <section class="materiais">
        <h3>Materiais</h3>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Qtd</th>
              <th>Unidade</th>
              ${options.includeValues ? '<th>Valor Unit.</th>' : ''}
              ${options.includeValues ? '<th>Total</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${proposta.materiais.map(material => `
            <tr>
              <td>
                <strong>${material.nome}</strong>
                ${material.descricao ? `<br><small>${material.descricao}</small>` : ''}
              </td>
              <td>${material.quantidade}</td>
              <td>${material.unidade}</td>
              ${options.includeValues ? `<td>USD ${material.valorUnitario?.toFixed(2) || '0.00'}</td>` : ''}
              ${options.includeValues ? `<td>USD ${((material.valorUnitario || 0) * material.quantidade).toFixed(2)}</td>` : ''}
            </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
      ` : ''}

      <!-- Condições Comerciais -->
      ${options.includeValues ? `
      <section class="commercial">
        <h3>Condições Comerciais</h3>
        <div class="commercial-info">
          ${proposta.valorEstimado ? `<p><strong>Valor Total:</strong> USD ${proposta.valorEstimado.toFixed(2)}</p>` : ''}
          ${proposta.precoPropostaCliente ? `<p><strong>Preço Final:</strong> USD ${proposta.precoPropostaCliente.toFixed(2)}</p>` : ''}
          ${proposta.descontosOfertados ? `<p><strong>Desconto:</strong> ${proposta.descontosOfertados}%</p>` : ''}
          ${proposta.garantia ? `<p><strong>Garantia:</strong> ${proposta.garantia}</p>` : ''}
          ${proposta.validadeProposta ? `<p><strong>Validade:</strong> ${new Date(proposta.validadeProposta).toLocaleDateString('pt-BR')}</p>` : ''}
        </div>
        ${proposta.condicoesGerais ? `
        <div class="terms">
          <h4>Condições Gerais</h4>
          <p>${proposta.condicoesGerais}</p>
        </div>
        ` : ''}
        ${proposta.exclusoes ? `
        <div class="exclusions">
          <h4>Exclusões</h4>
          <p>${proposta.exclusoes}</p>
        </div>
        ` : ''}
      </section>
      ` : ''}

      <!-- Observações -->
      ${proposta.observacoesParaCliente ? `
      <section class="observations">
        <h3>Observações</h3>
        <p>${proposta.observacoesParaCliente}</p>
      </section>
      ` : ''}

      <!-- Rodapé -->
      <footer>
        <div class="signature-area">
          <div class="signature-box">
            <p><strong>Assinatura do Cliente</strong></p>
            <div class="signature-line"></div>
            <p>Data: ___/___/______</p>
          </div>
          <div class="signature-box">
            <p><strong>Responsável Técnico</strong></p>
            <div class="signature-line"></div>
            <p>${options.header.empresa}</p>
          </div>
        </div>
        
        <div class="footer-info">
          <p>Esta proposta é válida até ${proposta.validadeProposta ? new Date(proposta.validadeProposta).toLocaleDateString('pt-BR') : '30 dias a partir da data de emissão'}</p>
          ${isClient ? '<p><em>Documento gerado automaticamente - Confidencial</em></p>' : ''}
        </div>
      </footer>
    </body>
    </html>
    `
  }

  /**
   * Estilos CSS para o PDF
   */
  private static getPDFStyles(options: Required<PDFGenerationOptions>): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        background-color: white;
      }
      
      ${options.watermark ? `
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80px;
        color: rgba(0, 0, 0, 0.1);
        font-weight: bold;
        z-index: -1;
        pointer-events: none;
      }
      ` : ''}
      
      header {
        border-bottom: 3px solid #2563eb;
        margin-bottom: 30px;
        padding-bottom: 20px;
      }
      
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      
      .company-info h1 {
        font-size: 24px;
        color: #2563eb;
        margin-bottom: 5px;
      }
      
      .proposal-info {
        text-align: right;
      }
      
      .proposal-info h2 {
        font-size: 20px;
        color: #1f2937;
        margin-bottom: 10px;
      }
      
      section {
        margin-bottom: 30px;
      }
      
      h3 {
        font-size: 16px;
        color: #2563eb;
        margin-bottom: 15px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 5px;
      }
      
      h4 {
        font-size: 14px;
        color: #374151;
        margin-bottom: 10px;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      
      th, td {
        border: 1px solid #d1d5db;
        padding: 8px;
        text-align: left;
      }
      
      th {
        background-color: #f9fafb;
        font-weight: bold;
        color: #374151;
      }
      
      tr:nth-child(even) {
        background-color: #f9fafb;
      }
      
      .commercial-info {
        background-color: #f0f9ff;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      
      .terms, .exclusions {
        background-color: #fef3c7;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      
      .signature-area {
        display: flex;
        justify-content: space-between;
        margin: 50px 0 20px 0;
      }
      
      .signature-box {
        text-align: center;
        width: 45%;
      }
      
      .signature-line {
        border-bottom: 1px solid #000;
        margin: 20px 0;
        height: 40px;
      }
      
      footer {
        border-top: 1px solid #e5e7eb;
        padding-top: 20px;
        margin-top: 50px;
      }
      
      .footer-info {
        text-align: center;
        font-size: 10px;
        color: #6b7280;
      }
      
      @media print {
        body {
          background: white;
        }
        
        .watermark {
          print-color-adjust: exact;
        }
      }
      
      @page {
        margin: 2cm;
        size: A4;
      }
    `
  }

  /**
   * Renderiza o PDF usando um fallback simples para agora
   * TODO: Implementar com Puppeteer ou jsPDF posteriormente
   */
  private static async renderPDF(
    proposta: PropostaWithRelations,
    options: Required<PDFGenerationOptions>
  ): Promise<Buffer> {
    const { PDFDocument, rgb } = await import('pdf-lib')

    // Criar novo documento PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()

    const { height } = page.getSize()
    const fontSize = 12
    const margin = 50
    let yPosition = height - margin

    // Adicionar título
    page.drawText(`PROPOSTA COMERCIAL - ${proposta.numeroProposta}`, {
      x: margin,
      y: yPosition,
      size: 18,
      color: rgb(0.2, 0.4, 0.8)
    })
    yPosition -= 40

    // Informações do cliente
    page.drawText(`Cliente: ${proposta.contatoNome}`, {
      x: margin,
      y: yPosition,
      size: fontSize
    })
    yPosition -= 20

    page.drawText(`Email: ${proposta.contatoEmail}`, {
      x: margin,
      y: yPosition,
      size: fontSize
    })
    yPosition -= 20

    if (proposta.contatoTelefone) {
      page.drawText(`Telefone: ${proposta.contatoTelefone}`, {
        x: margin,
        y: yPosition,
        size: fontSize
      })
      yPosition -= 20
    }

    // Escopo
    yPosition -= 20
    page.drawText('ESCOPO DO TRABALHO', {
      x: margin,
      y: yPosition,
      size: 14,
      color: rgb(0.2, 0.4, 0.8)
    })
    yPosition -= 20

    if (proposta.titulo) {
      page.drawText(proposta.titulo, {
        x: margin,
        y: yPosition,
        size: fontSize + 2
      })
      yPosition -= 20
    }

    if (proposta.descricaoEscopo) {
      // Quebrar texto longo em linhas
      const lines = this.wrapText(proposta.descricaoEscopo, 80)
      for (const line of lines) {
        if (yPosition < margin + 50) {
          // Adicionar nova página se necessário
          pdfDoc.addPage()
          yPosition = height - margin
        }
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize
        })
        yPosition -= 15
      }
    }

    // Etapas (se incluídas)
    if (options.includeEtapas && proposta.etapas.length > 0) {
      yPosition -= 20
      page.drawText('ETAPAS DO TRABALHO', {
        x: margin,
        y: yPosition,
        size: 14,
        color: rgb(0.2, 0.4, 0.8)
      })
      yPosition -= 20

      for (const [index, etapa] of proposta.etapas.entries()) {
        if (yPosition < margin + 50) {
          pdfDoc.addPage()
          yPosition = height - margin
        }

        const etapaText = `${index + 1}. ${etapa.titulo}`
        page.drawText(etapaText, {
          x: margin,
          y: yPosition,
          size: fontSize
        })
        yPosition -= 15

        if (etapa.descricao) {
          const descLines = this.wrapText(etapa.descricao, 75)
          for (const line of descLines) {
            page.drawText(`   ${line}`, {
              x: margin,
              y: yPosition,
              size: fontSize - 1
            })
            yPosition -= 12
          }
        }

        if (options.includeValues && etapa.valorEstimado) {
          page.drawText(`   Valor: USD ${etapa.valorEstimado.toFixed(2)}`, {
            x: margin,
            y: yPosition,
            size: fontSize
          })
          yPosition -= 15
        }
      }
    }

    // Valor total (se incluído)
    if (options.includeValues && proposta.valorEstimado) {
      yPosition -= 20
      page.drawText(`VALOR TOTAL: USD ${proposta.valorEstimado.toFixed(2)}`, {
        x: margin,
        y: yPosition,
        size: 14,
        color: rgb(0.2, 0.4, 0.8)
      })
    }

    // Gerar buffer do PDF
    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
  }

  /**
   * Quebra texto longo em linhas
   */
  private static wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        if (currentLine) {
          lines.push(currentLine.trim())
          currentLine = word
        } else {
          lines.push(word)
          currentLine = ''
        }
      } else {
        currentLine += (currentLine ? ' ' : '') + word
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim())
    }

    return lines
  }
    
    /* TODO: Implementar conversão real para PDF
    try {
      const puppeteer = await import('puppeteer')
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        },
        printBackground: true,
        preferCSSPageSize: true
      })
      
      await browser.close()
      
      return Buffer.from(pdfBuffer)
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      return this.generateFallbackPDF(proposta, options)
    }
  }

  /**
   * Gera nome do arquivo PDF
   */
  private static generateFilename(
    proposta: PropostaWithRelations,
    template: 'client' | 'internal'
  ): string {
    const date = new Date().toISOString().split('T')[0]
    const prefix = template === 'client' ? 'proposta' : 'proposta-internal'
    
    return `${prefix}-${proposta.numeroProposta}-${date}.pdf`
  }

  /**
   * Valida se a proposta pode gerar PDF
   */
  static validateForPDF(proposta: PropostaWithRelations): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if (!proposta.numeroProposta) {
      errors.push('Número da proposta é obrigatório')
    }
    
    if (!proposta.contatoNome) {
      errors.push('Nome do contato é obrigatório')
    }
    
    if (!proposta.descricaoEscopo) {
      errors.push('Descrição do escopo é obrigatória')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}
