/**
 * API Pagination Helpers
 * 
 * Funções para paginação e filtros
 */

import { NextRequest } from 'next/server';

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * Parâmetros de ordenação
 */
export interface SortParams {
  orderBy: string;
  order: 'asc' | 'desc';
}

/**
 * Parâmetros de busca
 */
export interface SearchParams {
  search?: string;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters?: Record<string, any>;
}

/**
 * Extrai parâmetros de paginação da URL
 */
export function getPaginationParams(
  request: NextRequest,
  defaultPageSize: number = 20,
  maxPageSize: number = 100
): PaginationParams {
  const searchParams = request.nextUrl.searchParams;
  
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(searchParams.get('pageSize') || String(defaultPageSize)))
  );
  
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  
  return { page, pageSize, skip, take };
}

/**
 * Extrai parâmetros de ordenação da URL
 */
export function getSortParams(
  request: NextRequest,
  defaultOrderBy: string = 'id',
  allowedFields: string[] = ['id', 'nome', 'codigo', 'createdAt', 'updatedAt']
): SortParams {
  const searchParams = request.nextUrl.searchParams;
  
  const orderBy = searchParams.get('orderBy') || defaultOrderBy;
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
  
  // Valida campo de ordenação
  const validOrderBy = allowedFields.includes(orderBy) ? orderBy : defaultOrderBy;
  const validOrder = ['asc', 'desc'].includes(order) ? order : 'desc';
  
  return { 
    orderBy: validOrderBy, 
    order: validOrder 
  };
}

/**
 * Extrai parâmetros de busca da URL
 */
export function getSearchParams(request: NextRequest): SearchParams {
  const searchParams = request.nextUrl.searchParams;
  
  const search = searchParams.get('search') || undefined;
  
   
  // Extrai filtros customizados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    // Ignora parâmetros reservados
    if (['page', 'pageSize', 'orderBy', 'order', 'search'].includes(key)) {
      return;
    }
    
    // Parse valores especiais
    if (value === 'true') filters[key] = true;
    else if (value === 'false') filters[key] = false;
    else if (value === 'null') filters[key] = null;
    else if (!isNaN(Number(value))) filters[key] = Number(value);
    else filters[key] = value;
  });
  
  return { search, filters: Object.keys(filters).length > 0 ? filters : undefined };
}

/**
 * Cria objeto Prisma orderBy a partir dos parâmetros
 */
export function createPrismaOrderBy(sortParams: SortParams): Record<string, 'asc' | 'desc'> {
  return { [sortParams.orderBy]: sortParams.order };
}

/**
 * Cria objeto Prisma where para busca por texto
 */
export function createTextSearchWhere(
   
  search: string | undefined,
  fields: string[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!search || !fields.length) return {};
  
  // Note: mode 'insensitive' is PostgreSQL-only in Prisma.
  // MySQL default collation (utf8mb4_unicode_ci) is already case-insensitive.
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: search,
      }
    }))
  };
}

 
 
/**
 * Mescla múltiplos where conditions com AND
 */
 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeWhereConditions(...conditions: any[]): any {
  const validConditions = conditions.filter(c => c && Object.keys(c).length > 0);
  
  if (validConditions.length === 0) return {};
  if (validConditions.length === 1) return validConditions[0];
  
  return { AND: validConditions };
}
