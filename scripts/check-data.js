const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verificação de Segurança de Dados ---');
    try {
        const clientes = await prisma.cliente.count();
        console.log(`Total de Clientes no Banco: ${clientes}`);

        // Verificando outros dados cruciais
        const usuarios = await prisma.usuario.count();
        console.log(`Total de Usuários: ${usuarios}`);

        const orders = await prisma.ordemServico.count();
        console.log(`Total de Ordens de Serviço: ${orders}`);

        // Verificar qual banco está sendo usado
        // (Prisma não expõe URL facilmente no client, mas podemos inferir pelos dados)
    } catch (e) {
        console.error("Erro ao ler banco:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
