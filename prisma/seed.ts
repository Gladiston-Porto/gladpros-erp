import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@gladpros.local"
  const senha = process.env.SEED_ADMIN_PASS ?? "Admin@12345"
  const senhaHash = await hash(senha, 10)

  await (prisma.usuario as any).upsert({
    where: { email },
    update: { nivel: "ADMIN", status: "ATIVO" },
    create: {
      email,
      senha: senhaHash,
      nivel: "ADMIN",
      status: "ATIVO",
      endereco1: "Endereço Admin",
      endereco2: "",
      cidade: "São Paulo",
      atualizadoEm: new Date()
    },
  })
  console.log(`Admin criado/atualizado: ${email}`)
}

main().finally(() => prisma.$disconnect())