#!/usr/bin/env node
/**
 * Script de verificação das tabelas do módulo Projetos.
 * Executa consultas simples para confirmar existência das tabelas,
 * índices básicos e uma prévia dos dados cadastrados.
 */

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function tableExists(tableName) {
  const rows = await prisma.$queryRaw`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${tableName}
  `
  return rows.length > 0
}

async function main() {
  const tables = [
    "projetos",
    "projetos_etapas",
    "projetos_materiais",
    "projetos_anexos",
    "projetos_historico",
    "projetos_tarefas",
  ]

  console.log("== Verificação de tabelas do módulo Projetos ==\n")

  for (const name of tables) {
    const exists = await tableExists(name)
    console.log(`Tabela ${name}: ${exists ? "OK" : "NÃO ENCONTRADA"}`)
  }

  const totalProjetos = await prisma.projeto.count().catch(() => null)
  if (totalProjetos === null) {
    console.log("\nTabela projetos ainda não está acessível via Prisma (migração não aplicada?).")
  } else {
    console.log(`\nTotal de projetos cadastrados: ${totalProjetos}`)
    if (totalProjetos > 0) {
      const sample = await prisma.projeto.findMany({
        take: 3,
        orderBy: { criadoEm: "desc" },
        select: {
          id: true,
          numeroProjeto: true,
          titulo: true,
          status: true,
          clienteId: true,
          criadoEm: true,
        },
      })
      console.table(sample)
    }
  }

  console.log("\nVerificação concluída.")
}

main()
  .catch((err) => {
    console.error("Erro ao verificar estrutura de projetos:\n", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
