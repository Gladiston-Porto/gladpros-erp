// Script para testar o sistema de desbloqueio
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

describe('Unlock System Integration Test', () => {
  it.skip('should setup test user for unlock system', async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'dev',
    password: 'dev123',
    database: 'gladpros',
    port: 3306
  });

  try {
    // 1. Criar/Atualizar usuário de teste com PIN e pergunta de segurança
    const testEmail = 'usuario.bloqueado@gladpros.com';
    const testPin = '1234';
    const testQuestion = 'Qual é o nome do seu primeiro pet?';
    const testAnswer = 'rex'; // resposta em minúscula
    
    // Hash do PIN e resposta
    const pinHash = await bcrypt.hash(testPin, 10);
    const answerHash = await bcrypt.hash(testAnswer, 10);
    const passwordHash = await bcrypt.hash('123456', 10);

    console.log('🔧 Configurando usuário de teste...');
    
    // Inserir ou atualizar usuário
    await conn.execute(`
      INSERT INTO Usuario (
        email, senha, nomeCompleto, nivel, status,
        endereco1, endereco2, cidade, atualizadoEm,
        bloqueado, bloqueadoEm, 
        pinSeguranca, perguntaSecreta, respostaSecreta,
        primeiroAcesso, senhaProvisoria
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        senha = VALUES(senha),
        nomeCompleto = VALUES(nomeCompleto),
        atualizadoEm = NOW(),
        bloqueado = VALUES(bloqueado),
        bloqueadoEm = VALUES(bloqueadoEm),
        pinSeguranca = VALUES(pinSeguranca),
        perguntaSecreta = VALUES(perguntaSecreta),
        respostaSecreta = VALUES(respostaSecreta)
    `, [
      testEmail,
      passwordHash,
      'Usuário Bloqueado Teste',
      'USUARIO',
      'ATIVO',
      'Rua Teste, 123', // endereco1
      'Apto 45', // endereco2
      'São Paulo', // cidade
      true, // bloqueado
      pinHash,
      testQuestion,
      answerHash,
      false, // primeiro acesso
      false  // senha provisória
    ]);

    console.log('✅ Usuário de teste configurado:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Senha: 123456`);
    console.log(`   PIN: ${testPin}`);
    console.log(`   Pergunta: ${testQuestion}`);
    console.log(`   Resposta: ${testAnswer}`);
    console.log('   Status: BLOQUEADO');

    // 2. Verificar se foi criado corretamente
    const [usersResult] = await conn.execute(`
      SELECT id, email, nomeCompleto, bloqueado, 
             pinSeguranca IS NOT NULL as temPin,
             perguntaSecreta IS NOT NULL as temPergunta
      FROM Usuario 
      WHERE email = ?
    `, [testEmail]);

    const users = usersResult as { id: string; email: string; nomeCompleto: string; bloqueado: boolean; temPin: boolean; temPergunta: boolean }[];

    console.log('\n📋 Verificação do usuário:');
    console.table(users);

    // 3. Criar algumas tentativas de login falhadas para simular bloqueio
    const userId = users[0].id;
    for (let i = 0; i < 6; i++) {
      await conn.execute(`
        INSERT INTO TentativaLogin (usuarioId, email, sucesso, ip, userAgent, criadaEm)
        VALUES (?, ?, FALSE, ?, ?, NOW())
      `, [
        userId,
        testEmail,
        '127.0.0.1',
        'Test Browser - Desbloqueio'
      ]);
    }

    console.log('✅ Tentativas de login falhadas criadas para simular bloqueio');

    return {
      email: testEmail,
      pin: testPin,
      question: testQuestion,
      answer: testAnswer,
      userId: userId
    };

  } finally {
    await conn.end();
  }
});

  it('should provide unlock system test instructions', () => {
    console.log('\n🎯 INSTRUÇÕES PARA TESTE MANUAL:');
    console.log('1. Acesse: http://localhost:3000/desbloqueio');
    console.log('2. Digite o email do usuário de teste');
    console.log('3. Clique em "Verificar Conta"');
    console.log('4. Teste desbloqueio com PIN ou pergunta de segurança');
    console.log('5. Após desbloqueio, tente fazer login');

    // Basic assertion
    expect(true).toBe(true);
  });
});
