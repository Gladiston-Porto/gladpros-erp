export const AUTH_ACCESS_TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60;
export const AUTH_ACCESS_TOKEN_EXPIRY = '8h';
export const AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const AUTH_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
export const AUTH_DEVICE_TRUST_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
// rounds=10 para backup codes: são códigos de uso único, menos sensíveis que senhas
// A redução de 12→10 é intencional para manter geração em lote (<3s para 8 códigos)
export const BACKUP_CODE_BCRYPT_ROUNDS = 10;
