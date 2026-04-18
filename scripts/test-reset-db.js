// scripts/test-reset-db.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to parse env file manually to verify values against what is loaded
function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx !== -1) {
            const key = line.substring(0, idx);
            let val = line.substring(idx + 1);
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            env[key] = val;
        }
    });
    return env;
}

// 1. Identify Target URL
// We expect process.env.DATABASE_URL to be set by "dotenv -e .env.test" or .env.e2e
// But we double check by reading .env.test or .env.e2e directly to be sure we are using the test one.
const envTest = parseEnv(path.resolve('.env.test'));
const envE2E = parseEnv(path.resolve('.env.e2e'));
const envMain = parseEnv(path.resolve('.env'));

// Determine the URL intended for testing
// Priority 1: DATABASE_URL passed via environment (e.g. from dotenv -e .env.test)
// Priority 2: DATABASE_URL in .env.e2e file (for E2E tests)
// Priority 3: DATABASE_URL in .env.test file
// Priority 4: DATABASE_URL_TEST in .env.test file (fallback)
let targetUrl = process.env.DATABASE_URL;

// If process.env.DATABASE_URL matches the main .env DATABASE_URL, beware!
// Unless main .env is ALSO a test db (unlikely in this context)
if (targetUrl === envMain.DATABASE_URL) {
    // Check if .env.e2e or .env.test exists and has a different URL
    if (envE2E.DATABASE_URL && envE2E.DATABASE_URL !== envMain.DATABASE_URL) {
        console.warn("⚠️  ALERTA: process.env.DATABASE_URL parece ser o de produção/dev (.env), mas .env.e2e existe.");
        console.warn("   Usando URL do .env.e2e para garantir segurança.");
        targetUrl = envE2E.DATABASE_URL;
    } else if (envTest.DATABASE_URL && envTest.DATABASE_URL !== envMain.DATABASE_URL) {
        console.warn("⚠️  ALERTA: process.env.DATABASE_URL parece ser o de produção/dev (.env), mas .env.test existe.");
        console.warn("   Usando URL do .env.test para garantir segurança.");
        targetUrl = envTest.DATABASE_URL;
    }
}

// Fallback if not set in env
if (!targetUrl) {
    targetUrl = envE2E.DATABASE_URL || envTest.DATABASE_URL || envTest.DATABASE_URL_TEST;
}

if (!targetUrl) {
    console.error("❌ Erro: Não foi possível determinar a DATABASE_URL de teste.");
    process.exit(1);
}

// Security check: Ensure we're using a test database
if (!targetUrl.includes('test') && !targetUrl.includes('gladpros_test') && !targetUrl.includes('gladpros_e2e')) {
    console.error("❌ ABORTANDO: DATABASE_URL não parece ser um banco de teste.");
    console.error("   Para segurança, só resetamos bancos com 'test', 'gladpros_test' ou 'gladpros_e2e' no nome.");
    process.exit(1);
}

// Additional safety: Never reset the main .env database
if (envMain.DATABASE_URL && targetUrl === envMain.DATABASE_URL) {
    console.error("❌ ABORTANDO: DATABASE_URL de teste é igual ao .env principal.");
    process.exit(1);
}

// 2. Safety Guards (Critical)
const isTestName = targetUrl.includes('test') || targetUrl.includes('gladpros_test') || targetUrl.includes('gladpros_e2e');
const isProdUrl = targetUrl === envMain.DATABASE_URL && !envMain.DATABASE_URL?.includes('test');

if (!isTestName) {
    console.error(`❌ ABORTANDO: O nome do banco não contem 'test' ou 'gladpros_e2e': ${targetUrl}`);
    process.exit(1);
}

if (isProdUrl) {
    console.error(`❌ ABORTANDO: A URL de destino é IDÊNTICA à do .env principal (DEV/PROD).`);
    process.exit(1);
}

console.log(`🗑️  Resetando banco de TESTES: ${targetUrl}`);

try {
    // We explicitly passthrough the confirmed targetUrl as DATABASE_URL to the commands
    // PLUS all vars from .env.e2e or .env.test (for seed credentials, etc)
    const testEnv = envE2E.DATABASE_URL ? envE2E : envTest;
    const env = { 
        ...process.env, 
        ...testEnv, // Merge all test env vars (SEED_ADMIN_EMAIL, SEED_ADMIN_PASS, etc)
        DATABASE_URL: targetUrl 
    };

    // Reset
    console.log("🔄 Running migrate reset...");
    execSync('npx prisma migrate reset --force --skip-seed', {
        env,
        stdio: 'inherit',
        shell: true
    });

    // Seed
    console.log("🌱 Seeding test database...");
    console.log(`   Using SEED_ADMIN_EMAIL: ${env.SEED_ADMIN_EMAIL || '(default)'}`);
    execSync('node prisma/seed.js', {
        env,
        stdio: 'inherit',
        shell: true
    });

    console.log("✅ Test database reset complete.");
} catch (error) {
    console.error("\n❌ Erro ao resetar banco.");
    console.error("Dica: Verifique se o banco de dados de teste existe e se o usuário tem permissão.");
    process.exit(1);
}
