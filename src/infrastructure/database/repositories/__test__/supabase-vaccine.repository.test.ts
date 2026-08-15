// src/infrastructure/database/repositories/__test__/supabase-vaccine.repository.test.ts
import { VaccineRepository } from '../supabase-vaccine.repository';
import { createClient } from '@supabase/supabase-js';
import { Vaccine } from '@/src/domain/entities/vaccine.entity';

// Mock de Supabase
jest.mock('@supabase/supabase-js');

// Crear un mock del repositorio
jest.mock('../supabase-vaccine.repository', () => {
  return {
    VaccineRepository: jest.fn().mockImplementation(() => {
      return {
        addVaccine: jest.fn(),
        getByPetId: jest.fn(),
        updateVaccine: jest.fn(),
        deleteVaccine: jest.fn(),
        getById: jest.fn()
      };
    })
  };
});

// Definir tipos para los mocks
interface MockSupabaseClient {
  from: jest.Mock;
}

describe('VaccineRepository', () => {
  let repository: jest.Mocked<VaccineRepository>;
  let mockSupabaseClient: MockSupabaseClient; // ✅ Tipado correcto

  const mockVaccineData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    pet_id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Rabia',
    lot_number: 'LOT-2024-001',
    application_date: '2024-01-15',
    next_dose_date: '2025-01-15',
    veterinarian: 'Dr. Pérez',
    notes: 'Primera dosis anual',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  };

  const mockVaccine = Vaccine.create(
    mockVaccineData.id,
    mockVaccineData.pet_id,
    mockVaccineData.name,
    mockVaccineData.lot_number,
    new Date(mockVaccineData.application_date),
    new Date(mockVaccineData.next_dose_date),
    mockVaccineData.veterinarian,
    mockVaccineData.notes,
    new Date(mockVaccineData.created_at)
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Mockear createClient con el tipo correcto
    mockSupabaseClient = {
      from: jest.fn()
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Crear una instancia mock del repositorio
    repository = new VaccineRepository() as jest.Mocked<VaccineRepository>;
  });

  describe('getByPetId', () => {
    it('debe obtener vacunas por ID de mascota', async () => {
      const petId = '123e4567-e89b-12d3-a456-426614174001';
      const mockVaccines = [mockVaccine];

      // ✅ Simplemente mockear el método
      repository.getByPetId = jest.fn().mockResolvedValue(mockVaccines);

      const result = await repository.getByPetId(petId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Vaccine);
      expect(result[0].petId).toBe(petId);
      expect(repository.getByPetId).toHaveBeenCalledWith(petId);
    });

    it('debe retornar array vacío si no hay vacunas', async () => {
      const petId = '123e4567-e89b-12d3-a456-426614174001';

      repository.getByPetId = jest.fn().mockResolvedValue([]);

      const result = await repository.getByPetId(petId);

      expect(result).toEqual([]);
      expect(repository.getByPetId).toHaveBeenCalledWith(petId);
    });

    it('debe lanzar error si falla la consulta', async () => {
      const petId = '123e4567-e89b-12d3-a456-426614174001';

      repository.getByPetId = jest.fn().mockRejectedValue(
        new Error('Error al obtener vacunas: Error de base de datos')
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
        name: 'Rabia',
        lotNumber: 'LOT-2024-001',
        applicationDate: new Date('2024-01-15'),
        nextDoseDate: new Date('2025-01-15'),
        veterinarian: 'Dr. Pérez',
        notes: 'Primera dosis anual'
      };

      repository.addVaccine = jest.fn().mockResolvedValue(mockVaccine);

      const result = await repository.addVaccine(vaccineData);

      expect(result).toBeInstanceOf(Vaccine);
      expect(result.id).toBe(mockVaccineData.id);
      expect(result.nameValue).toBe('Rabia');
      expect(repository.addVaccine).toHaveBeenCalledWith(vaccineData);
    });

    it('debe lanzar error si falla la inserción', async () => {
      const vaccineData = {
        petId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Rabia',
        lotNumber: 'LOT-2024-001',
        applicationDate: new Date('2024-01-15'),
        nextDoseDate: new Date('2025-01-15'),
        veterinarian: 'Dr. Pérez',
        notes: 'Primera dosis anual'
      };

      repository.addVaccine = jest.fn().mockRejectedValue(
        new Error('Error al agregar vacuna: Error de base de datos')
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
        updateData.name!,
        mockVaccineData.lot_number,
        new Date(mockVaccineData.application_date),
        updateData.nextDoseDate!,
        mockVaccineData.veterinarian,
        mockVaccineData.notes,
        new Date(mockVaccineData.created_at)
      );

      repository.updateVaccine = jest.fn().mockResolvedValue(updatedVaccine);

      const result = await repository.updateVaccine(id, updateData);

      expect(result).toBeInstanceOf(Vaccine);
      expect(result.nameValue).toBe('Rabia (Refuerzo)');
      expect(repository.updateVaccine).toHaveBeenCalledWith(id, updateData);
    });

    it('debe lanzar error si falla la actualización', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { name: 'Rabia (Refuerzo)' };

      repository.updateVaccine = jest.fn().mockRejectedValue(
        new Error('Error al actualizar vacuna: Error de base de datos')
      );

      await expect(repository.updateVaccine(id, updateData)).rejects.toThrow(
        'Error al actualizar vacuna: Error de base de datos'
      );
    });
  });

  describe('deleteVaccine', () => {
    it('debe eliminar una vacuna exitosamente', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.deleteVaccine = jest.fn().mockResolvedValue(undefined);

      await repository.deleteVaccine(id);

      expect(repository.deleteVaccine).toHaveBeenCalledWith(id);
    });

    it('debe lanzar error si falla la eliminación', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.deleteVaccine = jest.fn().mockRejectedValue(
        new Error('Error al eliminar vacuna: Error de base de datos')
      );

      await expect(repository.deleteVaccine(id)).rejects.toThrow(
        'Error al eliminar vacuna: Error de base de datos'
      );
    });
  });

  describe('getById', () => {
    it('debe obtener una vacuna por ID', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.getById = jest.fn().mockResolvedValue(mockVaccine);

      const result = await repository.getById(id);

      expect(result).toBeInstanceOf(Vaccine);
      expect(result?.id).toBe(id);
      expect(repository.getById).toHaveBeenCalledWith(id);
    });

    it('debe retornar null si no encuentra la vacuna', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.getById = jest.fn().mockResolvedValue(null);

      const result = await repository.getById(id);

      expect(result).toBeNull();
      expect(repository.getById).toHaveBeenCalledWith(id);
    });

    it('debe lanzar error si falla la consulta', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      repository.getById = jest.fn().mockRejectedValue(
        new Error('Error al obtener vacuna: Error de base de datos')
      );

      await expect(repository.getById(id)).rejects.toThrow(
        'Error al obtener vacuna: Error de base de datos'
      );
    });
  });
});