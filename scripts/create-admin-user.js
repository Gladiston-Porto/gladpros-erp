const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const prisma = new PrismaClient();
  try {
    const email = 'admin@gladpros.com';
    const plain = 'admin123';
    const hash = await bcrypt.hash(plain, 12);

    const user = await prisma.usuario.upsert({
      where: { email },
      update: {
        nomeCompleto: 'Admin Test',
        senha: hash,
        nivel: 'ADMIN',
        endereco1: 'Test Address',
        endereco2: '',
        cidade: 'São Paulo',
        estado: 'SP',
        telefone: '11999999999',
        bloqueado: false,
        atualizadoEm: new Date(),
        tokenVersion: 1
      },
      create: {
        email,
        nomeCompleto: 'Admin Test',
        senha: hash,
        nivel: 'ADMIN',
        endereco1: 'Test Address',
        endereco2: '',
        cidade: 'São Paulo',
        estado: 'SP',
        telefone: '11999999999',
        bloqueado: false,
        atualizadoEm: new Date(),
        tokenVersion: 1
      },
    });

    console.log('✅ Admin user created/updated successfully:');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password: admin123');
    console.log('👤 Level:', user.nivel);
    console.log('✅ Active:', user.ativo);
    console.log('🔒 MFA Enabled:', user.mfaHabilitado);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();