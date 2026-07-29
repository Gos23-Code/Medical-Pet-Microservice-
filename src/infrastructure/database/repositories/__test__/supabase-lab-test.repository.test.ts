// __tests__/infrastructure/repositories/supabase-lab-test.repository.test.ts
import { SupabaseLabTestRepository } from '@/src/infrastructure/database/repositories/supabase-lab-test.repository';
import { LabTest } from '@/src/domain/entities/lab-test.entity';

// Mock del cliente Supabase
jest.mock('@/src/infrastructure/database/supabase/client', () => ({
  createClient: jest.fn()
}));

import { createClient } from '@/src/infrastructure/database/supabase/client';

// Definir tipos para el mock de Supabase
interface MockSupabaseQuery {
  from: jest.Mock;
  insert: jest.Mock;
  select: jest.Mock;
  update: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  [key: string]: jest.Mock;
}

describe('SupabaseLabTestRepository', () => {
  let repository: SupabaseLabTestRepository;
  let mockSupabase: MockSupabaseQuery;

  // Crear fecha consistente para las pruebas
  const mockDate = new Date('2026-07-29T10:00:00.000Z');
  const mockDateISO = mockDate.toISOString(); // '2026-07-29T10:00:00.000Z'

  const mockLabTestData = {
    id: 'test-123',
    visit_id: 'vis-456',
    name: 'Glucosa',
    result: '95',
    normal_range: '70-100',
    date: '2026-07-29',
    notes: 'Test en ayunas',
    created_at: mockDateISO // Usar el formato correcto
  };

  const mockLabTest = LabTest.reconstitute({
    id: mockLabTestData.id,
    visit_id: mockLabTestData.visit_id,
    name: mockLabTestData.name,
    result: mockLabTestData.result,
    normal_range: mockLabTestData.normal_range,
    date: new Date(mockLabTestData.date),
    notes: mockLabTestData.notes,
    created_at: new Date(mockLabTestData.created_at)
  });

  beforeEach(() => {
    const fromMock = jest.fn().mockReturnThis();
    const insertMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const updateMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockReturnThis();

    mockSupabase = {
      from: fromMock,
      insert: insertMock,
      select: selectMock,
      update: updateMock,
      eq: eqMock,
      order: orderMock,
      limit: limitMock,
      single: singleMock
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    repository = new SupabaseLabTestRepository();
  });

  describe('save', () => {
    it('should save a lab test successfully', async () => {
      const expectedResponse = {
        message: 'LabTest creado',
        id: mockLabTestData.id,
        visit_id: mockLabTestData.visit_id,
        name: mockLabTestData.name,
        result: mockLabTestData.result,
        normal_range: mockLabTestData.normal_range,
        date: mockLabTestData.date,
        notes: mockLabTestData.notes,
        created_at: mockLabTestData.created_at // Usar el mismo formato
      };

      mockSupabase.single.mockResolvedValue({
        data: mockLabTestData,
        error: null
      });

      const result = await repository.save(mockLabTest);

      expect(result).toEqual(expectedResponse);
      expect(mockSupabase.from).toHaveBeenCalledWith('lab_tests');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        visit_id: mockLabTest.visit_id,
        name: mockLabTest.name,
        result: mockLabTest.result ?? null,
        normal_range: mockLabTest.normal_range ?? null,
        date: expect.any(String),
        notes: mockLabTest.notes ?? null
      });
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should throw error when save fails', async () => {
      const errorMessage = 'Database error';
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });

      await expect(repository.save(mockLabTest)).rejects.toThrow(
        `Error guardando lab test: ${errorMessage}`
      );
    });

    it('should handle null values correctly', async () => {
      const labTestWithNulls = LabTest.reconstitute({
        id: 'test-123',
        visit_id: 'vis-456',
        name: 'Glucosa',
        created_at: new Date()
      });

      mockSupabase.single.mockResolvedValue({
        data: { ...mockLabTestData, result: null, normal_range: null, notes: null },
        error: null
      });

      await repository.save(labTestWithNulls);
      
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        visit_id: labTestWithNulls.visit_id,
        name: labTestWithNulls.name,
        result: null,
        normal_range: null,
        date: null,
        notes: null
      });
    });
  });

  describe('findByVisistId', () => {
    it('should find lab tests by visit_id', async () => {
      const mockData = [mockLabTestData];
      
      mockSupabase.order.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await repository.findByVisistId('vis-456');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockLabTestData.id,
        visit_id: mockLabTestData.visit_id,
        name: mockLabTestData.name,
        result: mockLabTestData.result,
        normal_range: mockLabTestData.normal_range,
        date: mockLabTestData.date,
        notes: mockLabTestData.notes,
        created_at: mockLabTestData.created_at // Usar el mismo formato
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('lab_tests');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('visit_id', 'vis-456');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should throw error when no results found', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null
      });

      await expect(repository.findByVisistId('vis-456')).rejects.toThrow(
        'No se encontró lab test con visit_id: vis-456'
      );
    });

    it('should throw error on database error', async () => {
      const errorMessage = 'Database error';
      
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });

      await expect(repository.findByVisistId('vis-456')).rejects.toThrow(
        `Error en lab tests: ${errorMessage}`
      );
    });

    it('should handle undefined optional fields', async () => {
      const dataWithNulls = {
        ...mockLabTestData,
        result: null,
        normal_range: null,
        notes: null
      };
      
      mockSupabase.order.mockResolvedValue({
        data: [dataWithNulls],
        error: null
      });

      const result = await repository.findByVisistId('vis-456');
      expect(result[0].result).toBeUndefined();
      expect(result[0].normal_range).toBeUndefined();
      expect(result[0].notes).toBeUndefined();
    });
  });

  describe('updateResultByVisitId', () => {
    it('should update result successfully', async () => {
      const newResult = '98';
      const expectedResponse = {
        message: 'Resultado actualizado',
        id: mockLabTestData.id,
        visit_id: mockLabTestData.visit_id,
        name: mockLabTestData.name,
        result: newResult,
        normal_range: mockLabTestData.normal_range,
        date: mockLabTestData.date,
        notes: mockLabTestData.notes,
        created_at: mockLabTestData.created_at // Usar el mismo formato
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...mockLabTestData, result: newResult },
        error: null
      });

      const result = await repository.updateResultByVisitId('vis-456', newResult);

      expect(result).toEqual(expectedResponse);
      expect(mockSupabase.from).toHaveBeenCalledWith('lab_tests');
      expect(mockSupabase.update).toHaveBeenCalledWith({ result: newResult });
      expect(mockSupabase.eq).toHaveBeenCalledWith('visit_id', 'vis-456');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should throw error when lab test not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      });

      await expect(repository.updateResultByVisitId('vis-456', '98')).rejects.toThrow(
        'No se encontró lab test con visit_id: vis-456'
      );
    });

    it('should throw error on database error', async () => {
      const errorMessage = 'Update error';
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });

      await expect(repository.updateResultByVisitId('vis-456', '98')).rejects.toThrow(
        `Error al actualizar resultado:: ${errorMessage}`
      );
    });
  });
});