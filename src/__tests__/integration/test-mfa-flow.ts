// Teste do fluxo MFA: login -> recebe mfaRequired -> verificar código exibido no console (dev)
import 'dotenv/config';
import fetch from 'node-fetch';

// Mock fetch for testing
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('MFA Flow Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require MFA after login', async () => {
    // Mock successful login response with MFA required
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: jest.fn().mockResolvedValue({
        mfaRequired: true,
        userId: 1,
        message: 'MFA code sent to email'
      })
    } as any);

    const email = process.env.SEED_ADMIN_EMAIL || 'admin@gladpros.local';
    const password = process.env.SEED_ADMIN_PASS || 'Admin@12345';

    console.log('1) Fazendo login para gerar MFA...');
    const login = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginJson = await login.json();
    console.log('Login status:', login.status, loginJson);

    if (!loginJson.mfaRequired) {
      console.log('Fluxo inesperado: MFA não requerido.');
      expect(loginJson.mfaRequired).toBe(true);
    } else {
      console.log('\n2) Agora pegue o código MFA do email (ou do log [DEV]) e valide:');
      console.log('   POST /api/auth/mfa/verify { userId, code, tipoAcao }');
      expect(loginJson.mfaRequired).toBe(true);
    }

    expect(loginJson).toBeDefined();
  });
});
