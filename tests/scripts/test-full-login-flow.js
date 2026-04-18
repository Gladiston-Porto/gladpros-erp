/**
 * Teste Automatizado de Fluxo de Login Seguro (VUL-003)
 * 
 * Verifica:
 * 1. Login com credenciais válidas
 * 2. Exigência de MFA
 * 3. Obtenção de código MFA (via helper de teste)
 * 4. Validação de MFA
 * 5. Recebimento de Cookies Seguros (authToken + refreshToken)
 * 6. Acesso a rota protegida (/dashboard)
 * 7. Bloqueio de acesso sem token
 */

let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  fetch = global.fetch;
}

if (!fetch) {
  console.error('❌ Fetch API não disponível. Use Node.js 18+ ou instale node-fetch.');
  process.exit(1);
}

// const { CookieJar } = require('tough-cookie'); // Removido para evitar dependência externa

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'admin@gladpros.com';
const PASSWORD = 'admin123';

// Gerenciador de cookies simples
let cookies = {};

function parseCookies(response) {
  const raw = response.headers.raw()['set-cookie'];
  if (!raw) return;
  
  raw.forEach(cookieStr => {
    const parts = cookieStr.split(';');
    const [name, value] = parts[0].split('=');
    cookies[name] = value;
    console.log(`   🍪 Cookie recebido: ${name} = ${value.substring(0, 10)}...`);
  });
}

function getCookieHeader() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function waitForServer() {
  console.log('⏳ Aguardando servidor iniciar...');
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(BASE_URL);
      console.log('✅ Servidor online!');
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
      process.stdout.write('.');
    }
  }
  console.log('\n❌ Servidor não respondeu a tempo.');
  return false;
}

