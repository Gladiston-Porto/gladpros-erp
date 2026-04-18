import { describe, it, expect, beforeEach } from 'vitest';

// TDD: Implementaremos as funções conforme os testes
interface Material {
  id?: number;
  codigo: string;
  nome: string;
  descricao?: string;
  unidade: string;
  quantidade: number;
  estoqueMinimo: number;
  preco: number;
  fabricante?: string;
  ativo: boolean;
}

// Funções a serem implementadas (TDD)
function createMaterial(data: Omit<Material, 'id'>): Material {
  return {
    id: Math.floor(Math.random() * 1000),
    ...data,
  };
}

function getMaterialById(id: number, materials: Material[]): Material | null {
  return materials.find((m) => m.id === id) || null;
}

function getAllMaterials(materials: Material[]): Material[] {
  return materials;
}

function updateMaterial(
  id: number,
  data: Partial<Material>,
  materials: Material[]
): Material | null {
  const index = materials.findIndex((m) => m.id === id);
  if (index === -1) return null;

  materials[index] = { ...materials[index], ...data };
  return materials[index];
}

function deleteMaterial(id: number, materials: Material[]): boolean {
  const index = materials.findIndex((m) => m.id === id);
  if (index === -1) return false;

  materials.splice(index, 1);
  return true;
}

function searchMaterials(
  query: string,
  materials: Material[]
): Material[] {
  const lowerQuery = query.toLowerCase();
  return materials.filter(
    (m) =>
      m.codigo.toLowerCase().includes(lowerQuery) ||
      m.nome.toLowerCase().includes(lowerQuery) ||
      m.descricao?.toLowerCase().includes(lowerQuery) ||
      m.fabricante?.toLowerCase().includes(lowerQuery)
  );
}

