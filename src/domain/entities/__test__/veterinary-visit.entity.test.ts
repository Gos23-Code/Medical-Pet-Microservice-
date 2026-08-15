import { describe, it, expect } from '@jest/globals';
import { VeterinaryVisit } from '../veterinary-visit.entity';

describe('VeterinaryVisit Entity', () => {
  const validId = '123e4567-e89b-12d3-a456-426614174000';
  const validPetId = '987e6543-e21b-12d3-a456-426614174000';
  const validDate = new Date('2024-01-01');

  describe('updateDiagnosis', () => {
    it('debe actualizar el diagnóstico', async () => {
      const visit = VeterinaryVisit.create({
        id: validId,
        petId: validPetId,
        date: validDate,
        reason: 'Consulta',
        veterinarian: 'Dr. Juan',
        diagnosis: 'Original',
        notes: undefined,
      });

      const createdAt = visit.createdAt.getTime();
      
      // Pequeña pausa para asegurar que las fechas sean diferentes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      visit.updateDiagnosis('Nuevo diagnóstico');

      expect(visit.diagnosis).toBe('Nuevo diagnóstico');
      expect(visit.updatedAt.getTime()).toBeGreaterThan(createdAt);
    });
  });
});