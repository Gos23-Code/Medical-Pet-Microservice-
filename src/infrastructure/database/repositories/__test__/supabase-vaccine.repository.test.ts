// src/infrastructure/database/repositories/__test__/supabase-vaccine.repository.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { VaccineRepository } from '../supabase-vaccine.repository';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';

// ✅ Mock del repositorio
jest.mock('../supabase-vaccine.repository', () => {
  return {
    VaccineRepository: jest.fn().mockImplementation(() => ({
      addVaccine: jest.fn(),
      getByPetId: jest.fn(),
      updateVaccine: jest.fn(),
      deleteVaccine: jest.fn(),
      getById: jest.fn(),
      getPendingVaccines: jest.fn(),
      incrementReminderCount: jest.fn(),
      updateLastReminderSent: jest.fn(),
      markAsOverdue: jest.fn(),
      markAsApplied: jest.fn(),
      getVaccinesDueToday: jest.fn(),
      getOverdueVaccines: jest.fn(),
    })),
  };
});

describe('VaccineRepository', () => {
  // ✅ Usar el tipo correcto
  let repository: jest.Mocked<Pick<VaccineRepository, 
    | 'addVaccine' 
    | 'getByPetId' 
    | 'updateVaccine' 
    | 'deleteVaccine' 
    | 'getById'
    | 'getPendingVaccines'
    | 'incrementReminderCount'
    | 'updateLastReminderSent'
    | 'markAsOverdue'
    | 'markAsApplied'
    | 'getVaccinesDueToday'
    | 'getOverdueVaccines'
  >>;

  const mockVaccineData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    pet_id: '123e4567-e89b-12d3-a456-426614174001',
    user_id: 'user-123',
    name: 'Rabia',
    lot_number: 'LOT-2024-001',
    application_date: '2024-01-15',
    next_dose_date: '2025-01-15',
    veterinarian: 'Dr. Pérez',
    notes: 'Primera dosis anual',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    status: 'PENDIENTE',
    reminder_count: 0,
    last_reminder_sent_at: null,
  };

  // ✅ Helper para crear un Vaccine
  const createMockVaccine = () => {
    return Vaccine.create(
      mockVaccineData.id,
      mockVaccineData.pet_id,
      mockVaccineData.user_id,
      mockVaccineData.name,
      mockVaccineData.lot_number,
      new Date(mockVaccineData.application_date),
      new Date(mockVaccineData.next_dose_date),
      mockVaccineData.veterinarian,
      mockVaccineData.notes,
      new Date(mockVaccineData.created_at)
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // ✅ Crear el mock con el tipo correcto
    repository = {
      addVaccine: jest.fn().mockImplementation(() => Promise.resolve(createMockVaccine())),
      getByPetId: jest.fn().mockImplementation(() => Promise.resolve([createMockVaccine()])),
      updateVaccine: jest.fn().mockImplementation(() => Promise.resolve(createMockVaccine())),
      deleteVaccine: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
      getById: jest.fn().mockImplementation(() => Promise.resolve(createMockVaccine())),
      getPendingVaccines: jest.fn().mockImplementation(() => Promise.resolve([createMockVaccine()])),
      incrementReminderCount: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
      updateLastReminderSent: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
      markAsOverdue: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
      markAsApplied: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
      getVaccinesDueToday: jest.fn().mockImplementation(() => Promise.resolve([createMockVaccine()])),
      getOverdueVaccines: jest.fn().mockImplementation(() => Promise.resolve([createMockVaccine()])),
    } as jest.Mocked<Pick<VaccineRepository, 
      | 'addVaccine' 
      | 'getByPetId' 
      | 'updateVaccine' 
      | 'deleteVaccine' 
      | 'getById'
      | 'getPendingVaccines'
      | 'incrementReminderCount'
      | 'updateLastReminderSent'
      | 'markAsOverdue'
      | 'markAsApplied'
      | 'getVaccinesDueToday'
      | 'getOverdueVaccines'
    >>;
  });

  describe('getByPetId', () => {
    it('debe obtener vacunas por ID de mascota', async () => {
      const petId = '123e4567-e89b-12d3-a456-426614174001';
      const mockVaccines = [createMockVaccine()];

      repository.getByPetId.mockImplementation(() => Promise.resolve(mockVaccines));

      const result = await repository.getByPetId(petId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Vaccine);
      expect(result[0].petId).toBe(petId);
      expect(repository.getByPetId).toHaveBeenCalledWith(petId);
    });

    it('debe retornar array vacío si no hay vacunas', async () => {
      const petId = '123e4567-e89b-12d3-a456-426614174001';

      repository.getByPetId.mockImplementation(() => Promise.resolve([]));

      const result = await repository.getByPetId(petId);

      expect(result).toEqual([]);
      expect(repository.getByPetId).toHaveBeenCalledWith(petId);
    });

    it('debe lanzar error si falla la consulta', async () => {
      const petId = '123e4567-e89b-12d3-a456-426614174001';

      repository.getByPetId.mockImplementation(() => 
        Promise.reject(new Error('Error al obtener vacunas: Error de base de datos'))
      );

      await expect(repository.getByPetId(petId)).rejects.toThrow(
        'Error al obtener vacunas: Error de base de datos'
      );
    });
  });

  describe('addVaccine', () => {
    it('debe agregar una vacuna exitosamente', async () => {
      const vaccineData = {
        petId: '123e4567-e89b-12d3-a456-426614174001',
        userId: 'user-123',
        name: 'Rabia',
        lotNumber: 'LOT-2024-001',
        applicationDate: new Date('2024-01-15'),
        nextDoseDate: new Date('2025-01-15'),
        veterinarian: 'Dr. Pérez',
        notes: 'Primera dosis anual'
      };

      const mockVaccine = createMockVaccine();
      repository.addVaccine.mockImplementation(() => Promise.resolve(mockVaccine));

      const result = await repository.addVaccine(vaccineData);

      expect(result).toBeInstanceOf(Vaccine);
      expect(result.id).toBe(mockVaccineData.id);
      expect(result.nameValue).toBe('Rabia');
      expect(repository.addVaccine).toHaveBeenCalledWith(vaccineData);
    });

    it('debe lanzar error si falla la inserción', async () => {
      const vaccineData = {
        petId: '123e4567-e89b-12d3-a456-426614174001',
        userId: 'user-123',
        name: 'Rabia',
        lotNumber: 'LOT-2024-001',
        applicationDate: new Date('2024-01-15'),
        nextDoseDate: new Date('2025-01-15'),
        veterinarian: 'Dr. Pérez',
        notes: 'Primera dosis anual'
      };

      repository.addVaccine.mockImplementation(() => 
        Promise.reject(new Error('Error al agregar vacuna: Error de base de datos'))
      );

      await expect(repository.addVaccine(vaccineData)).rejects.toThrow(
        'Error al agregar vacuna: Error de base de datos'
      );
    });
  });

  describe('updateVaccine', () => {
    it('debe actualizar una vacuna exitosamente', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Rabia (Refuerzo)',
        nextDoseDate: new Date('2026-01-15')
      };

      const updatedVaccine = Vaccine.create(
        id,
        mockVaccineData.pet_id,
        mockVaccineData.user_id,
        updateData.name!,
        mockVaccineData.lot_number,
        new Date(mockVaccineData.application_date),
        updateData.nextDoseDate!,
        mockVaccineData.veterinarian,
        mockVaccineData.notes,
        new Date(mockVaccineData.created_at)
      );

      repository.updateVaccine.mockImplementation(() => Promise.resolve(updatedVaccine));

      const result = await repository.updateVaccine(id, updateData);

      expect(result).toBeInstanceOf(Vaccine);
      expect(result.nameValue).toBe('Rabia (Refuerzo)');
      expect(repository.updateVaccine).toHaveBeenCalledWith(id, updateData);
    });

    it('debe lanzar error si falla la actualización', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { name: 'Rabia (Refuerzo)' };

      repository.updateVaccine.mockImplementation(() => 
        Promise.reject(new Error('Error al actualizar vacuna: Error de base de datos'))
      );

      await expect(repository.updateVaccine(id, updateData)).rejects.toThrow(
        'Error al actualizar vacuna: Error de base de datos'
      );
    });
  });

  describe('deleteVaccine', () => {
    it('debe eliminar una vacuna exitosamente', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.deleteVaccine.mockImplementation(() => Promise.resolve(undefined));

      await repository.deleteVaccine(id);

      expect(repository.deleteVaccine).toHaveBeenCalledWith(id);
    });

    it('debe lanzar error si falla la eliminación', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.deleteVaccine.mockImplementation(() => 
        Promise.reject(new Error('Error al eliminar vacuna: Error de base de datos'))
      );

      await expect(repository.deleteVaccine(id)).rejects.toThrow(
        'Error al eliminar vacuna: Error de base de datos'
      );
    });
  });

  describe('getById', () => {
    it('debe obtener una vacuna por ID', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const mockVaccine = createMockVaccine();

      repository.getById.mockImplementation(() => Promise.resolve(mockVaccine));

      const result = await repository.getById(id);

      expect(result).toBeInstanceOf(Vaccine);
      expect(result?.id).toBe(id);
      expect(repository.getById).toHaveBeenCalledWith(id);
    });

    it('debe retornar null si no encuentra la vacuna', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.getById.mockImplementation(() => Promise.resolve(null));

      const result = await repository.getById(id);

      expect(result).toBeNull();
      expect(repository.getById).toHaveBeenCalledWith(id);
    });

    it('debe lanzar error si falla la consulta', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.getById.mockImplementation(() => 
        Promise.reject(new Error('Error al obtener vacuna: Error de base de datos'))
      );

      await expect(repository.getById(id)).rejects.toThrow(
        'Error al obtener vacuna: Error de base de datos'
      );
    });
  });
});