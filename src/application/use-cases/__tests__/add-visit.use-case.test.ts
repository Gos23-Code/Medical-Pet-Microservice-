import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AddVisitUseCase } from '../add-visit.use-case';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { CreateVisitDTO } from '../../dtos/veterinary-visit.dto';
import { Weight } from '@/src/domain/value-objects/weight.vo';
import { Temperature } from '@/src/domain/value-objects/temperature.vo';

describe('AddVisitUseCase', () => {
  let addVisitUseCase: AddVisitUseCase;
  let mockSave: jest.Mock;
  let mockFindById: jest.Mock;
  let mockFindByPetId: jest.Mock;
  let mockFindByDateRange: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;

  beforeEach(() => {
    mockSave = jest.fn();
    mockFindById = jest.fn();
    mockFindByPetId = jest.fn();
    mockFindByDateRange = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();

    const mockRepository = {
      save: mockSave,
      findById: mockFindById,
      findByPetId: mockFindByPetId,
      findByDateRange: mockFindByDateRange,
      update: mockUpdate,
      delete: mockDelete,
    };

    // @ts-expect-error - Mock para pruebas
    addVisitUseCase = new AddVisitUseCase(mockRepository);
  });

  const validDto: CreateVisitDTO = {
    petId: '123e4567-e89b-12d3-a456-426614174000',
    date: '2024-01-01',
    reason: 'Consulta general',
    veterinarian: 'Dr. Juan Pérez',
    diagnosis: 'Saludable',
    notes: 'Control anual',
    weight: 5.5,
    temperature: 38.5,
  };

  it('debe crear una visita exitosamente', async () => {
    const mockVisit = VeterinaryVisit.create({
      id: 'generated-uuid',
      petId: validDto.petId,
      date: new Date(validDto.date),
      reason: validDto.reason,
      veterinarian: validDto.veterinarian,
      diagnosis: validDto.diagnosis,
      notes: validDto.notes,
      weight: new Weight(validDto.weight!),
      temperature: new Temperature(validDto.temperature!),
    });
    // @ts-expect-error - Mock para pruebas
    mockSave.mockResolvedValue(mockVisit);

    const result = await addVisitUseCase.execute(validDto);

    expect(result).toBeDefined();
    expect(result.petId).toBe(validDto.petId);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('debe lanzar error si falta petId', async () => {
    const invalidDto = { ...validDto, petId: undefined };
    // @ts-expect-error - Testing invalid input
    await expect(addVisitUseCase.execute(invalidDto))
      .rejects
      .toThrow('El ID de la mascota es requerido');
  });

  it('debe lanzar error si falta reason', async () => {
    const invalidDto = { ...validDto, reason: '' };
    await expect(addVisitUseCase.execute(invalidDto as CreateVisitDTO))
      .rejects
      .toThrow('El motivo es requerido');
  });

  it('debe lanzar error si falta veterinarian', async () => {
    const invalidDto = { ...validDto, veterinarian: '' };
    await expect(addVisitUseCase.execute(invalidDto as CreateVisitDTO))
      .rejects
      .toThrow('El veterinario es requerido');
  });

  it('debe lanzar error si el peso es inválido', async () => {
    const invalidDto = { ...validDto, weight: -5 };
    await expect(addVisitUseCase.execute(invalidDto))
      .rejects
      .toThrow('El peso debe estar entre 0 y 200 kg');
  });

  it('debe lanzar error si la temperatura es inválida', async () => {
    const invalidDto = { ...validDto, temperature: 50 };
    await expect(addVisitUseCase.execute(invalidDto))
      .rejects
      .toThrow('La temperatura debe estar entre 35°C y 42°C');
  });
});