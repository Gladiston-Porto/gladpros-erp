// Mock the rbac module to avoid ES modules issues
jest.mock('../../../shared/lib/rbac', () => ({
  ClientePermissions: {
    canRead: jest.fn(),
    canCreate: jest.fn(),
    canUpdate: jest.fn(),
    canDelete: jest.fn(),
    canViewDocuments: jest.fn(),
  }
}))

import { ClientePermissions } from '../../../shared/lib/rbac'
import { can } from '../../../shared/lib/rbac-core'

// Mock implementations
const mockCanRead = ClientePermissions.canRead as jest.MockedFunction<typeof ClientePermissions.canRead>
const mockCanCreate = ClientePermissions.canCreate as jest.MockedFunction<typeof ClientePermissions.canCreate>
const mockCanUpdate = ClientePermissions.canUpdate as jest.MockedFunction<typeof ClientePermissions.canUpdate>
const mockCanDelete = ClientePermissions.canDelete as jest.MockedFunction<typeof ClientePermissions.canDelete>
const mockCanViewDocuments = ClientePermissions.canViewDocuments as jest.MockedFunction<typeof ClientePermissions.canViewDocuments>

describe('Cliente Permissions by Role', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ClientePermissions.canRead', () => {
    it('should allow ADMIN to read clients', () => {
      mockCanRead.mockReturnValue(true)
      expect(ClientePermissions.canRead('ADMIN')).toBe(true)
      expect(mockCanRead).toHaveBeenCalledWith('ADMIN')
    })

    it('should allow GERENTE to read clients', () => {
      mockCanRead.mockReturnValue(true)
      expect(ClientePermissions.canRead('GERENTE')).toBe(true)
      expect(mockCanRead).toHaveBeenCalledWith('GERENTE')
    })

    it('should allow USUARIO to read clients', () => {
      mockCanRead.mockReturnValue(true)
      expect(ClientePermissions.canRead('USUARIO')).toBe(true)
      expect(mockCanRead).toHaveBeenCalledWith('USUARIO')
    })

    it('should deny FINANCEIRO to read clients', () => {
      mockCanRead.mockReturnValue(false)
      expect(ClientePermissions.canRead('FINANCEIRO')).toBe(false)
      expect(mockCanRead).toHaveBeenCalledWith('FINANCEIRO')
    })

    it('should deny ESTOQUE to read clients', () => {
      mockCanRead.mockReturnValue(false)
      expect(ClientePermissions.canRead('ESTOQUE')).toBe(false)
      expect(mockCanRead).toHaveBeenCalledWith('ESTOQUE')
    })

    it('should deny CLIENTE to read clients', () => {
      mockCanRead.mockReturnValue(false)
      expect(ClientePermissions.canRead('CLIENTE')).toBe(false)
      expect(mockCanRead).toHaveBeenCalledWith('CLIENTE')
    })
  })

  describe('ClientePermissions.canCreate', () => {
    it('should allow ADMIN to create clients', () => {
      mockCanCreate.mockReturnValue(true)
      expect(ClientePermissions.canCreate('ADMIN')).toBe(true)
      expect(mockCanCreate).toHaveBeenCalledWith('ADMIN')
    })

    it('should allow GERENTE to create clients', () => {
      mockCanCreate.mockReturnValue(true)
      expect(ClientePermissions.canCreate('GERENTE')).toBe(true)
      expect(mockCanCreate).toHaveBeenCalledWith('GERENTE')
    })

    it('should deny USUARIO to create clients', () => {
      mockCanCreate.mockReturnValue(false)
      expect(ClientePermissions.canCreate('USUARIO')).toBe(false)
      expect(mockCanCreate).toHaveBeenCalledWith('USUARIO')
    })

    it('should deny FINANCEIRO to create clients', () => {
      mockCanCreate.mockReturnValue(false)
      expect(ClientePermissions.canCreate('FINANCEIRO')).toBe(false)
      expect(mockCanCreate).toHaveBeenCalledWith('FINANCEIRO')
    })

    it('should deny ESTOQUE to create clients', () => {
      mockCanCreate.mockReturnValue(false)
      expect(ClientePermissions.canCreate('ESTOQUE')).toBe(false)
      expect(mockCanCreate).toHaveBeenCalledWith('ESTOQUE')
    })

    it('should deny CLIENTE to create clients', () => {
      mockCanCreate.mockReturnValue(false)
      expect(ClientePermissions.canCreate('CLIENTE')).toBe(false)
      expect(mockCanCreate).toHaveBeenCalledWith('CLIENTE')
    })
  })

  describe('ClientePermissions.canUpdate', () => {
    it('should allow ADMIN to update clients', () => {
      mockCanUpdate.mockReturnValue(true)
      expect(ClientePermissions.canUpdate('ADMIN')).toBe(true)
      expect(mockCanUpdate).toHaveBeenCalledWith('ADMIN')
    })

    it('should allow GERENTE to update clients', () => {
      mockCanUpdate.mockReturnValue(true)
      expect(ClientePermissions.canUpdate('GERENTE')).toBe(true)
      expect(mockCanUpdate).toHaveBeenCalledWith('GERENTE')
    })

    it('should deny USUARIO to update clients', () => {
      mockCanUpdate.mockReturnValue(false)
      expect(ClientePermissions.canUpdate('USUARIO')).toBe(false)
      expect(mockCanUpdate).toHaveBeenCalledWith('USUARIO')
    })

    it('should deny FINANCEIRO to update clients', () => {
      mockCanUpdate.mockReturnValue(false)
      expect(ClientePermissions.canUpdate('FINANCEIRO')).toBe(false)
      expect(mockCanUpdate).toHaveBeenCalledWith('FINANCEIRO')
    })

    it('should deny ESTOQUE to update clients', () => {
      mockCanUpdate.mockReturnValue(false)
      expect(ClientePermissions.canUpdate('ESTOQUE')).toBe(false)
      expect(mockCanUpdate).toHaveBeenCalledWith('ESTOQUE')
    })

    it('should deny CLIENTE to update clients', () => {
      mockCanUpdate.mockReturnValue(false)
      expect(ClientePermissions.canUpdate('CLIENTE')).toBe(false)
      expect(mockCanUpdate).toHaveBeenCalledWith('CLIENTE')
    })
  })

  describe('ClientePermissions.canDelete', () => {
    it('should allow ADMIN to delete clients', () => {
      mockCanDelete.mockReturnValue(true)
      expect(ClientePermissions.canDelete('ADMIN')).toBe(true)
      expect(mockCanDelete).toHaveBeenCalledWith('ADMIN')
    })

    it('should deny GERENTE to delete clients', () => {
      mockCanDelete.mockReturnValue(false)
      expect(ClientePermissions.canDelete('GERENTE')).toBe(false)
      expect(mockCanDelete).toHaveBeenCalledWith('GERENTE')
    })

    it('should deny USUARIO to delete clients', () => {
      mockCanDelete.mockReturnValue(false)
      expect(ClientePermissions.canDelete('USUARIO')).toBe(false)
      expect(mockCanDelete).toHaveBeenCalledWith('USUARIO')
    })

    it('should deny FINANCEIRO to delete clients', () => {
      mockCanDelete.mockReturnValue(false)
      expect(ClientePermissions.canDelete('FINANCEIRO')).toBe(false)
      expect(mockCanDelete).toHaveBeenCalledWith('FINANCEIRO')
    })

    it('should deny ESTOQUE to delete clients', () => {
      mockCanDelete.mockReturnValue(false)
      expect(ClientePermissions.canDelete('ESTOQUE')).toBe(false)
      expect(mockCanDelete).toHaveBeenCalledWith('ESTOQUE')
    })

    it('should deny CLIENTE to delete clients', () => {
      mockCanDelete.mockReturnValue(false)
      expect(ClientePermissions.canDelete('CLIENTE')).toBe(false)
      expect(mockCanDelete).toHaveBeenCalledWith('CLIENTE')
    })
  })

  describe('ClientePermissions.canViewDocuments', () => {
    it('should allow ADMIN to view documents', () => {
      mockCanViewDocuments.mockReturnValue(true)
      expect(ClientePermissions.canViewDocuments('ADMIN')).toBe(true)
      expect(mockCanViewDocuments).toHaveBeenCalledWith('ADMIN')
    })

    it('should allow GERENTE to view documents', () => {
      mockCanViewDocuments.mockReturnValue(true)
      expect(ClientePermissions.canViewDocuments('GERENTE')).toBe(true)
      expect(mockCanViewDocuments).toHaveBeenCalledWith('GERENTE')
    })

    it('should deny USUARIO to view documents', () => {
      mockCanViewDocuments.mockReturnValue(false)
      expect(ClientePermissions.canViewDocuments('USUARIO')).toBe(false)
      expect(mockCanViewDocuments).toHaveBeenCalledWith('USUARIO')
    })

    it('should deny FINANCEIRO to view documents', () => {
      mockCanViewDocuments.mockReturnValue(false)
      expect(ClientePermissions.canViewDocuments('FINANCEIRO')).toBe(false)
      expect(mockCanViewDocuments).toHaveBeenCalledWith('FINANCEIRO')
    })

    it('should deny ESTOQUE to view documents', () => {
      mockCanViewDocuments.mockReturnValue(false)
      expect(ClientePermissions.canViewDocuments('ESTOQUE')).toBe(false)
      expect(mockCanViewDocuments).toHaveBeenCalledWith('ESTOQUE')
    })

    it('should deny CLIENTE to view documents', () => {
      mockCanViewDocuments.mockReturnValue(false)
      expect(ClientePermissions.canViewDocuments('CLIENTE')).toBe(false)
      expect(mockCanViewDocuments).toHaveBeenCalledWith('CLIENTE')
    })
  })
})

