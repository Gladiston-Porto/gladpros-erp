const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const prisma = new PrismaClient()
  const email = 'gerente@teste.local'
  const senha = 'Gerente@123'
  const senhaHash = await bcrypt.hash(senha, 10)

  await prisma.usuario.upsert({
    where: { email },
    update: {
      nivel: 'GERENTE',
      status: 'ATIVO',
      senha: senhaHash,
      nomeCompleto: 'Gerente Teste'
    },
    create: {
      email,
      senha: senhaHash,
      nomeCompleto: 'Gerente Teste',
      nivel: 'GERENTE',
      endereco1: 'Rua Gerente, 1',
      endereco2: '',
      cidade: 'Cidade',
      estado: 'SP',
      zipcode: '00000-000',
      status: 'ATIVO',
      atualizadoEm: new Date()
    }
  })

  console.log('Gerente criado/atualizado:', email)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})