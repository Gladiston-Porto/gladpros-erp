
import { SignJWT } from 'jose';

const JWT_SECRET = 'g5QZk5uXmGBy1267sLdrd8FHIzUqEtUrxnyJqoWYEqPklmXS1YiLp0ervYW7C017';
const BASE_URL = 'http://localhost:3000';

const IDs = {
    materialId: 1,
    localizacaoId: 1,
    fornecedorId: 1,
    serviceOrderId: 2,
    serviceOrderMaterialId: 1
};

async function generateToken() {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const jwt = await new SignJWT({
        id: 1,
        email: 'admin@test.com',
        nome: 'Admin Tester',
        papel: 'ADMINISTRADOR'
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);
    return jwt;
}

async function api(method, path, body = null, token) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const opts = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    };

    try {
        const res = await fetch(`${BASE_URL}${path}`, opts);
        let data = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = { text: await res.text() };
        }

        return { status: res.status, data };
    } catch (err) {
        console.error(`Network error on ${method} ${path}:`, err);
        return { status: 0, data: { error: err.message } };
    }
}

async function runTests() {
    console.log('🚀 Starting Integration Tests...\n');
    const token = await generateToken();
    console.log('🔑 Token generated.\n');

    // =================================================================
    // FLOW 1: Compra PENDENTE
    // =================================================================
    console.log('📦 FLOW 1: Creating Purchase (PENDENTE)...');
    const compraData = {
        dataCompra: new Date().toISOString(),
        tipo: "MATERIAL",
        valorTotal: 120.00,
        receberAgora: false,
        fornecedorId: IDs.fornecedorId,
        itens: [{
            tipoItem: "MATERIAL",
            materialId: IDs.materialId,
            quantidade: 250,
            custoUnitario: 0.48
        }]
    };

    const res1 = await api('POST', '/api/estoque/compras', compraData, token);

    if (res1.status !== 201 && res1.status !== 200) {
        console.error('❌ Failed to create purchase. Response:');
        console.error(JSON.stringify(res1.data, null, 2));
        process.exit(1);
    }

    // Handle updated API response structure: { data: { compra: { ... } } }
    // OR standard { data: { id: ... } }
    const payload = res1.data.data;
    const compraObj = payload.compra || payload;

    const compraId = compraObj.id;
    const itens = compraObj.itens;

    if (!compraId) {
        console.error('❌ Purchase ID not found in response:', JSON.stringify(res1.data, null, 2));
        process.exit(1);
    }

    if (!itens || itens.length === 0) {
        console.error('❌ Purchase created but returned no items:', JSON.stringify(res1.data, null, 2));
        process.exit(1);
    }
    const itemId = itens[0].id;
    console.log(`  ✓ Purchase created! ID: ${compraId}, ItemID: ${itemId}`);

    if (compraObj.status !== 'PENDENTE') {
        console.error(`❌ Expected PENDENTE, got ${compraObj.status}`);
        process.exit(1);
    }
    console.log('  ✓ Status is PENDENTE');
    console.log('');

    // =================================================================
    // FLOW 2: Receber Compra (ENTRADA)
    // =================================================================
    console.log('📥 FLOW 2: Receiving Purchase...');
    const receberData = {
        dataRecebimento: new Date().toISOString(),
        itensRecebidos: [{
            itemId: itemId,
            quantidadeRecebida: 250,
            localizacaoId: IDs.localizacaoId
        }]
    };

    const res2 = await api('POST', `/api/estoque/compras/${compraId}/receber`, receberData, token);
    if (res2.status !== 200 && res2.status !== 201) {
        console.error('❌ Failed to receive purchase. Response:');
        console.error(JSON.stringify(res2.data, null, 2));
        process.exit(1);
    }

    const receivePayload = res2.data.data;
    const compraReceived = receivePayload.compra || receivePayload;

    if (compraReceived.status !== 'RECEBIDA') {
        console.error(`❌ Expected RECEBIDA, got ${compraReceived.status}`);
        // Check if partial?
    } else {
        console.log('  ✓ Status updated to RECEBIDA');
    }
    console.log('  ✓ Purchase received successfully!');
    console.log('');

    // =================================================================
    // FLOW 3: OS Stock Integration
    // =================================================================
    console.log('🛠️ FLOW 3: OS Stock Integration...');
    const osId = IDs.serviceOrderId;
    // Note: we need a valid serviceOrderMaterialId (seeded as 1).
    const osMatId = IDs.serviceOrderMaterialId;

    // 3.1 RESERVE
    console.log('  Testing RESERVE...');
    const reserveRes = await api('POST', `/api/service-orders/${osId}/materials/reserve`, {
        localizacaoOrigemId: IDs.localizacaoId
    }, token);

    if (reserveRes.status === 200 || reserveRes.status === 201) {
        console.log(`  ✓ Reserve successful`);
        // console.log(JSON.stringify(reserveRes.data, null, 2));
    } else {
        // If ALREADY Reserved, it might return 400. This is acceptable for repeated runs.
        if (JSON.stringify(reserveRes.data).includes("already")) {
            console.log('  ⚠ Reserve note: Already reserved/processed.');
        } else {
            console.error('❌ Reserve failed:', JSON.stringify(reserveRes.data, null, 2));
        }
    }

    // 3.2 CONSUME (Partial 42/50)
    console.log('  Testing CONSUME (42/50)...');
    const consumeRes = await api('POST', `/api/service-orders/${osId}/materials/consume`, {
        localizacaoOrigemId: IDs.localizacaoId,
        items: [{
            serviceOrderMaterialId: osMatId,
            quantityUsed: 42
        }]
    }, token);

    if (consumeRes.status === 200) {
        console.log(`  ✓ Consume successful`);
    } else {
        console.error('❌ Consume failed:', JSON.stringify(consumeRes.data, null, 2));
    }

    // 3.3 RETURN (Remaining?)
    console.log('  Testing RETURN...');
    const returnRes = await api('POST', `/api/service-orders/${osId}/materials/return`, {
        localizacaoOrigemId: IDs.localizacaoId
    }, token);

    if (returnRes.status === 200) {
        console.log(`  ✓ Return called successfully`);
    } else {
        console.error('❌ Return failed:', JSON.stringify(returnRes.data, null, 2));
    }
    console.log('');

    // =================================================================
    // FLOW 4: Expense Verification
    // =================================================================
    console.log('💰 FLOW 4: Check Expense Creation...');
    // Check expense linked to PURCHASE (compraId)
    const expenseRes = await api('GET', `/api/financeiro/despesas?compraId=${compraId}&empresaId=1`, null, token);

    if (expenseRes.status === 200) {
        const expenses = expenseRes.data.data;
        console.log(`  ✓ Expenses found: ${expenses.length}`);
        if (expenses.length === 1) {
            console.log('  ✓ EXACTLY ONE expense found! (Success)');
            console.log(`    Expense ID: ${expenses[0].id}, Desc: ${expenses[0].descricao}`);
        } else if (expenses.length === 0) {
            console.error(`❌ Expected 1 expense, found 0. (Maybe Expense creation failed inside Transaction?)`);
        } else {
            console.error(`❌ Expected 1 expense, found ${expenses.length}`);
        }
    } else {
        console.error('❌ Failed to list expenses:', JSON.stringify(expenseRes.data, null, 2));
    }

    console.log('\n✅ All Tests Completed.');
}

runTests().catch(console.error);
