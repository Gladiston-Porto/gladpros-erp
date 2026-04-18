/**
 * API Utilities - Central Exports
 * 
 * Ponto central de exportação de todos os helpers de API
 */

// Types
export * from './types';

// Responses
export * from './responses';

// Error Handler
export * from './error-handler';

// Authentication (server-side helpers — authenticatedFetch excluded, use ./client instead)
export { getAuthUser, requireAuth, hasRole, requireRole, requireRoles, UserRoles, EstoquePermissions } from './auth';
export type { JWTPayload, UserRole } from './auth';

// Pagination
export * from './pagination';

// Logger
export * from './logger';

// API Clients
export * from './client';
