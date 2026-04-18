const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando limpeza de registros órfãos...')

  try {
    // Limpar etapas órfãs
    const etapas = await prisma.$executeRawUnsafe(`DELETE FROM projetos_etapas WHERE projeto_id NOT IN (SELECT id FROM projetos)`)
    console.log(`Etapas órfãs deletadas: ${etapas}`)

    // Limpar materiais órfãos
    const materiais = await prisma.$executeRawUnsafe(`DELETE FROM projetos_materiais WHERE projeto_id NOT IN (SELECT id FROM projetos)`)
    console.log(`Materiais órfãos deletados: ${materiais}`)

    // Limpar anexos órfãos
    const anexos = await prisma.$executeRawUnsafe(`DELETE FROM projetos_anexos WHERE projeto_id NOT IN (SELECT id FROM projetos)`)
    console.log(`Anexos órfãos deletados: ${anexos}`)

    // Limpar histórico órfão
    const historico = await prisma.$executeRawUnsafe(`DELETE FROM projetos_historico WHERE projeto_id NOT IN (SELECT id FROM projetos)`)
    console.log(`Histórico órfão deletado: ${historico}`)

    // Limpar movimentações órfãs
    const movs = await prisma.$executeRawUnsafe(`DELETE FROM projetos_movimentacoes_estoque WHERE projeto_id NOT IN (SELECT id FROM projetos)`)
    console.log(`Movimentações órfãs deletadas: ${movs}`)

    // Limpar tarefas órfãs
    const tarefas = await prisma.$executeRawUnsafe(`DELETE FROM projetos_tarefas WHERE projeto_id NOT IN (SELECT id FROM projetos)`)
    console.log(`Tarefas órfãs deletadas: ${tarefas}`)

  } catch (e) {
    console.error('Erro ao limpar órfãos:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
