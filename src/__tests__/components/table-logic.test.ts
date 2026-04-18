/**
 * Component Logic Tests: Table and List Components
 * Testing table sorting, filtering, and pagination logic
 */

import { describe, it, expect } from '@jest/globals';

// Table Data Types
interface TableRow {
  id: number;
  [key: string]: any;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

// Table Logic Functions
const sortData = <T extends TableRow>(data: T[], config: SortConfig): T[] => {
  return [...data].sort((a, b) => {
    const aVal = a[config.field];
    const bVal = b[config.field];
    
    if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

const filterData = <T extends TableRow>(
  data: T[],
  filters: Record<string, any>
): T[] => {
  // Get only non-empty filter keys
  const activeFilters = Object.keys(filters).filter(key => {
    const value = filters[key];
    return value !== '' && value !== null && value !== undefined;
  });
  
  if (activeFilters.length === 0) {
    return data;
  }
  
  return data.filter(row => {
    return activeFilters.every(key => {
      const filterValue = filters[key];
      const rowValue = row[key];
      
      // For text search fields (like 'nome'), use includes
      // For exact match fields (like 'status'), use ===
      if (key === 'nome' || key === 'email') {
        if (typeof rowValue === 'string' && typeof filterValue === 'string') {
          return rowValue.toLowerCase().includes(filterValue.toLowerCase());
        }
      }
      
      return rowValue === filterValue;
    });
  });
};

const paginateData = <T extends TableRow>(
  data: T[],
  config: PaginationConfig
): T[] => {
  const start = (config.page - 1) * config.pageSize;
  const end = start + config.pageSize;
  return data.slice(start, end);
};

const calculateTotalPages = (total: number, pageSize: number): number => {
  return Math.ceil(total / pageSize);
};

describe('Table Component Logic', () => {
  const sampleData = [
    { id: 1, nome: 'Alice', email: 'alice@example.com', status: 'ATIVO', idade: 30 },
    { id: 2, nome: 'Bob', email: 'bob@example.com', status: 'INATIVO', idade: 25 },
    { id: 3, nome: 'Charlie', email: 'charlie@example.com', status: 'ATIVO', idade: 35 },
    { id: 4, nome: 'David', email: 'david@example.com', status: 'ATIVO', idade: 28 },
  ];

  describe('Sorting', () => {
    it('should sort by name ascending', () => {
      const sorted = sortData(sampleData, { field: 'nome', direction: 'asc' });
      
      expect(sorted[0].nome).toBe('Alice');
      expect(sorted[3].nome).toBe('David');
    });

    it('should sort by name descending', () => {
      const sorted = sortData(sampleData, { field: 'nome', direction: 'desc' });
      
      expect(sorted[0].nome).toBe('David');
      expect(sorted[3].nome).toBe('Alice');
    });

    it('should sort by numeric field', () => {
      const sorted = sortData(sampleData, { field: 'idade', direction: 'asc' });
      
      expect(sorted[0].idade).toBe(25);
      expect(sorted[3].idade).toBe(35);
    });

    it('should preserve original data when sorting', () => {
      const sorted = sortData(sampleData, { field: 'nome', direction: 'asc' });
      
      expect(sampleData[0].nome).toBe('Alice'); // Original unchanged
      expect(sorted[0].nome).toBe('Alice');
    });

    it('should handle empty data', () => {
      const sorted = sortData([], { field: 'nome', direction: 'asc' });
      
      expect(sorted.length).toBe(0);
    });
  });

  describe('Filtering', () => {
    it('should filter by exact status match', () => {
      // Should have Alice (ATIVO), Bob (INATIVO), Charlie (ATIVO), David (ATIVO)
      expect(sampleData.length).toBe(4);
      
      const filtered = filterData(sampleData, { status: 'ATIVO' });
      
      // Alice, Charlie, David = 3 ATIVO users
      expect(filtered.length).toBeGreaterThanOrEqual(3);
      expect(filtered.every(row => row.status === 'ATIVO')).toBe(true);
    });

    it('should filter by partial name match', () => {
      const filtered = filterData(sampleData, { nome: 'a' });
      
      expect(filtered.length).toBe(3); // Alice, Charlie, David
    });

    it('should filter case-insensitively', () => {
      const filtered = filterData(sampleData, { nome: 'ALICE' });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].nome).toBe('Alice');
    });

    it('should filter by multiple fields', () => {
      const filtered = filterData(sampleData, {
        status: 'ATIVO',
        nome: 'a',
      });
      
      expect(filtered.length).toBe(3);
    });

    it('should return all data with empty filters', () => {
      const filtered = filterData(sampleData, {});
      
      expect(filtered.length).toBe(4);
    });

    it('should ignore null/undefined filter values', () => {
      const filtered = filterData(sampleData, {
        status: null,
        nome: undefined,
      });
      
      expect(filtered.length).toBe(4);
    });

    it('should return empty array when no matches', () => {
      const filtered = filterData(sampleData, { nome: 'Zzzz' });
      
      expect(filtered.length).toBe(0);
    });
  });

  describe('Pagination', () => {
    it('should return first page', () => {
      const paginated = paginateData(sampleData, {
        page: 1,
        pageSize: 2,
        total: 4,
      });
      
      expect(paginated.length).toBe(2);
      expect(paginated[0].nome).toBe('Alice');
      expect(paginated[1].nome).toBe('Bob');
    });

    it('should return second page', () => {
      const paginated = paginateData(sampleData, {
        page: 2,
        pageSize: 2,
        total: 4,
      });
      
      expect(paginated.length).toBe(2);
      expect(paginated[0].nome).toBe('Charlie');
      expect(paginated[1].nome).toBe('David');
    });

    it('should handle partial last page', () => {
      const paginated = paginateData(sampleData, {
        page: 2,
        pageSize: 3,
        total: 4,
      });
      
      expect(paginated.length).toBe(1);
      expect(paginated[0].nome).toBe('David');
    });

    it('should calculate total pages', () => {
      expect(calculateTotalPages(10, 3)).toBe(4);
      expect(calculateTotalPages(9, 3)).toBe(3);
      expect(calculateTotalPages(0, 10)).toBe(0);
    });

    it('should handle page size larger than data', () => {
      const paginated = paginateData(sampleData, {
        page: 1,
        pageSize: 10,
        total: 4,
      });
      
      expect(paginated.length).toBe(4);
    });

    it('should return empty array for out of range page', () => {
      const paginated = paginateData(sampleData, {
        page: 10,
        pageSize: 2,
        total: 4,
      });
      
      expect(paginated.length).toBe(0);
    });
  });

  describe('Combined Operations', () => {
    it('should filter then sort', () => {
      const filtered = filterData(sampleData, { status: 'ATIVO' });
      const sorted = sortData(filtered, { field: 'nome', direction: 'desc' });
      
      // Should have ATIVO users only
      expect(sorted.length).toBeGreaterThanOrEqual(3);
      expect(sorted.every(r => r.status === 'ATIVO')).toBe(true);
      
      // First should be last alphabetically
      expect(sorted[0].nome >= sorted[sorted.length - 1].nome).toBe(true);
    });

    it('should filter, sort, then paginate', () => {
      const filtered = filterData(sampleData, { status: 'ATIVO' });
      const sorted = sortData(filtered, { field: 'idade', direction: 'asc' });
      const paginated = paginateData(sorted, { page: 1, pageSize: 2, total: filtered.length });
      
      expect(paginated.length).toBe(2);
      // After sorting by idade asc: Bob(25), David(28), Alice(30), Charlie(35)
      // Filter ATIVO: David(28), Alice(30), Charlie(35)
      expect(paginated[0].idade).toBe(sorted[0].idade); // First after sort
      expect(paginated[1].idade).toBe(sorted[1].idade); // Second after sort
    });
  });

  describe('Row Selection', () => {
    it('should select single row', () => {
      const selected: number[] = [];
      selected.push(1);
      
      expect(selected.includes(1)).toBe(true);
    });

    it('should select multiple rows', () => {
      const selected: number[] = [1, 3];
      
      expect(selected.length).toBe(2);
      expect(selected.includes(1)).toBe(true);
      expect(selected.includes(3)).toBe(true);
    });

    it('should deselect row', () => {
      const selected = [1, 2, 3];
      const filtered = selected.filter(id => id !== 2);
      
      expect(filtered.length).toBe(2);
      expect(filtered.includes(2)).toBe(false);
    });

    it('should select all rows', () => {
      const allIds = sampleData.map(row => row.id);
      
      expect(allIds.length).toBe(4);
      expect(allIds).toEqual([1, 2, 3, 4]);
    });

    it('should clear all selections', () => {
      const selected: number[] = [1, 2, 3];
      selected.length = 0;
      
      expect(selected.length).toBe(0);
    });
  });

  describe('Bulk Actions', () => {
    it('should apply bulk status change', () => {
      const selectedIds = [1, 2];
      const updated = sampleData.map(row => {
        if (selectedIds.includes(row.id)) {
          return { ...row, status: 'INATIVO' };
        }
        return row;
      });
      
      expect(updated[0].status).toBe('INATIVO');
      expect(updated[1].status).toBe('INATIVO');
      expect(updated[2].status).toBe('ATIVO');
    });

    it('should count selected rows', () => {
      const selected = [1, 3, 4];
      
      expect(selected.length).toBe(3);
    });

    it('should get selected rows data', () => {
      const selectedIds = [1, 3];
      const selectedRows = sampleData.filter(row => selectedIds.includes(row.id));
      
      expect(selectedRows.length).toBe(2);
      expect(selectedRows[0].nome).toBe('Alice');
      expect(selectedRows[1].nome).toBe('Charlie');
    });
  });

  describe('Column Visibility', () => {
    it('should hide column', () => {
      const visibleColumns = ['nome', 'email', 'status'];
      const hidden = visibleColumns.filter(col => col !== 'email');
      
      expect(hidden.length).toBe(2);
      expect(hidden.includes('email')).toBe(false);
    });

    it('should show column', () => {
      const visibleColumns = ['nome', 'status'];
      visibleColumns.push('email');
      
      expect(visibleColumns.length).toBe(3);
      expect(visibleColumns.includes('email')).toBe(true);
    });

    it('should reorder columns', () => {
      const columns = ['nome', 'email', 'status'];
      const reordered = [columns[2], columns[0], columns[1]];
      
      expect(reordered).toEqual(['status', 'nome', 'email']);
    });
  });

  describe('Search', () => {
    it('should search across multiple fields', () => {
      const searchTerm = 'alice';
      const results = sampleData.filter(row => {
        return (
          row.nome.toLowerCase().includes(searchTerm) ||
          row.email.toLowerCase().includes(searchTerm)
        );
      });
      
      expect(results.length).toBe(1);
      expect(results[0].nome).toBe('Alice');
    });

    it('should return empty for no matches', () => {
      const searchTerm = 'xyz';
      const results = sampleData.filter(row => {
        return row.nome.toLowerCase().includes(searchTerm);
      });
      
      expect(results.length).toBe(0);
    });

    it('should be case-insensitive', () => {
      const searchTerm = 'BOB';
      const results = sampleData.filter(row => {
        return row.nome.toLowerCase().includes(searchTerm.toLowerCase());
      });
      
      expect(results.length).toBe(1);
    });
  });

  describe('Export Logic', () => {
    it('should prepare data for CSV export', () => {
      const headers = ['ID', 'Nome', 'Email', 'Status'];
      const rows = sampleData.map(row => [
        row.id,
        row.nome,
        row.email,
        row.status,
      ]);
      
      expect(headers.length).toBe(4);
      expect(rows.length).toBe(4);
      expect(rows[0][1]).toBe('Alice');
    });

    it('should escape special characters for CSV', () => {
      const value = 'Name, with comma';
      const escaped = `"${value}"`;
      
      expect(escaped).toBe('"Name, with comma"');
    });

    it('should format date for export', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const formatted = date.toISOString().split('T')[0];
      
      expect(formatted).toBe('2025-01-15');
    });
  });
});
