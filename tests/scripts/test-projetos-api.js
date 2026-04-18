/**
 * Teste completo da API /api/projetos
 * 1. Faz login
 * 2. Busca projetos
 * 3. Verifica estrutura da paginação
 */

const LOGIN_URL = 'http://localhost:3000/api/auth/login';
const API_URL = 'http://localhost:3000/api/projetos?page=1&pageSize=25';

async function testarAPI() {
  console.log('🧪 TESTE COMPLETO - API /api/projetos\n');
  
  try {
    // 1. Fazer login
    console.log('1️⃣  Fazendo login...');
    const loginResponse = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gladpros.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.log('❌ Login falhou:', loginResponse.status);
      console.log('❌ Erro:', errorData);
      throw new Error('Falha no login');
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login bem-sucedido\n');
    
    // 2. Buscar projetos
    console.log('2️⃣  Buscando projetos...');
    const response = await fetch(API_URL, {
      headers: {
        'Cookie': cookies || ''
      }
    });
    const data = await response.json();
    
    console.log('✅ Status:', response.status);
    console.log('✅ Response recebida\n');
    
    // Verificar estrutura
    console.log('📊 ESTRUTURA DA RESPOSTA:');
    console.log('- Tem "data"?', 'data' in data);
    console.log('- Tem "pagination"?', 'pagination' in data);
    console.log('- Tem "paginacao"?', 'paginacao' in data);
    
    if ('data' in data) {
      console.log('\n📋 DATA:');
      console.log('- Total de projetos:', data.data?.length || 0);
      console.log('- Primeiro projeto:', data.data?.[0]?.titulo || 'Nenhum');
    }
    
    if ('pagination' in data) {
      console.log('\n📄 PAGINATION (CORRETO):');
      console.log(JSON.stringify(data.pagination, null, 2));
    }
    
    if ('paginacao' in data) {
      console.log('\n⚠️  PAGINACAO (ERRADO - deveria ser pagination):');
      console.log(JSON.stringify(data.paginacao, null, 2));
    }
    
    // Verificar campos obrigatórios
    if (data.pagination) {
      const required = ['page', 'pageSize', 'totalRecords', 'totalPages'];
      const missing = required.filter(field => !(field in data.pagination));
      
      if (missing.length === 0) {
        console.log('\n✅ TODOS OS CAMPOS OBRIGATÓRIOS PRESENTES');
      } else {
        console.log('\n❌ CAMPOS FALTANDO:', missing);
      }
    }
    
    console.log('\n✅ TESTE CONCLUÍDO');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  }
}

testarAPI();
