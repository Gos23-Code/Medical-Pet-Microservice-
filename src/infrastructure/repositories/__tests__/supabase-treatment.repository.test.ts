import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SupabaseTreatmentRepository } from '../supabase-treatment.repository';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { createClient } from '@/lib/supabase/client';

// Mock del cliente Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

interface MockSupabase {
  from: jest.Mock;
}

describe('SupabaseTreatmentRepository', () => {
  let repository: SupabaseTreatmentRepository;
  let mockSupabase: MockSupabase;
  let mockFrom: jest.Mock;
  let mockInsert: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockUpdateEq: jest.Mock;
  let mockUpdateSelect: jest.Mock;
  let mockUpdateSingle: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSingle = jest.fn();
    mockUpdateSingle = jest.fn();
    
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq, single: mockSingle });
    mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    
    // Mock para update con la cadena completa: update().eq().select().single()
    mockUpdateSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
    mockUpdateEq = jest.fn().mockReturnValue({ select: mockUpdateSelect });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });
    
    mockFrom = jest.fn().mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      eq: mockEq,
    });

    mockSupabase = {
      from: mockFrom,
    };

    mockCreateClient.mockReturnValue(mockSupabase as never);
    repository = new SupabaseTreatmentRepository();
  });

  const validId = '123e4567-e89b-12d3-a456-426614174000';
  const validTreatment = Treatment.create({
    id: validId,
    visitId: 'visit-123',
    description: 'Tratamiento de prueba',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-15'),
    notes: 'Notas del tratamiento',
  });

  describe('save', () => {
    it('debe guardar un tratamiento exitosamente', async () => {
      const mockResponse = {
        id: validId,
        visit_id: 'visit-123',
        description: 'Tratamiento de prueba',
        start_date: '2024-01-01',
        end_date: '2024-01-15',
        notes: 'Notas del tratamiento',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      // @ts-expect-error - Mock para pruebas
      mockSingle.mockResolvedValue({ data: mockResponse, error: null });

      const result = await repository.save(validTreatment);

      expect(result).toBeDefined();
      expect(result.id).toBe(validId);
      expect(mockFrom).toHaveBeenCalledWith('treatments');
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar error si falla el guardado', async () => {
      // @ts-expect-error - Mock para pruebas
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Error al guardar' } });

      await expect(repository.save(validTreatment)).rejects.toThrow('Error al guardar');
    });
  });

  describe('findById', () => {
    it('debe encontrar un tratamiento por ID', async () => {
      const mockResponse = {
        id: validId,
        visit_id: 'visit-123',
        description: 'Tratamiento de prueba',
        start_date: '2024-01-01',
        end_date: '2024-01-15',
        notes: 'Notas del tratamiento',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      // @ts-expect-error - Mock para pruebas
      mockSingle.mockResolvedValue({ data: mockResponse, error: null });

      const result = await repository.findById(validId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(validId);
      expect(mockFrom).toHaveBeenCalledWith('treatments');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', validId);
    });

    it('debe retornar null si el tratamiento no existe', async () => {
      // @ts-expect-error - Mock para pruebas
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await repository.findById(validId);

      expect(result).toBeNull();
    });

    it('debe retornar null si hay error', async () => {
      // @ts-expect-error - Mock para pruebas
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await repository.findById(validId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('debe actualizar un tratamiento exitosamente', async () => {
      const updatedTreatment = Treatment.create({
        id: validId,
        visitId: 'visit-123',
        description: 'Tratamiento actualizado',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-15'),
        notes: 'Notas actualizadas',
      });

      const mockResponse = {
        id: validId,
        visit_id: 'visit-123',
        description: 'Tratamiento actualizado',
        start_date: '2024-02-01',
        end_date: '2024-02-15',
        notes: 'Notas actualizadas',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
      };

      // @ts-expect-error - Mock para pruebas
      mockUpdateSingle.mockResolvedValue({ data: mockResponse, error: null });

      const result = await repository.update(updatedTreatment);

      expect(result).toBeDefined();
      expect(result.description).toBe('Tratamiento actualizado');
      expect(mockFrom).toHaveBeenCalledWith('treatments');
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar error si falla la actualización', async () => {
      // @ts-expect-error - Mock para pruebas
      mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'Error al actualizar' } });

      await expect(repository.update(validTreatment)).rejects.toThrow('Error al actualizar');
    });
  });
});