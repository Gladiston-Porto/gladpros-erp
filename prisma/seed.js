import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/gladpros_ci'
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
})

async function main() {
  // CLEANUP: Limpar tentativas de login e desbloquear usuários (para E2E tests)
  console.log('🧹 Limpando tentativas de login e desbloqueando usuários...');
  await prisma.$executeRaw`DELETE FROM TentativaLogin`;
  await prisma.$executeRaw`UPDATE Usuario SET bloqueado = FALSE, bloqueadoEm = NULL`;
  
  // Criar usuário específico solicitado
  const specificEmail = 'gladiston.porto@gladpros.com'
  const specificPassword = process.env.ADMIN_PASSWORD_TEST || 'ChangeMe_123!'
  const specificPasswordHash = await bcrypt.hash(specificPassword, 10)

  await prisma.usuario.upsert({
    where: { email: specificEmail },
    update: { senha: specificPasswordHash, nivel: 'ADMIN', status: 'ATIVO', bloqueado: false, bloqueadoEm: null },
    create: {
      email: specificEmail,
      senha: specificPasswordHash,
      nomeCompleto: 'Gladiston Porto',
      nivel: 'ADMIN',
      endereco1: 'Rua Admin, 123',
      endereco2: '',
      cidade: 'São Paulo',
      estado: 'SP',
      zipcode: '01234-567',
      status: 'ATIVO',
      bloqueado: false,
      atualizadoEm: new Date(),
    },
  })
  console.log(`✅ Usuário específico criado: ${specificEmail}`)

  // Criar usuário admin genérico (para E2E tests)
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@gladpros.local'
  const senha = process.env.SEED_ADMIN_PASS || 'Admin@12345'
  console.log(`📧 Criando admin E2E: ${email} (senha: ${senha.substring(0, 4)}***)`);
  const senhaHash = await bcrypt.hash(senha, 10)

  await prisma.usuario.upsert({
    where: { email },
    update: { 
      senha: senhaHash,  // Atualizar senha para garantir que corresponde
      nivel: 'ADMIN', 
      status: 'ATIVO',
      bloqueado: false,
      bloqueadoEm: null
    },
    create: {
      email,
      senha: senhaHash,
      nomeCompleto: 'Administrador',
      nivel: 'ADMIN',
      endereco1: 'Rua Admin, 123',
      endereco2: '',
      cidade: 'São Paulo',
      estado: 'SP',
      zipcode: '01234-567',
      status: 'ATIVO',
      bloqueado: false,
      atualizadoEm: new Date(),
    },
  })
  console.log(`✅ Admin E2E criado: ${email}`)
  console.log(`Admin criado/atualizado: ${email}`)

  // Criar encryption_keys necessárias para JWT (VUL-004: KMS)
  const kmsMasterKey = process.env.KMS_MASTER_KEY
  if (kmsMasterKey) {
    console.log('Criando encryption_keys para JWT...')
    
    // Helper para encriptar chave com master key
    function encryptKey(key) {
      const masterKey = Buffer.from(kmsMasterKey, 'base64')
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv)
      const encrypted = Buffer.concat([cipher.update(key), cipher.final()])
      const tag = cipher.getAuthTag()
      return Buffer.concat([iv, tag, encrypted]).toString('base64')
    }

    // Helper para gerar fingerprint
    function generateFingerprint(key) {
      return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16)
    }

    // Criar chave JWT_SIGNING se não existir
    const existingJwtKey = await prisma.encryptionKey.findFirst({
      where: { keyType: 'JWT_SIGNING', status: 'ACTIVE' }
    })

    if (!existingJwtKey) {
      const jwtKey = crypto.randomBytes(32)
      const encryptedKey = encryptKey(jwtKey)
      const fingerprint = generateFingerprint(jwtKey)

      await prisma.encryptionKey.create({
        data: {
          keyType: 'JWT_SIGNING',
          version: 1,
          encryptedKey,
          fingerprint,
          algorithm: 'HMAC-SHA256',
          keyLength: 32,
          status: 'ACTIVE',
          ativadoEm: new Date(),
          motivoRotacao: 'Initial seed setup'
        }
      })
      console.log('✅ Chave JWT_SIGNING criada')
    } else {
      console.log('ℹ️  Chave JWT_SIGNING já existe')
    }
  } else {
    console.warn('⚠️  KMS_MASTER_KEY não definida - encryption_keys não criadas')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