async function runTest() {
  if (!await waitForServer()) return;

  console.log('🛡️ INICIANDO TESTE DE SEGURANÇA DE LOGIN\n');

  // 1. Tentar acessar dashboard sem login (Deve falhar/redirecionar)
  console.log('1️⃣ Testando acesso não autorizado ao Dashboard...');
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    if (res.status === 307 || res.status === 302) {
      console.log('   ✅ Redirecionamento correto (Status:', res.status, ')');
      console.log('   📍 Location:', res.headers.get('location'));
    } else if (res.status === 200) {
      // Se retornar 200, pode ser que o middleware não esteja bloqueando ou retornou a página de login (se redirect for follow)
      // Com redirect: manual, deve ser 3xx
      console.log('   ❌ FALHA: Acesso permitido ou sem redirecionamento (Status:', res.status, ')');
    } else {
      console.log('   ⚠️ Status inesperado:', res.status);
    }
  } catch (e) {
    console.log('   ❌ Erro de conexão:', e.message);
    return;
  }

  // 2. Fazer Login
  console.log('\n2️⃣ Iniciando Login...');
  let userId;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    
    const data = await res.json();
    if (data.mfaRequired) {
      console.log('   ✅ Login inicial aceito. MFA Requerido.');
      userId = data.user.id;
    } else {
      console.log('   ❌ Falha no login inicial:', data);
      return;
    }
  } catch (e) {
    console.log('   ❌ Erro no login:', e.message);
    return;
  }

  // 3. Obter Código MFA
  console.log('\n3️⃣ Obtendo código MFA (Test Helper)...');
  let mfaCode;
  try {
    // Aguardar propagação
    await new Promise(r => setTimeout(r, 1000));
    const res = await fetch(`${BASE_URL}/api/test-helpers/get-last-mfa`);
    const data = await res.json();
    mfaCode = data.mfa?.code;
    console.log('   ✅ Código obtido:', mfaCode);
  } catch (e) {
    console.log('   ❌ Erro ao obter MFA:', e.message);
    return;
  }

  // 4. Validar MFA e Obter Tokens
  console.log('\n4️⃣ Validando MFA...');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code: mfaCode, tipoAcao: 'LOGIN' })
    });
    
    parseCookies(res);
    
    const data = await res.json();
    if (data.success) {
      console.log('   ✅ MFA Validado com sucesso!');
      
      if (cookies['authToken'] && cookies['refreshToken']) {
        console.log('   ✅ Cookies de segurança presentes (authToken + refreshToken)');
      } else {
        console.log('   ❌ FALHA: Cookies de segurança ausentes!');
        console.log('   Cookies atuais:', Object.keys(cookies));
      }
    } else {
      console.log('   ❌ Falha na validação MFA:', data);
      return;
    }
  } catch (e) {
    console.log('   ❌ Erro na validação MFA:', e.message);
    return;
  }

  // 5. Acessar Dashboard e outras rotas protegidas com Cookies
  console.log('\n5️⃣ Acessando Rotas Protegidas...');
  
  const routesToTest = [
    '/dashboard',
    '/financeiro',
    '/estoque',
    '/projetos',
    '/rh',
    '/clientes',
    '/usuarios'
  ];

  for (const route of routesToTest) {
    try {
      process.stdout.write(`   Testing ${route}... `);
      const res = await fetch(`${BASE_URL}${route}`, {
        headers: { 'Cookie': getCookieHeader() },
        redirect: 'manual'
      });
      
      if (res.status === 200) {
        console.log('✅ OK (200)');
      } else {
        console.log(`❌ FALHA (${res.status})`);
        if (res.status === 307 || res.status === 302) {
          console.log('      📍 Location:', res.headers.get('location'));
        }
      }
    } catch (e) {
      console.log(`❌ ERRO: ${e.message}`);
    }
  }

  // 6. Testar Fluxos Auxiliares de Login (Esqueci Senha, Primeiro Acesso, etc)
  console.log('\n6️⃣ Testando Fluxos Auxiliares de Login...');

  // 6.1 Páginas Públicas
  const publicPages = [
    '/esqueci-senha',
    '/desbloqueio',
    '/primeiro-acesso?userId=1' // Simula acesso com param
  ];

  console.log('   🔍 Verificando disponibilidade de páginas públicas...');
  for (const page of publicPages) {
    try {
      process.stdout.write(`   Testing ${page}... `);
      const res = await fetch(`${BASE_URL}${page}`);
      if (res.status === 200) {
        console.log('✅ OK (200)');
      } else {
        console.log(`❌ FALHA (${res.status})`);
      }
    } catch (e) {
      console.log(`❌ ERRO: ${e.message}`);
    }
  }

  // 6.2 Fluxo de Esqueci Senha (Geração de Token)
  console.log('\n   🔍 Testando API de Esqueci Senha...');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL })
    });
    
    const data = await res.json();
    if (res.ok && data.ok) {
      console.log('   ✅ Solicitação aceita');
      if (data.resetUrl) {
        console.log('   ✅ URL de reset gerada (DEV mode):', data.resetUrl);
        
        // Validar acesso à página de reset com token
        const resetPath = data.resetUrl.replace(BASE_URL, '');
        process.stdout.write(`   Testing Access ${resetPath}... `);
        const resetRes = await fetch(data.resetUrl);
        if (resetRes.status === 200) {
          console.log('✅ OK (200)');
        } else {
          console.log(`❌ FALHA (${resetRes.status})`);
        }
      } else {
        console.log('   ⚠️ URL de reset não retornada (Provavelmente em PROD ou email não encontrado)');
      }
    } else {
      console.log('   ❌ Falha na solicitação:', data);
    }
  } catch (e) {
    console.log('   ❌ Erro no teste de esqueci senha:', e.message);
  }

  // 6.3 Fluxo de Status de Usuário (Desbloqueio)
  console.log('\n   🔍 Testando API de Status de Usuário (Desbloqueio)...');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/user-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL })
    });
    
    const data = await res.json();
    if (res.ok) {
      if (data.blocked === false) {
        console.log('   ✅ Usuário encontrado (Status: Não Bloqueado)');
      } else {
        console.log('   ✅ Status do usuário obtido:', data.email);
        console.log('   ✅ Nome:', data.nomeCompleto);
      }
    } else {
      console.log('   ❌ Falha ao obter status:', data);
    }
  } catch (e) {
    console.log('   ❌ Erro no teste de status:', e.message);
  }

  console.log('\n🏁 Teste Finalizado');
}

runTest();
