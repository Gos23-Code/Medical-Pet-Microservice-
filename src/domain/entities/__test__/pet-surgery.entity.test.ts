// src/domain/entities/__test__/pet-surgery.entity.test.ts
import { PetSurgery, PetSurgeryStatus, PetSurgeryOutcome } from '../pet-surgery.entity';

// Mock de crypto.randomUUID directamente en el test
beforeAll(() => {
  // Mock de crypto.randomUUID
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-1234-5678-90ab-cdef',
    },
    configurable: true,
    writable: true,
  });
});

describe('PetSurgery Entity', () => {
  const validProps = {
    petId: '123e4567-e89b-12d3-a456-426614174000',
    veterinaryVisitId: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Cirugía de rodilla',
    description: 'Reparación de ligamento cruzado anterior',
    surgeryDate: new Date('2026-12-15T10:00:00Z'),
    durationMinutes: 90,
    status: 'SCHEDULED' as PetSurgeryStatus,
  };

  describe('create', () => {
    it('debe crear una nueva cirugía con ID único', () => {
      const surgery = PetSurgery.create(validProps);
      
      expect(surgery).toBeDefined();
      expect(surgery.id).toBeDefined();
      expect(surgery.id).toBe('test-uuid-1234-5678-90ab-cdef');
      expect(surgery.petId).toBe(validProps.petId);
      expect(surgery.veterinaryVisitId).toBe(validProps.veterinaryVisitId);
      expect(surgery.title).toBe(validProps.title);
      expect(surgery.description).toBe(validProps.description);
      expect(surgery.surgeryDate).toEqual(validProps.surgeryDate);
      expect(surgery.durationMinutes).toBe(validProps.durationMinutes);
      expect(surgery.status).toBe('SCHEDULED');
    });

    it('debe crear una cirugía con createdAt y updatedAt como fechas', () => {
      const surgery = PetSurgery.create(validProps);
      
      expect(surgery.createdAt).toBeInstanceOf(Date);
      expect(surgery.updatedAt).toBeInstanceOf(Date);
      expect(surgery.createdAt).toEqual(surgery.updatedAt);
    });

    it('debe crear una cirugía con campos opcionales undefined', () => {
      const minimalProps = {
        petId: 'pet-123',
        veterinaryVisitId: 'visit-123',
        title: 'Cirugía mínima',
        description: 'Descripción mínima',
        surgeryDate: new Date('2026-12-15'),
        durationMinutes: 30,
        status: 'SCHEDULED' as PetSurgeryStatus,
      };
      
      const surgery = PetSurgery.create(minimalProps);
      
      expect(surgery.anesthesiaUsed).toBeUndefined();
      expect(surgery.complications).toBeUndefined();
      expect(surgery.postOpInstructions).toBeUndefined();
      expect(surgery.outcome).toBeUndefined();
      expect(surgery.nextCheckupDate).toBeUndefined();
    });
  });

  describe('reconstitute', () => {
    it('debe reconstituir una cirugía existente con todos los campos', () => {
      const existingProps = {
        id: 'existing-id-123',
        ...validProps,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        outcome: 'SUCCESSFUL' as PetSurgeryOutcome,
        nextCheckupDate: new Date('2026-12-30T00:00:00Z'),
      };
      
      const surgery = PetSurgery.reconstitute(existingProps);
      
      expect(surgery.id).toBe('existing-id-123');
      expect(surgery.createdAt).toEqual(existingProps.createdAt);
      expect(surgery.updatedAt).toEqual(existingProps.updatedAt);
      expect(surgery.outcome).toBe('SUCCESSFUL');
      expect(surgery.nextCheckupDate).toEqual(existingProps.nextCheckupDate);
    });
  });

  describe('update', () => {
    let surgery: PetSurgery;

    beforeEach(() => {
      surgery = PetSurgery.create(validProps);
    });

    it('debe actualizar el título', async () => {
      const newTitle = 'Nuevo título de cirugía';
      const oldUpdatedAt = surgery.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 1));
      surgery.update({ title: newTitle });
      
      expect(surgery.title).toBe(newTitle);
      expect(surgery.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });

    it('debe actualizar la descripción', () => {
      const newDescription = 'Nueva descripción detallada';
      surgery.update({ description: newDescription });
      
      expect(surgery.description).toBe(newDescription);
    });

    it('debe actualizar el estado', () => {
      surgery.update({ status: 'IN_PROGRESS' });
      
      expect(surgery.status).toBe('IN_PROGRESS');
    });

    it('debe actualizar múltiples campos a la vez', () => {
      surgery.update({
        title: 'Título actualizado',
        description: 'Descripción actualizada',
        durationMinutes: 120,
        status: 'IN_PROGRESS',
      });
      
      expect(surgery.title).toBe('Título actualizado');
      expect(surgery.description).toBe('Descripción actualizada');
      expect(surgery.durationMinutes).toBe(120);
      expect(surgery.status).toBe('IN_PROGRESS');
    });

    it('debe actualizar la fecha de modificación', async () => {
      const originalUpdatedAt = surgery.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      surgery.update({ title: 'Nuevo título' });
      
      expect(surgery.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('debe ignorar campos undefined en la actualización', () => {
      const originalTitle = surgery.title;
      surgery.update({ title: undefined });
      
      expect(surgery.title).toBe(originalTitle);
    });
  });

  describe('toJSON', () => {
    it('debe retornar un objeto plano con todas las propiedades', () => {
      const surgery = PetSurgery.create(validProps);
      const json = surgery.toJSON();
      
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('petId');
      expect(json).toHaveProperty('veterinaryVisitId');
      expect(json).toHaveProperty('title');
      expect(json).toHaveProperty('description');
      expect(json).toHaveProperty('surgeryDate');
      expect(json).toHaveProperty('durationMinutes');
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });

    it('debe incluir campos opcionales cuando existen', () => {
      const surgery = PetSurgery.create({
        ...validProps,
        anesthesiaUsed: 'Isoflurano',
        postOpInstructions: 'Reposo por 2 semanas',
      });
      const json = surgery.toJSON();
      
      expect(json.anesthesiaUsed).toBe('Isoflurano');
      expect(json.postOpInstructions).toBe('Reposo por 2 semanas');
    });
  });

  describe('getters', () => {
    let surgery: PetSurgery;

    beforeEach(() => {
      surgery = PetSurgery.create(validProps);
    });

    it('debe retornar todas las propiedades correctamente', () => {
      expect(surgery.id).toBeDefined();
      expect(surgery.petId).toBe(validProps.petId);
      expect(surgery.veterinaryVisitId).toBe(validProps.veterinaryVisitId);
      expect(surgery.title).toBe(validProps.title);
      expect(surgery.description).toBe(validProps.description);
      expect(surgery.surgeryDate).toEqual(validProps.surgeryDate);
      expect(surgery.durationMinutes).toBe(validProps.durationMinutes);
      expect(surgery.status).toBe(validProps.status);
    });

    it('debe retornar undefined para campos opcionales no definidos', () => {
      expect(surgery.anesthesiaUsed).toBeUndefined();
      expect(surgery.complications).toBeUndefined();
      expect(surgery.outcome).toBeUndefined();
    });
  });

  describe('validaciones de tipos', () => {
    it('debe aceptar todos los estados válidos', () => {
      const statuses: PetSurgeryStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'COMPLICATED', 'CANCELLED'];
      
      statuses.forEach(status => {
        const surgery = PetSurgery.create({ ...validProps, status });
        expect(surgery.status).toBe(status);
      });
    });

    it('debe aceptar todos los outcomes válidos', () => {
      const outcomes: PetSurgeryOutcome[] = ['SUCCESSFUL', 'COMPLICATIONS', 'DECEASED'];
      
      outcomes.forEach(outcome => {
        const surgery = PetSurgery.create({ ...validProps, status: 'COMPLETED', outcome });
        expect(surgery.outcome).toBe(outcome);
      });
    });
  });
});