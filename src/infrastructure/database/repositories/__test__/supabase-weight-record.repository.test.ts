// supabase-weight-record.repository.test.ts
import { SupabaseWeightRecordRepository } from '../supabase-weight-record.repository';
import { weightRecord } from '@/src/domain/entities/weight-record.entity';
import { createClient } from '@/src/infrastructure/database/supabase/client';

// Mock del cliente de Supabase
jest.mock('@/src/infrastructure/database/supabase/client');

describe('SupabaseWeightRecordRepository', () => {
  let repository: SupabaseWeightRecordRepository;
  
  // Mocks para cada método
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockOrder: jest.Mock;
  let mockLimit: jest.Mock;
  let mockSingle: jest.Mock;
  let mockMaybeSingle: jest.Mock;
  let mockFrom: jest.Mock;

  const mockPetId = '987fcdeb-51a2-43d7-9b56-2546b7a3c8e9';
  const mockRecordId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWeight = 5.5;
  const mockDate = '2026-07-29';
  const mockNote = 'Peso después del baño';
  const mockCreatedAt = '2026-07-29T10:00:00Z';

  const mockWeightRecordEntity = weightRecord.create({
    id: mockRecordId,
    petId: mockPetId,
    weight: mockWeight,
    date: new Date(mockDate),
    note: mockNote,
  });

  const mockSupabaseResponse = {
    id: mockRecordId,
    PetId: mockPetId,
    Weight: mockWeight,
    Date: mockDate,
    Note: mockNote,
    Created_at: mockCreatedAt,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Crear mocks para cada método - todos devuelven this para encadenamiento
    mockSelect = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockReturnThis();
    mockUpdate = jest.fn().mockReturnThis();
    mockEq = jest.fn().mockReturnThis();
    mockOrder = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();
    mockSingle = jest.fn().mockResolvedValue({ data: mockSupabaseResponse, error: null });
    mockMaybeSingle = jest.fn().mockResolvedValue({ data: mockSupabaseResponse, error: null });

    // Mock de from con todos los métodos encadenables
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    });

    (createClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    repository = new SupabaseWeightRecordRepository();
  });

  describe('save', () => {
    it('should save a weight record successfully', async () => {
      const result = await repository.save(mockWeightRecordEntity);

      expect(createClient).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('WeightRecord');
      expect(mockInsert).toHaveBeenCalledWith({
        PetId: mockPetId,
        Weight: mockWeight,
        Date: mockDate,
        Note: mockNote,
      });
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      
      expect(result).toEqual({
        message: 'WeightRecord creado correctamente',
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
        note: mockNote,
        createdAt: new Date(mockCreatedAt).toISOString(),
      });
    });

    it('should save a record with null optional fields', async () => {
      const minimalRecord = weightRecord.create({
        petId: mockPetId,
        weight: mockWeight,
      });

      const responseWithNulls = { 
        ...mockSupabaseResponse, 
        Date: null, 
        Note: null 
      };
      mockSingle.mockResolvedValueOnce({ data: responseWithNulls, error: null });

      const result = await repository.save(minimalRecord);

      expect(mockInsert).toHaveBeenCalledWith({
        PetId: mockPetId,
        Weight: mockWeight,
        Date: null,
        Note: null,
      });
      
      expect(result.date).toBeUndefined();
      expect(result.note).toBeUndefined();
    });

    it('should throw error when save fails', async () => {
      const errorMessage = 'Database error';
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

      await expect(repository.save(mockWeightRecordEntity)).rejects.toThrow(
        `Error guardando: ${errorMessage}`
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // Configurar el mock para que select devuelva una promesa con order
      mockSelect.mockImplementation(() => {
        return {
          order: mockOrder,
        };
      });
      mockOrder.mockImplementation(() => Promise.resolve({ 
        data: [mockSupabaseResponse], 
        error: null 
      }));
    });

    it('should return all weight records', async () => {
      const result = await repository.findAll();

      expect(createClient).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('WeightRecord');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('Created_at', { ascending: false });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockRecordId,
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
        note: mockNote,
        createdAt: new Date(mockCreatedAt).toISOString(),
      });
    });

    it('should return empty array when no records exist', async () => {
      mockOrder.mockImplementationOnce(() => Promise.resolve({ data: [], error: null }));

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should handle null values in response', async () => {
      const mockDataWithNulls = [{
        ...mockSupabaseResponse,
        Weight: null,
        Date: null,
        Note: null,
      }];
      mockOrder.mockImplementationOnce(() => Promise.resolve({ data: mockDataWithNulls, error: null }));

      const result = await repository.findAll();

      expect(result[0].weight).toBeUndefined();
      expect(result[0].date).toBeUndefined();
      expect(result[0].note).toBeUndefined();
    });

    it('should throw error when findAll fails', async () => {
      const errorMessage = 'Query error';
      mockOrder.mockImplementationOnce(() => Promise.resolve({ data: null, error: { message: errorMessage } }));

      await expect(repository.findAll()).rejects.toThrow(
        `Error obteniendo registros: ${errorMessage}`
      );
    });
  });

  describe('findByPetId', () => {
    beforeEach(() => {
      // Configurar el mock para select con los métodos encadenados
      mockSelect.mockImplementation(() => {
        return {
          eq: mockEq,
        };
      });
      mockEq.mockImplementation(() => {
        return {
          order: mockOrder,
        };
      });
      mockOrder.mockImplementation(() => Promise.resolve({ 
        data: [{ PetId: mockPetId, Weight: mockWeight }], 
        error: null 
      }));
    });

    it('should find weight records by petId', async () => {
      const mockData = [
        { PetId: mockPetId, Weight: mockWeight },
        { PetId: mockPetId, Weight: 6.0 },
      ];
      mockOrder.mockImplementationOnce(() => Promise.resolve({ data: mockData, error: null }));

      const result = await repository.findByPetId(mockPetId);

      expect(createClient).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('WeightRecord');
      expect(mockSelect).toHaveBeenCalledWith('PetId, Weight');
      expect(mockEq).toHaveBeenCalledWith('PetId', mockPetId);
      expect(mockOrder).toHaveBeenCalledWith('Created_at', { ascending: false });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        petId: mockPetId,
        weight: mockWeight,
      });
      expect(result[1]).toEqual({
        petId: mockPetId,
        weight: 6.0,
      });
    });

    it('should throw error when no records found for petId', async () => {
      mockOrder.mockImplementationOnce(() => Promise.resolve({ data: [], error: null }));

      await expect(repository.findByPetId(mockPetId)).rejects.toThrow(
        `No se encontraron registros para petId: ${mockPetId}`
      );
    });

    it('should handle null weight values', async () => {
      const mockData = [{ PetId: mockPetId, Weight: null }];
      mockOrder.mockImplementationOnce(() => Promise.resolve({ data: mockData, error: null }));

      const result = await repository.findByPetId(mockPetId);

      expect(result[0].weight).toBeUndefined();
    });

    it('should throw error when query fails', async () => {
      const errorMessage = 'Database error';
      mockOrder.mockImplementationOnce(() => Promise.resolve({ data: null, error: { message: errorMessage } }));

      await expect(repository.findByPetId(mockPetId)).rejects.toThrow(
        `Error: ${errorMessage}`
      );
    });
  });

  describe('getLatestByPetId', () => {
    beforeEach(() => {
      // Configurar el mock para select con todos los métodos encadenados
      mockSelect.mockImplementation(() => {
        return {
          eq: mockEq,
        };
      });
      mockEq.mockImplementation(() => {
        return {
          order: mockOrder,
        };
      });
      mockOrder.mockImplementation(() => {
        return {
          limit: mockLimit,
        };
      });
      mockLimit.mockImplementation(() => {
        return {
          single: mockSingle,
        };
      });
    });

    it('should return latest weight record by petId', async () => {
      const mockData = {
        PetId: mockPetId,
        Weight: mockWeight,
        Date: mockDate,
      };
      mockSingle.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await repository.getLatestByPetId(mockPetId);

      expect(createClient).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('WeightRecord');
      expect(mockSelect).toHaveBeenCalledWith('PetId, Weight, Date');
      expect(mockEq).toHaveBeenCalledWith('PetId', mockPetId);
      expect(mockOrder).toHaveBeenCalledWith('Created_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(mockSingle).toHaveBeenCalled();
      
      expect(result).toEqual({
        petId: mockPetId,
        weight: mockWeight,
        date: mockDate,
      });
    });

    it('should handle null values in latest record', async () => {
      const mockData = {
        PetId: mockPetId,
        Weight: null,
        Date: null,
      };
      mockSingle.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await repository.getLatestByPetId(mockPetId);

      expect(result.weight).toBeUndefined();
      expect(result.date).toBeUndefined();
    });

    it('should throw error when no latest record found', async () => {
      const errorMessage = 'Not found';
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

      await expect(repository.getLatestByPetId(mockPetId)).rejects.toThrow(
        `Error obteniendo último peso: ${errorMessage}`
      );
    });
  });

  describe('updateWeightByPetId', () => {
    it('should update weight successfully', async () => {
      const newWeight = 6.8;
      const updatedData = { ...mockSupabaseResponse, Weight: newWeight };
      
      // Mock para obtener el registro más reciente
      // Primera llamada: select('id').eq('PetId', petId).order(...).limit(1).single()
      mockSelect.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        order: mockOrder,
      }));
      mockOrder.mockImplementationOnce(() => ({
        limit: mockLimit,
      }));
      mockLimit.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: { id: mockRecordId }, error: null });

      // Segunda llamada: update({ Weight }).eq('id', id).select().single()
      mockUpdate.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        select: mockSelect,
      }));
      mockSelect.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: updatedData, error: null });

      const result = await repository.updateWeightByPetId(mockPetId, newWeight);

      expect(createClient).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('WeightRecord');
      expect(mockUpdate).toHaveBeenCalledWith({ Weight: newWeight });
      expect(mockEq).toHaveBeenCalledWith('id', mockRecordId);
      
      expect(result).toEqual({
        message: 'Peso actualizado',
        id: mockRecordId,
        petId: mockPetId,
        weight: newWeight,
        date: mockDate,
        note: mockNote,
        createdAt: new Date(mockCreatedAt).toISOString(),
      });
    });

    it('should throw error when record to update is not found', async () => {
      // Mock para obtener el registro más reciente - no encontrado
      mockSelect.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        order: mockOrder,
      }));
      mockOrder.mockImplementationOnce(() => ({
        limit: mockLimit,
      }));
      mockLimit.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(repository.updateWeightByPetId(mockPetId, 7.0)).rejects.toThrow(
        `Error al encontrar el registro más reciente: Not found`
      );
    });

    it('should throw error when update fails', async () => {
      const errorMessage = 'Update failed';
      
      // Mock para obtener el registro más reciente - éxito
      mockSelect.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        order: mockOrder,
      }));
      mockOrder.mockImplementationOnce(() => ({
        limit: mockLimit,
      }));
      mockLimit.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: { id: mockRecordId }, error: null });

      // Mock para actualizar - error
      mockUpdate.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        select: mockSelect,
      }));
      mockSelect.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

      await expect(repository.updateWeightByPetId(mockPetId, 7.0)).rejects.toThrow(
        `Error al actualizar peso: ${errorMessage}`
      );
    });

    it('should handle null optional fields in updated record', async () => {
      const updatedData = { 
        ...mockSupabaseResponse, 
        Weight: 7.0,
        Date: null,
        Note: null,
      };
      
      // Mock para obtener el registro más reciente
      mockSelect.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        order: mockOrder,
      }));
      mockOrder.mockImplementationOnce(() => ({
        limit: mockLimit,
      }));
      mockLimit.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: { id: mockRecordId }, error: null });

      // Mock para actualizar
      mockUpdate.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        select: mockSelect,
      }));
      mockSelect.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: updatedData, error: null });

      const result = await repository.updateWeightByPetId(mockPetId, 7.0);

      expect(result.date).toBeUndefined();
      expect(result.note).toBeUndefined();
    });

    it('should update with decimal weight values', async () => {
      const newWeight = 5.75;
      const updatedData = { ...mockSupabaseResponse, Weight: newWeight };
      
      // Mock para obtener el registro más reciente
      mockSelect.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        order: mockOrder,
      }));
      mockOrder.mockImplementationOnce(() => ({
        limit: mockLimit,
      }));
      mockLimit.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: { id: mockRecordId }, error: null });

      // Mock para actualizar
      mockUpdate.mockImplementationOnce(() => ({
        eq: mockEq,
      }));
      mockEq.mockImplementationOnce(() => ({
        select: mockSelect,
      }));
      mockSelect.mockImplementationOnce(() => ({
        single: mockSingle,
      }));
      mockSingle.mockResolvedValueOnce({ data: updatedData, error: null });

      const result = await repository.updateWeightByPetId(mockPetId, newWeight);

      expect(result.weight).toBe(newWeight);
      expect(mockUpdate).toHaveBeenCalledWith({ Weight: newWeight });
    });
  });

  describe('error handling integration', () => {
    it('should handle network errors gracefully', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Network error'));

      await expect(repository.save(mockWeightRecordEntity)).rejects.toThrow('Network error');
    });

    it('should handle Supabase connection errors', async () => {
      (createClient as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(repository.findAll()).rejects.toThrow('Connection failed');
    });
  });

  describe('integration with weightRecord entity', () => {
    it('should work with weightRecord entity creation', async () => {
      const record = weightRecord.create({
        petId: mockPetId,
        weight: mockWeight,
      });

      const responseWithNulls = { 
        ...mockSupabaseResponse,
        Date: null,
        Note: null,
      };
      mockSingle.mockResolvedValueOnce({ data: responseWithNulls, error: null });

      const result = await repository.save(record);

      expect(result.petId).toBe(mockPetId);
      expect(result.weight).toBe(mockWeight);
      expect(result.date).toBeUndefined();
      expect(result.note).toBeUndefined();
    });

    it('should preserve date format when saving', async () => {
      const customDate = new Date('2025-12-25T15:30:00Z');
      const recordWithDate = weightRecord.create({
        petId: mockPetId,
        weight: mockWeight,
        date: customDate,
      });

      await repository.save(recordWithDate);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          Date: '2025-12-25',
        })
      );
    });
  });
});