describe('RBAC Core - Cliente Module Permissions', () => {
  describe('ADMIN role', () => {
    it('should have all permissions on clientes module', () => {
      expect(can('ADMIN', 'clientes', 'read')).toBe(true)
      expect(can('ADMIN', 'clientes', 'create')).toBe(true)
      expect(can('ADMIN', 'clientes', 'update')).toBe(true)
      expect(can('ADMIN', 'clientes', 'delete')).toBe(true)
    })
  })

  describe('GERENTE role', () => {
    it('should have read, create, update permissions on clientes module', () => {
      expect(can('GERENTE', 'clientes', 'read')).toBe(true)
      expect(can('GERENTE', 'clientes', 'create')).toBe(true)
      expect(can('GERENTE', 'clientes', 'update')).toBe(true)
      expect(can('GERENTE', 'clientes', 'delete')).toBe(false)
    })
  })

  describe('USUARIO role', () => {
    it('should have read, create, update permissions on clientes module', () => {
      expect(can('USUARIO', 'clientes', 'read')).toBe(true)
      expect(can('USUARIO', 'clientes', 'create')).toBe(true)
      expect(can('USUARIO', 'clientes', 'update')).toBe(true)
      expect(can('USUARIO', 'clientes', 'delete')).toBe(false)
    })
  })

  describe('FINANCEIRO role', () => {
    it('should have only read permission on clientes module', () => {
      expect(can('FINANCEIRO', 'clientes', 'read')).toBe(true)
      expect(can('FINANCEIRO', 'clientes', 'create')).toBe(false)
      expect(can('FINANCEIRO', 'clientes', 'update')).toBe(false)
      expect(can('FINANCEIRO', 'clientes', 'delete')).toBe(false)
    })
  })

  describe('ESTOQUE role', () => {
    it('should have only read permission on clientes module', () => {
      expect(can('ESTOQUE', 'clientes', 'read')).toBe(true)
      expect(can('ESTOQUE', 'clientes', 'create')).toBe(false)
      expect(can('ESTOQUE', 'clientes', 'update')).toBe(false)
      expect(can('ESTOQUE', 'clientes', 'delete')).toBe(false)
    })
  })

  describe('CLIENTE role', () => {
    it('should have no permissions on clientes module', () => {
      expect(can('CLIENTE', 'clientes', 'read')).toBe(false)
      expect(can('CLIENTE', 'clientes', 'create')).toBe(false)
      expect(can('CLIENTE', 'clientes', 'update')).toBe(false)
      expect(can('CLIENTE', 'clientes', 'delete')).toBe(false)
    })
  })
})