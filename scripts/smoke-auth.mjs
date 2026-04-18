// scripts/smoke-auth.mjs
// import 'dotenv/config'; // Removed to avoid conflict, reliance on process.env from caller
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Helper functions (consistent with MFAService)
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");

// Force Prisma to use the environment variable explicitly
const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gladiston.porto@gladpros.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_TEST || 'ChangeMe_123!';

async function dbName() {
    try {
        const r = await prisma.$queryRaw`SELECT DATABASE() as db`;
        return r?.[0]?.db;
    } catch (e) {
        return 'UNKNOWN (Error fetching db name)';
    }
}

async function main() {
    console.log('🚀 Starting Auth Smoke Test...');
    console.log('Target:', BASE_URL);

    // Debug DB Connection
    const dbUrl = process.env.DATABASE_URL || '';
    console.log("🔌 DATABASE_URL=", dbUrl.replace(/:[^:@]+@/, ':***@'));
    console.log("🗄️  DB(prisma)=", await dbName());

    // 1) Login
    console.log('\n1. Login attempt with', ADMIN_EMAIL, '...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!loginRes.ok) {
        const text = await loginRes.text();
        throw new Error(`Login failed (${loginRes.status}): ${text}`);
    }

    const loginJson = await loginRes.json();

    // Confirmed structure based on API endpoint analysis:
    // user object contains id. root body might have mfaRequired: true
    const userId = loginJson.user?.id;
    if (!userId) throw new Error('UserId not found in login response: ' + JSON.stringify(loginJson));

    console.log('✅ Login Step 1 OK. MFA Required:', loginJson.mfaRequired);

    let code;
    if (process.env.TEST_MODE === 'true') {
        // For smoke test, generate a known MFA code
        code = generateCode();
        const hashedCode = hashCode(code);
        
        // Clean existing LOGIN MFA for user (avoid interfering with other types)
        await prisma.codigoMFA.deleteMany({ where: { usuarioId: Number(userId), tipoAcao: "LOGIN" } });
        
        // Create MFA with generated code
        await prisma.codigoMFA.create({
            data: {
                usuarioId: Number(userId),
                codigo: hashedCode,
                tipoAcao: "LOGIN",
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
                usado: false
            }
        });

        console.log('✅ Generated MFA code for smoke test.');
    }

    const tipoAcao = "LOGIN";

    // 3) MFA Verify
    console.log('\n3. Verifying MFA code...');
    const verifyRes = await fetch(`${BASE_URL}/api/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: Number(userId),
            usuarioId: Number(userId),
            code: code,
            codigo: code,
            tipoAcao: tipoAcao // Use the actual type from DB
        }),
    });

    const verifyText = await verifyRes.text();
    if (!verifyRes.ok) {
        throw new Error(`MFA verify failed (${verifyRes.status}): ${verifyText}`);
    }

    const verifyJson = JSON.parse(verifyText);
    const accessToken = verifyJson.token; // Confirmed 'token' field in API response

    if (!accessToken) throw new Error('Access Token not found in verify response');
    console.log('✅ MFA Verification OK. Token received.');

    // 4) Protected Endpoint
    console.log('\n4. Testing protected endpoint (/api/metrics)...');
    // Note: /api/dashboard/executive might be heavy or require more data. 
    // Trying a lighter one or the requested one. User suggested /api/dashboard/executive?period=30d
    const execRes = await fetch(`${BASE_URL}/api/dashboard/executive?period=30d`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (execRes.status === 404) {
        console.warn('⚠️ /api/dashboard/executive not found. Trying /api/usuarios/me or similar if exists.');
        // Fallback check? For now, let's stick to the plan but allow 404 if route doesn't exist yet
        // If the user SAYS it works, it should work.
    }

    if (!execRes.ok) {
        const errorText = await execRes.text();
        throw new Error(`Protected endpoint failed (${execRes.status}): ${errorText}`);
    }
    console.log('✅ Protected Endpoint OK.');

    // 5) Logout
    console.log('\n5. Logging out...');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
    });

    if (!logoutRes.ok) throw new Error(`Logout failed: ${logoutRes.status}`);
    console.log('✅ Logout OK.');

    console.log('\n🎉 SMOKE TEST PASSED SUCCESSFULLY!');
}

main()
    .catch((e) => {
        console.error('\n❌ SMOKE TEST FAILED:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
