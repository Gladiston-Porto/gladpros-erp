-- AddIndex: CodigoMFA(usuarioId, tipoAcao)
-- Otimiza a query de verificação de MFA: WHERE usuarioId = ? AND codigo = ? AND tipoAcao = ?
CREATE INDEX `idx_codigomfa_usuario_tipo` ON `CodigoMFA`(`usuarioId`, `tipoAcao`);

-- AddIndex: TentativaLogin(usuarioId, sucesso, criadaEm)
-- Otimiza BlockingService.getFailedAttemptCount: WHERE usuarioId = ? AND sucesso = FALSE AND criadaEm > ?
CREATE INDEX `idx_tentativa_usuario_sucesso_data` ON `TentativaLogin`(`usuarioId`, `sucesso`, `criadaEm`);

-- AddIndex: refresh_tokens(usuarioId, revogado, expiraEm)
-- Otimiza lookup de refresh tokens ativos: WHERE usuarioId = ? AND revogado = FALSE AND expiraEm > ?
CREATE INDEX `idx_refresh_usuario_ativo` ON `refresh_tokens`(`usuarioId`, `revogado`, `expiraEm`);
