
import { POST } from '@/app/api/estoque/compras/[id]/receber/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock do módulo de API para simular autenticação
jest.mock('@/lib/api', () => {
    const original = jest.requireActual('@/lib/api');
    return {
        ...original,
        requireAuth: jest.fn().mockResolvedValue({
            user: { id: 1, papel: 'ADMIN', nome: 'Test Admin' },
            error: null
        }),
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        }
    };
});

describe('Integração: Recebimento de Compras (Idempotência)', () => {
    let empresaId: number;
    let fornecedorId: number;
    let materialId: number;
    let localizacaoId: number;
    let compraId: number;
    let itemId: number;

    beforeAll(async () => {
        // 1. Setup Base Data
        const empresa = await prisma.empresa.findFirst({ where: { ativo: true } })
            || await prisma.empresa.create({ data: { nome: 'Test Empresa', documento: '000', ativo: true } });
        empresaId = empresa.id;

        const fornecedor = await prisma.fornecedor.create({
            data: {
                nome: 'Fornecedor Teste',
                documento: '00000000000199',
                tipoDocumento: 'CNPJ',
                ativo: true
            }
        });
        fornecedorId = fornecedor.id;

        const localizacao = await prisma.localizacao.create({
            data: { 
                nome: 'Almoxarifado Teste', 
                codigo: `LOC-TEST-${Date.now()}`,
                tipo: 'DEPOSITO'
            }
        });
        localizacaoId = localizacao.id;

        // Create or find Unidade
        const unidade = await prisma.unidade.findFirst({ where: { codigo: 'UN' } })
            || await prisma.unidade.create({ data: { codigo: 'UN', nome: 'Unidade' } });

        const material = await prisma.material.create({
            data: {
                codigo: `MAT-TEST-${Date.now()}`,
                nome: 'Material Teste',
                unidadeId: unidade.id,
                categoriaId: null,
                estoqueMinimo: 0
            }
        });
        materialId = material.id;
    });

    afterAll(async () => {
        // Cleanup
        if (itemId) await prisma.compraItem.deleteMany({ where: { id: itemId } });
        if (compraId) {
            await prisma.expense.deleteMany({ where: { compraId } });
            await prisma.materialMovimentacao.deleteMany({ where: { compraId } });
            await prisma.compra.delete({ where: { id: compraId } });
        }
        await prisma.material.delete({ where: { id: materialId } });
        await prisma.localizacao.delete({ where: { id: localizacaoId } });
        await prisma.fornecedor.delete({ where: { id: fornecedorId } });
    });

    beforeEach(async () => {
        // setup fresh purchase for each test if needed
    });

    it('deve criar despesa ao receber compra completa e NÃO duplicar ao tentar receber novamente', async () => {
        // 1. Criar Compra Pendente
        const compra = await prisma.compra.create({
            data: {
                fornecedorId,
                dataCompra: new Date(),
                tipo: 'MATERIAL',
                status: 'PENDENTE',
                valorTotal: 100.00,
                criadoPor: 1
            }
        });
        compraId = compra.id;

        const item = await prisma.compraItem.create({
            data: {
                compraId,
                tipoItem: 'MATERIAL',
                materialId,
                quantidade: 10,
                custoUnitario: 10.00,
                custoTotal: 100.00
            }
        });
        itemId = item.id;

        // 2. Preparar Request para Recebimento Total
        const body = {
            dataRecebimento: new Date().toISOString(),
            itensRecebidos: [
                {
                    itemId: item.id,
                    quantidadeRecebida: 10,
                    localizacaoId: localizacaoId
                }
            ]
        };

        const req = new NextRequest(`http://localhost:3000/api/estoque/compras/${compraId}/receber`, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        // 3. Executar Primeira Chamada
        const res = await POST(req, { params: Promise.resolve({ id: compraId.toString() }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.data.compra.status).toBe('RECEBIDA');

        // 4. Verificar Despesa Criada
        const despesas = await prisma.expense.findMany({
            where: { compraId }
        });
        expect(despesas).toHaveLength(1);
        expect(despesas[0].valor.toNumber()).toBe(100.00);


        // 5. Executar Segunda Chamada (Tentativa de Duplicação/Erro)
        // Logica atual: Se itens ja recebidos -> Retorna Erro.
        // Isso garante idempotencia de ESTADO (não altera nada) mas retorna erro ao cliente.
        const req2 = new NextRequest(`http://localhost:3000/api/estoque/compras/${compraId}/receber`, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const res2 = await POST(req2, { params: Promise.resolve({ id: compraId.toString() }) });
        await res2.json();

        // Esperado: Erro de negócio "Items já recebidos" ou similar.
        // O importante é que NÃO crie outra despesa.
        expect(res2.status).not.toBe(200); // Provavelmente 409 ou 400

        // 6. Verificar que Despesa ainda é única
        const despesasApos = await prisma.expense.findMany({
            where: { compraId }
        });
        expect(despesasApos).toHaveLength(1);
    });
});
