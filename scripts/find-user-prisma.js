const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'gladiston.porto@gladpros.com';
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    console.log('Usuário não encontrado:', email);
    process.exit(0);
  }
  console.log({ id: user.id, email: user.email, nivel: user.nivel, status: user.status, ultimoLoginEm: user.ultimoLoginEm });
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
