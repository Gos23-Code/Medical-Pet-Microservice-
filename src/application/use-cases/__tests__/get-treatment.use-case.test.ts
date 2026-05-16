import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetTreatmentsByVisitUseCase } from '../get-treatment.use-case';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('GetTreatmentsByVisitUseCase', () => {
  let getTreatmentsByVisitUseCase: GetTreatmentsByVisitUseCase;
  let mockEq: jest.Mock;
  let mockSelect: jest.Mock;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEq = jest.fn();
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

    // @ts-expect-error - Mock para Supabase client
    mockCreateClient.mockReturnValue({ from: mockFrom });
    getTreatmentsByVisitUseCase = new GetTreatmentsByVisitUseCase();
  });

  const validVisitId = 'b111b1bc-5819-4d07-b71e-7c446c1ab63b';

  it('debe retornar tratamientos de una visita exitosamente', async () => {
    const mockTreatments = [
      {
        id: 'treatment-1',
        visit_id: validVisitId,
        description: 'Tratamiento de prueba',
        start_date: '2024-01-01',
        end_date: '2024-01-15',
        notes: 'Notas',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];
    // @ts-expect-error - Mock para respuesta de Supabase
    mockEq.mockResolvedValue({ data: mockTreatments, error: null });

    const result = await getTreatmentsByVisitUseCase.execute(validVisitId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('treatment-1');
    expect(mockFrom).toHaveBeenCalledWith('treatments');
    expect(mockEq).toHaveBeenCalledWith('visit_id', validVisitId);
  });

  it('debe retornar array vacío si no hay tratamientos', async () => {
    // @ts-expect-error - Mock para respuesta vacía
    mockEq.mockResolvedValue({ data: [], error: null });

    const result = await getTreatmentsByVisitUseCase.execute(validVisitId);

    expect(result).toHaveLength(0);
  });

  it('debe retornar array vacío si hay error en la consulta', async () => {
    // @ts-expect-error - Mock para error
    mockEq.mockResolvedValue({ data: null, error: { message: 'Error en BD' } });

    const result = await getTreatmentsByVisitUseCase.execute(validVisitId);

    expect(result).toHaveLength(0);
  });

  it('debe lanzar error si el ID de la visita es inválido', async () => {
    await expect(getTreatmentsByVisitUseCase.execute('')).rejects.toThrow('El ID de la visita es requerido');
  });
});