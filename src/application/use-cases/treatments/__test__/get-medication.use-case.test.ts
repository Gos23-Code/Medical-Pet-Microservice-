import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GetMedicationsUseCase } from '../get-medication.use-case';

describe('GetMedicationsUseCase', () => {
  let getMedicationsUseCase: GetMedicationsUseCase;
  let originalFetch: typeof fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    getMedicationsUseCase = new GetMedicationsUseCase();
    originalFetch = global.fetch;
    mockFetch = jest.fn();
    // @ts-expect-error - Mock para fetch
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const validTreatmentId = '123e4567-e89b-12d3-a456-426614174000';

  it('debe retornar medicamentos cuando el servicio responde exitosamente', async () => {
    const mockMedications = {
      success: true,
      data: [
        {
          id: 'med-1',
          treatmentId: validTreatmentId,
          name: 'Amoxicilina',
          dosage: '500mg',
          frequency: 'Cada 12 horas',
          duration: '7 días',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      count: 1,
    };

    // @ts-expect-error - Mock para fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMedications,
    });

    const result = await getMedicationsUseCase.execute(validTreatmentId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Amoxicilina');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('debe retornar array vacío si el tratamiento no tiene medicamentos', async () => {
    // @ts-expect-error - Mock para fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], count: 0 }),
    });

    const result = await getMedicationsUseCase.execute(validTreatmentId);

    expect(result).toHaveLength(0);
  });

  it('debe retornar array vacío si falla la petición', async () => {
    // @ts-expect-error - Mock para fetch
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await getMedicationsUseCase.execute(validTreatmentId);
    
    expect(result).toHaveLength(0);
  });

  it('debe lanzar error si el ID del tratamiento es inválido', async () => {
    await expect(getMedicationsUseCase.execute('')).rejects.toThrow('El ID del tratamiento es requerido');
  });
});