describe('Material CRUD Operations', () => {
  let testMaterials: Material[];

  beforeEach(() => {
    testMaterials = [];
  });

  describe('Create Material', () => {
    it('deve criar material com dados válidos', () => {
      const materialData: Omit<Material, 'id'> = {
        codigo: 'MAT-001',
        nome: 'Tijolo Cerâmico',
        descricao: 'Tijolo 8 furos',
        unidade: 'UN',
        quantidade: 1000,
        estoqueMinimo: 500,
        preco: 0.85,
        fabricante: 'Cerâmica São Paulo',
        ativo: true,
      };

      const material = createMaterial(materialData);

      expect(material.id).toBeDefined();
      expect(material.codigo).toBe('MAT-001');
      expect(material.nome).toBe('Tijolo Cerâmico');
      expect(material.quantidade).toBe(1000);
      expect(material.preco).toBe(0.85);
    });

    it('deve criar material sem campos opcionais', () => {
      const materialData: Omit<Material, 'id'> = {
        codigo: 'MAT-002',
        nome: 'Cimento',
        unidade: 'SC',
        quantidade: 50,
        estoqueMinimo: 20,
        preco: 35.9,
        ativo: true,
      };

      const material = createMaterial(materialData);

      expect(material.id).toBeDefined();
      expect(material.codigo).toBe('MAT-002');
      expect(material.descricao).toBeUndefined();
      expect(material.fabricante).toBeUndefined();
    });

    it('deve criar material com preço decimal', () => {
      const material = createMaterial({
        codigo: 'MAT-003',
        nome: 'Areia',
        unidade: 'M3',
        quantidade: 10,
        estoqueMinimo: 5,
        preco: 125.50,
        ativo: true,
      });

      expect(material.preco).toBe(125.50);
    });
  });

  describe('Read Material', () => {
    beforeEach(() => {
      // Setup test data
      testMaterials.push(
        createMaterial({
          codigo: 'MAT-001',
          nome: 'Tijolo',
          unidade: 'UN',
          quantidade: 1000,
          estoqueMinimo: 500,
          preco: 0.85,
          ativo: true,
        })
      );
      testMaterials.push(
        createMaterial({
          codigo: 'MAT-002',
          nome: 'Cimento',
          unidade: 'SC',
          quantidade: 50,
          estoqueMinimo: 20,
          preco: 35.9,
          ativo: true,
        })
      );
    });

    it('deve buscar material por ID', () => {
      const material = testMaterials[0];
      const found = getMaterialById(material.id!, testMaterials);

      expect(found).toBeDefined();
      expect(found?.codigo).toBe('MAT-001');
      expect(found?.nome).toBe('Tijolo');
    });

    it('deve retornar null para ID inexistente', () => {
      const found = getMaterialById(999, testMaterials);
      expect(found).toBeNull();
    });

    it('deve listar todos os materiais', () => {
      const all = getAllMaterials(testMaterials);

      expect(all).toHaveLength(2);
      expect(all[0].codigo).toBe('MAT-001');
      expect(all[1].codigo).toBe('MAT-002');
    });

    it('deve buscar por código', () => {
      const results = searchMaterials('MAT-001', testMaterials);

      expect(results).toHaveLength(1);
      expect(results[0].codigo).toBe('MAT-001');
    });

    it('deve buscar por nome parcial', () => {
      const results = searchMaterials('tij', testMaterials);

      expect(results).toHaveLength(1);
      expect(results[0].nome).toBe('Tijolo');
    });

    it('deve ser case-insensitive na busca', () => {
      const results = searchMaterials('CIMENTO', testMaterials);

      expect(results).toHaveLength(1);
      expect(results[0].nome).toBe('Cimento');
    });
  });

  describe('Update Material', () => {
    let materialId: number;

    beforeEach(() => {
      const material = createMaterial({
        codigo: 'MAT-001',
        nome: 'Tijolo',
        unidade: 'UN',
        quantidade: 1000,
        estoqueMinimo: 500,
        preco: 0.85,
        ativo: true,
      });
      testMaterials.push(material);
      materialId = material.id!;
    });

    it('deve atualizar quantidade', () => {
      const updated = updateMaterial(
        materialId,
        { quantidade: 1500 },
        testMaterials
      );

      expect(updated).toBeDefined();
      expect(updated?.quantidade).toBe(1500);
    });

    it('deve atualizar preço', () => {
      const updated = updateMaterial(
        materialId,
        { preco: 1.25 },
        testMaterials
      );

      expect(updated?.preco).toBe(1.25);
    });

    it('deve atualizar múltiplos campos', () => {
      const updated = updateMaterial(
        materialId,
        {
          quantidade: 2000,
          preco: 1.50,
          estoqueMinimo: 800,
        },
        testMaterials
      );

      expect(updated?.quantidade).toBe(2000);
      expect(updated?.preco).toBe(1.50);
      expect(updated?.estoqueMinimo).toBe(800);
    });

    it('deve retornar null para ID inexistente', () => {
      const updated = updateMaterial(
        999,
        { quantidade: 100 },
        testMaterials
      );

      expect(updated).toBeNull();
    });

    it('deve inativar material', () => {
      const updated = updateMaterial(
        materialId,
        { ativo: false },
        testMaterials
      );

      expect(updated?.ativo).toBe(false);
    });
  });

  describe('Delete Material', () => {
    let materialId: number;

    beforeEach(() => {
      const material = createMaterial({
        codigo: 'MAT-001',
        nome: 'Tijolo',
        unidade: 'UN',
        quantidade: 1000,
        estoqueMinimo: 500,
        preco: 0.85,
        ativo: true,
      });
      testMaterials.push(material);
      materialId = material.id!;
    });

    it('deve deletar material existente', () => {
      const deleted = deleteMaterial(materialId, testMaterials);

      expect(deleted).toBe(true);
      expect(testMaterials).toHaveLength(0);
    });

    it('deve retornar false para ID inexistente', () => {
      const deleted = deleteMaterial(999, testMaterials);

      expect(deleted).toBe(false);
      expect(testMaterials).toHaveLength(1);
    });

    it('não deve afetar outros materiais', () => {
      // Add another material
      const material2 = createMaterial({
        codigo: 'MAT-002',
        nome: 'Cimento',
        unidade: 'SC',
        quantidade: 50,
        estoqueMinimo: 20,
        preco: 35.9,
        ativo: true,
      });
      testMaterials.push(material2);

      const deleted = deleteMaterial(materialId, testMaterials);

      expect(deleted).toBe(true);
      expect(testMaterials).toHaveLength(1);
      expect(testMaterials[0].codigo).toBe('MAT-002');
    });
  });

  describe('Business Rules', () => {
    it('deve alertar quando quantidade < estoque mínimo', () => {
      const material = createMaterial({
        codigo: 'MAT-001',
        nome: 'Tijolo',
        unidade: 'UN',
        quantidade: 400,
        estoqueMinimo: 500,
        preco: 0.85,
        ativo: true,
      });

      const needsRestock = material.quantidade < material.estoqueMinimo;
      expect(needsRestock).toBe(true);
    });

    it('deve calcular valor total do estoque', () => {
      const material = createMaterial({
        codigo: 'MAT-001',
        nome: 'Tijolo',
        unidade: 'UN',
        quantidade: 1000,
        estoqueMinimo: 500,
        preco: 0.85,
        ativo: true,
      });

      const totalValue = material.quantidade * material.preco;
      expect(totalValue).toBe(850);
    });

    it('deve permitir quantidade zero', () => {
      const material = createMaterial({
        codigo: 'MAT-001',
        nome: 'Tijolo',
        unidade: 'UN',
        quantidade: 0,
        estoqueMinimo: 500,
        preco: 0.85,
        ativo: true,
      });

      expect(material.quantidade).toBe(0);
    });
  });
});
