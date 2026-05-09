import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AddTreatmentUseCase } from '../add-treatment.use-case';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { CreateTreatmentDTO } from '../../dtos/treatment.dto';

// Mock del repositorio simplificado
const mockSave = jest.fn();
const mockFindById = jest.fn();
const mockUpdate = jest.fn();

const mockRepository = {
  save: mockSave,
  findById: mockFindById,
  update: mockUpdate,
};

describe('AddTreatmentUseCase', () => {
  let addTreatmentUseCase: AddTreatmentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error - Mock para pruebas
    addTreatmentUseCase = new AddTreatmentUseCase(mockRepository);
  });

  const validDto: CreateTreatmentDTO = {
    visitId: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Tratamiento para infección respiratoria',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    notes: 'Tomar medicamento cada 12 horas',
  };

  it('debe crear un tratamiento exitosamente con todos los campos', async () => {
    const mockTreatment = Treatment.create({
      id: 'generated-uuid',
      visitId: validDto.visitId,
      description: validDto.description,
      startDate: new Date(validDto.startDate),
      endDate: validDto.endDate ? new Date(validDto.endDate) : null,
      notes: validDto.notes || null,
    });
    
    // @ts-expect-error - Mock para pruebas
    mockSave.mockResolvedValue(mockTreatment);

    const result = await addTreatmentUseCase.execute(validDto);

    expect(result).toBeDefined();
    expect(result.visitId).toBe(validDto.visitId);
    expect(result.description).toBe(validDto.description);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('debe crear un tratamiento sin fecha de fin y sin notas', async () => {
    const minimalDto: CreateTreatmentDTO = {
      visitId: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Tratamiento básico',
      startDate: '2024-01-01',
    };

    const mockTreatment = Treatment.create({
      id: 'generated-uuid',
      visitId: minimalDto.visitId,
      description: minimalDto.description,
      startDate: new Date(minimalDto.startDate),
      endDate: null,
      notes: null,
    });
    
    // @ts-expect-error - Mock para pruebas
    mockSave.mockResolvedValue(mockTreatment);

    const result = await addTreatmentUseCase.execute(minimalDto);

    expect(result.endDate).toBeNull();
    expect(result.notes).toBeNull();
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('debe lanzar error si falta visitId', async () => {
    const invalidDto = {
      description: validDto.description,
      startDate: validDto.startDate,
    };

    await expect(addTreatmentUseCase.execute(invalidDto as CreateTreatmentDTO))
      .rejects
      .toThrow('El ID de la visita es requerido');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('debe lanzar error si description está vacío', async () => {
    const invalidDto: CreateTreatmentDTO = {
      visitId: validDto.visitId,
      description: '',
      startDate: validDto.startDate,
    };

    await expect(addTreatmentUseCase.execute(invalidDto))
      .rejects
      .toThrow('La descripción del tratamiento es requerida');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('debe lanzar error si falta startDate', async () => {
    const invalidDto = {
      visitId: validDto.visitId,
      description: validDto.description,
    };

    await expect(addTreatmentUseCase.execute(invalidDto as CreateTreatmentDTO))
      .rejects
      .toThrow('La fecha de inicio es requerida');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('debe lanzar error si endDate es menor que startDate', async () => {
    const invalidDto: CreateTreatmentDTO = {
      visitId: validDto.visitId,
      description: validDto.description,
      startDate: '2024-01-15',
      endDate: '2024-01-01',
    };

    await expect(addTreatmentUseCase.execute(invalidDto))
      .rejects
      .toThrow('La fecha de fin no puede ser menor a la fecha de inicio');
    expect(mockSave).not.toHaveBeenCalled();
  });
});