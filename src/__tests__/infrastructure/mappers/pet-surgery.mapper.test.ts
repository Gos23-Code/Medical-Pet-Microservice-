// src/__tests__/infrastructure/mappers/pet-surgery.mapper.test.ts
import { PetSurgeryMapper, PetSurgeryRow } from '@/infrastructure/repositories/supabase-pet-surgery.repository';
import { PetSurgery, PetSurgeryStatus, PetSurgeryOutcome } from '@/domain/entities/petSurgery.entity';

describe('PetSurgeryMapper', () => {
  const mockCreatedAt = new Date('2024-01-01T00:00:00Z');
  const mockUpdatedAt = new Date('2024-01-02T00:00:00Z');

  const mockRow: PetSurgeryRow = {
    id: 'surgery-123',
    pet_id: 'pet-123',
    veterinary_visit_id: 'visit-123',
    title: 'Cirugía test',
    description: 'Descripción test',
    surgery_date: '2025-12-15',
    duration_minutes: 60,
    anesthesia_used: 'Isoflurano',
    complications: null,
    post_op_instructions: 'Reposo por 2 semanas',
    outcome: null,
    status: 'SCHEDULED',
    next_checkup_date: null,
    created_at: mockCreatedAt.toISOString(),
    updated_at: mockUpdatedAt.toISOString(),
  };

  describe('toDomain', () => {
    it('debe convertir una fila de base de datos a entidad PetSurgery', () => {
      const surgery = PetSurgeryMapper.toDomain(mockRow);
      
      expect(surgery).toBeInstanceOf(PetSurgery);
      expect(surgery.id).toBe(mockRow.id);
      expect(surgery.petId).toBe(mockRow.pet_id);
      expect(surgery.veterinaryVisitId).toBe(mockRow.veterinary_visit_id);
      expect(surgery.title).toBe(mockRow.title);
      expect(surgery.description).toBe(mockRow.description);
      expect(surgery.surgeryDate).toEqual(new Date(mockRow.surgery_date));
      expect(surgery.durationMinutes).toBe(mockRow.duration_minutes);
      expect(surgery.anesthesiaUsed).toBe(mockRow.anesthesia_used);
      expect(surgery.complications).toBe(mockRow.complications);
      expect(surgery.postOpInstructions).toBe(mockRow.post_op_instructions);
      expect(surgery.outcome).toBe(mockRow.outcome);
      expect(surgery.status).toBe(mockRow.status);
      expect(surgery.nextCheckupDate).toBe(mockRow.next_checkup_date);
      expect(surgery.createdAt).toEqual(mockCreatedAt);
      expect(surgery.updatedAt).toEqual(mockUpdatedAt);
    });

    it('debe manejar valores null correctamente', () => {
      const rowWithNulls: PetSurgeryRow = {
        ...mockRow,
        anesthesia_used: null,
        complications: null,
        post_op_instructions: null,
        outcome: null,
        next_checkup_date: null,
      };
      
      const surgery = PetSurgeryMapper.toDomain(rowWithNulls);
      
      expect(surgery.anesthesiaUsed).toBeNull();
      expect(surgery.complications).toBeNull();
      expect(surgery.postOpInstructions).toBeNull();
      expect(surgery.outcome).toBeNull();
      expect(surgery.nextCheckupDate).toBeNull();
    });

    it('debe lanzar error si el estado es inválido', () => {
      const invalidRow = { ...mockRow, status: 'INVALID_STATUS' };
      
      expect(() => PetSurgeryMapper.toDomain(invalidRow)).toThrow('Invalid status value: INVALID_STATUS');
    });

    it('debe lanzar error si el outcome es inválido', () => {
      const invalidRow = { ...mockRow, outcome: 'INVALID_OUTCOME' };
      
      expect(() => PetSurgeryMapper.toDomain(invalidRow)).toThrow('Invalid outcome value: INVALID_OUTCOME');
    });
  });

  describe('toPersistence', () => {
    let surgery: PetSurgery;

    beforeEach(() => {
      surgery = PetSurgery.reconstitute({
        id: mockRow.id,
        petId: mockRow.pet_id,
        veterinaryVisitId: mockRow.veterinary_visit_id,
        title: mockRow.title,
        description: mockRow.description,
        surgeryDate: new Date(mockRow.surgery_date),
        durationMinutes: mockRow.duration_minutes,
        anesthesiaUsed: mockRow.anesthesia_used,
        complications: mockRow.complications,
        postOpInstructions: mockRow.post_op_instructions,
        outcome: mockRow.outcome as PetSurgeryOutcome | null,
        status: mockRow.status as PetSurgeryStatus,
        nextCheckupDate: mockRow.next_checkup_date ? new Date(mockRow.next_checkup_date) : null,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });
    });

    it('debe convertir una entidad PetSurgery a fila de base de datos', () => {
      const row = PetSurgeryMapper.toPersistence(surgery);
      
      expect(row.id).toBe(mockRow.id);
      expect(row.pet_id).toBe(mockRow.pet_id);
      expect(row.veterinary_visit_id).toBe(mockRow.veterinary_visit_id);
      expect(row.title).toBe(mockRow.title);
      expect(row.description).toBe(mockRow.description);
      expect(row.surgery_date).toBe(mockRow.surgery_date);
      expect(row.duration_minutes).toBe(mockRow.duration_minutes);
      expect(row.anesthesia_used).toBe(mockRow.anesthesia_used);
      expect(row.complications).toBe(mockRow.complications);
      expect(row.post_op_instructions).toBe(mockRow.post_op_instructions);
      expect(row.outcome).toBe(mockRow.outcome);
      expect(row.status).toBe(mockRow.status);
      expect(row.next_checkup_date).toBe(mockRow.next_checkup_date);
      expect(row.created_at).toBe(mockCreatedAt.toISOString());
      expect(row.updated_at).toBe(mockUpdatedAt.toISOString());
    });

    it('debe manejar valores null correctamente en la conversión', () => {
      const surgeryWithNulls = PetSurgery.reconstitute({
        ...surgery.toJSON(),
        anesthesiaUsed: null,
        complications: null,
        postOpInstructions: null,
        outcome: null,
        nextCheckupDate: null,
      });
      
      const row = PetSurgeryMapper.toPersistence(surgeryWithNulls);
      
      expect(row.anesthesia_used).toBeNull();
      expect(row.complications).toBeNull();
      expect(row.post_op_instructions).toBeNull();
      expect(row.outcome).toBeNull();
      expect(row.next_checkup_date).toBeNull();
    });
  });
});