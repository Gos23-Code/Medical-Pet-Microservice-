import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SupabaseVisitRepository } from '../supabase-visit.repository';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { createClient } from '@/src/infrastructure/database/supabase/client';

jest.mock('@/src/infrastructure/database/supabase/client', () => ({
  createClient: jest.fn(),
}));

interface MockSupabase {
  from: jest.Mock;
  insert: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
}

describe('SupabaseVisitRepository', () => {
  let repository: SupabaseVisitRepository;
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    repository = new SupabaseVisitRepository();
  });

  const validVisit = VeterinaryVisit.create({
    id: '123e4567-e89b-12d3-a456-426614174000',
    petId: 'pet-123',
    date: new Date('2024-01-01'),
    reason: 'Consulta',
    veterinarian: 'Dr. Juan',
    notes: undefined,
  });

  describe('save', () => {
    it('debe guardar una visita exitosamente', async () => {
      const mockResponse = {
        id: validVisit.id,
        pet_id: validVisit.petId,
        date: validVisit.date.toISOString().split('T')[0],
        reason: validVisit.reason,
        veterinarian: validVisit.veterinarian,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      // @ts-expect-error - Mock para respuesta de Supabase
      mockSupabase.single.mockResolvedValue({ data: mockResponse, error: null });

      const result = await repository.save(validVisit);

      expect(result).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('veterinary_visits');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('debe lanzar error si falla el guardado', async () => {
      // @ts-expect-error - Mock para error
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Error al guardar' } });

      await expect(repository.save(validVisit)).rejects.toThrow('Error al guardar');
    });
  });

  describe('findById', () => {
    it('debe encontrar una visita por ID', async () => {
      const mockResponse = {
        id: validVisit.id,
        pet_id: validVisit.petId,
        date: validVisit.date.toISOString().split('T')[0],
        reason: validVisit.reason,
        veterinarian: validVisit.veterinarian,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      // @ts-expect-error - Mock para respuesta
      mockSupabase.single.mockResolvedValue({ data: mockResponse, error: null });

      const result = await repository.findById(validVisit.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(validVisit.id);
      expect(mockSupabase.from).toHaveBeenCalledWith('veterinary_visits');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', validVisit.id);
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('debe retornar null si no encuentra la visita', async () => {
      // @ts-expect-error - Mock para null
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await repository.findById(validVisit.id);

      expect(result).toBeNull();
    });
  });

  describe('findByPetId', () => {
    it('debe encontrar visitas por petId', async () => {
      const mockResponse = [
        {
          id: validVisit.id,
          pet_id: validVisit.petId,
          date: validVisit.date.toISOString().split('T')[0],
          reason: validVisit.reason,
          veterinarian: validVisit.veterinarian,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      // @ts-expect-error - Mock para respuesta
      mockSupabase.order.mockResolvedValue({ data: mockResponse, error: null });

      const result = await repository.findByPetId(validVisit.petId);

      expect(result).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('veterinary_visits');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('pet_id', validVisit.petId);
    });
  });
});