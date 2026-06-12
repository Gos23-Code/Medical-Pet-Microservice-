// src/__tests__/infrastructure/supabase-pet-surgery.repository.test.ts
import { SupabasePetSurgeryRepository } from '@/infrastructure/repositories/supabase-pet-surgery.repository';
import { PetSurgery } from '@/domain/entities/petSurgery.entity';

// Mock del cliente de supabase
jest.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  },
}));

import { supabase } from '@/infrastructure/supabase/client';

describe('SupabasePetSurgeryRepository', () => {
  let repository: SupabasePetSurgeryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SupabasePetSurgeryRepository();
  });

  describe('save', () => {
    it('debe guardar una cirugía exitosamente', async () => {
      const surgery = PetSurgery.create({
        petId: 'pet-123',
        veterinaryVisitId: 'visit-123',
        title: 'Nueva cirugía',
        description: 'Descripción',
        surgeryDate: new Date('2030-12-15'),
        durationMinutes: 60,
        status: 'SCHEDULED',
      });
      
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });
      
      await expect(repository.save(surgery)).resolves.not.toThrow();
      expect(supabase.from).toHaveBeenCalledWith('pet_surgeries');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('debe lanzar error si falla el insert', async () => {
      const surgery = PetSurgery.create({
        petId: 'pet-123',
        veterinaryVisitId: 'visit-123',
        title: 'Nueva cirugía',
        description: 'Descripción',
        surgeryDate: new Date('2030-12-15'),
        durationMinutes: 60,
        status: 'SCHEDULED',
      });
      
      const mockInsert = jest.fn().mockResolvedValue({ error: new Error('DB Error') });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });
      
      await expect(repository.save(surgery)).rejects.toThrow('Failed to save surgery: DB Error');
    });
  });

  describe('findById', () => {
    const mockData = {
      id: 'surgery-123',
      pet_id: 'pet-123',
      veterinary_visit_id: 'visit-123',
      title: 'Cirugía',
      description: 'Desc',
      surgery_date: '2030-12-15',
      duration_minutes: 60,
      status: 'SCHEDULED',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('debe encontrar una cirugía por ID', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSingle,
      });
      
      const result = await repository.findById('surgery-123');
      
      expect(result).toBeInstanceOf(PetSurgery);
      expect(result?.id).toBe('surgery-123');
      expect(result?.title).toBe('Cirugía');
    });

    it('debe retornar null si no encuentra', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSingle,
      });
      
      const result = await repository.findById('not-found');
      
      expect(result).toBeNull();
    });

    it('debe lanzar error si hay error en la consulta', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: new Error('Connection error') });
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSingle,
      });
      
      await expect(repository.findById('surgery-123')).rejects.toThrow('Failed to find surgery: Connection error');
    });
  });

  describe('findByPetId', () => {
    it('debe retornar lista de cirugías por mascota', async () => {
      const mockData = [
        {
          id: 'surgery-1',
          pet_id: 'pet-123',
          veterinary_visit_id: 'visit-1',
          title: 'Cirugía 1',
          description: 'Desc 1',
          surgery_date: '2030-12-15',
          duration_minutes: 60,
          status: 'SCHEDULED',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'surgery-2',
          pet_id: 'pet-123',
          veterinary_visit_id: 'visit-2',
          title: 'Cirugía 2',
          description: 'Desc 2',
          surgery_date: '2030-12-20',
          duration_minutes: 90,
          status: 'COMPLETED',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];
      
      const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: mockOrder,
      });
      
      const result = await repository.findByPetId('pet-123');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('surgery-1');
      expect(result[1].id).toBe('surgery-2');
    });

    it('debe retornar array vacío si no hay cirugías', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: mockOrder,
      });
      
      const result = await repository.findByPetId('pet-123');
      
      expect(result).toEqual([]);
    });
  });

  describe('findByVisitId', () => {
    it('debe retornar lista de cirugías por visita', async () => {
      const mockData = [
        {
          id: 'surgery-1',
          pet_id: 'pet-123',
          veterinary_visit_id: 'visit-123',
          title: 'Cirugía 1',
          description: 'Desc 1',
          surgery_date: '2030-12-15',
          duration_minutes: 60,
          status: 'SCHEDULED',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      
      const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: mockOrder,
      });
      
      const result = await repository.findByVisitId('visit-123');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('surgery-1');
    });
  });

  describe('update', () => {
    it('debe actualizar una cirugía exitosamente', async () => {
      const surgery = PetSurgery.create({
        petId: 'pet-123',
        veterinaryVisitId: 'visit-123',
        title: 'Cirugía original',
        description: 'Descripción original',
        surgeryDate: new Date('2030-12-15'),
        durationMinutes: 60,
        status: 'SCHEDULED',
      });
      
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });
      
      await expect(repository.update(surgery)).resolves.not.toThrow();
    });

    it('debe lanzar error si falla la actualización', async () => {
      const surgery = PetSurgery.create({
        petId: 'pet-123',
        veterinaryVisitId: 'visit-123',
        title: 'Cirugía original',
        description: 'Descripción original',
        surgeryDate: new Date('2030-12-15'),
        durationMinutes: 60,
        status: 'SCHEDULED',
      });
      
      const mockEq = jest.fn().mockResolvedValue({ error: new Error('Update failed') });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });
      
      await expect(repository.update(surgery)).rejects.toThrow('Failed to update surgery: Update failed');
    });
  });

  describe('delete', () => {
    it('debe eliminar una cirugía exitosamente', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      
      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });
      
      await expect(repository.delete('surgery-123')).resolves.not.toThrow();
    });

    it('debe lanzar error si falla la eliminación', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: new Error('Delete failed') });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      
      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });
      
      await expect(repository.delete('surgery-123')).rejects.toThrow('Failed to delete surgery: Delete failed');
    });
  });
});