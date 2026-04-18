const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createUser() {
  const prisma = new PrismaClient();
  try {
    const email = process.argv[2] || 'gladiston.porto@gladpros.com';
    const plain = process.argv[3] || '030919@Gladpros';
    const hash = await bcrypt.hash(plain, 12);

    const user = await prisma.usuario.upsert({
      where: { email },
      update: {
        nomeCompleto: 'Gladiston Porto',
        senha: hash,
        nivel: 'ADMIN',
        endereco1: 'Dev Environment',
        endereco2: '',
        cidade: 'São Paulo',
        estado: 'SP',
        telefone: '00000000000',
        bloqueado: false,
        atualizadoEm: new Date(),
        tokenVersion: 1,
        status: 'ATIVO'
      },
      create: {
        email,
        nomeCompleto: 'Gladiston Porto',
        senha: hash,
        nivel: 'ADMIN',
        endereco1: 'Dev Environment',
        endereco2: '',
        cidade: 'São Paulo',
        estado: 'SP',
        telefone: '00000000000',
        bloqueado: false,
        atualizadoEm: new Date(),
        tokenVersion: 1,
        status: 'ATIVO'
      }
    });

    console.log('✅ User created/updated:');
    console.log('Email:', user.email);
    console.log('Password:', plain);
    console.log('Role:', user.nivel);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
