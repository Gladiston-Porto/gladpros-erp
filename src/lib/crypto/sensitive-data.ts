/**
 * Sensitive Data Encryption/Decryption
 * 
 * Utiliza AES-256-GCM para criptografar dados sensíveis como:
 * - Routing Number
 * - Account Number
 * - Tax ID (SSN/EIN)
 * 
 * IMPORTANTE: A chave de criptografia deve estar em ENCRYPTION_KEY no .env
 * Formato: string hexadecimal de 64 caracteres (32 bytes = 256 bits)
 * 
 * Gerar nova chave: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
 
const _AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Obtém a chave de criptografia do ambiente.
 * Lança erro se não estiver configurada.
 */
function getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;

    if (!keyHex) {
        throw new Error(
            'ENCRYPTION_KEY não está configurada. ' +
            'Adicione uma chave de 64 caracteres hexadecimais ao .env. ' +
            'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    if (keyHex.length !== 64) {
        throw new Error(
            `ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (encontrado: ${keyHex.length})`
        );
    }

    return Buffer.from(keyHex, 'hex');
}

/**
 * Criptografa um valor sensível.
 * 
 * @param plaintext - Valor em texto puro para criptografar
 * @returns String criptografada no formato: iv:authTag:ciphertext (base64)
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) return '';

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:ciphertext (tudo em base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Descriptografa um valor sensível.
 * 
 * @param encryptedData - String criptografada no formato iv:authTag:ciphertext
 * @returns Valor original em texto puro
 */
export function decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Formato de dados criptografados inválido');
    }

    const [ivBase64, authTagBase64, ciphertext] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Verifica se a chave de criptografia está configurada.
 */
export function isEncryptionConfigured(): boolean {
    try {
        getEncryptionKey();
        return true;
    } catch {
        return false;
    }
}

/**
 * Extrai os últimos 4 caracteres de um valor.
 * Útil para armazenar accountLast4, taxIdLast4, etc.
 */
export function getLast4(value: string | null | undefined): string | null {
    if (!value || value.length < 4) return null;
    return value.slice(-4);
}

/**
 * Máscara um valor sensível, mostrando apenas os últimos 4 caracteres.
 * Ex: "123456789" -> "****6789"
 */
export function mask(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value.length <= 4) return '****';
    return `****${value.slice(-4)}`;
}
