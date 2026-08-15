import { LabTest } from '@/src/domain/entities/lab-test.entity';

describe('LabTest Entity', () => {
  const mockProps = {
    id: '123',
    visit_id: 'vis-456',
    name: 'Glucosa',
    result: '95',
    normal_range: '70-100',
    date: new Date('2026-07-29'),
    notes: 'Test en ayunas'
  };

  describe('create', () => {
    it('should create a new LabTest with current date', () => {
      const { id, visit_id, name, result, normal_range, date, notes } = mockProps;
      const labTest = LabTest.create({
        id,
        visit_id,
        name,
        result,
        normal_range,
        date,
        notes
      });

      expect(labTest).toBeInstanceOf(LabTest);
      expect(labTest.id).toBe(id);
      expect(labTest.visit_id).toBe(visit_id);
      expect(labTest.name).toBe(name);
      expect(labTest.result).toBe(result);
      expect(labTest.normal_range).toBe(normal_range);
      expect(labTest.date).toBe(date);
      expect(labTest.notes).toBe(notes);
      expect(labTest.created_at).toBeInstanceOf(Date);
    });

    it('should create LabTest with optional fields undefined', () => {
      const labTest = LabTest.create({
        id: '123',
        visit_id: 'vis-456',
        name: 'Glucosa'
      });

      expect(labTest.id).toBe('123');
      expect(labTest.visit_id).toBe('vis-456');
      expect(labTest.name).toBe('Glucosa');
      expect(labTest.result).toBeUndefined();
      expect(labTest.normal_range).toBeUndefined();
      expect(labTest.date).toBeUndefined();
      expect(labTest.notes).toBeUndefined();
      expect(labTest.created_at).toBeInstanceOf(Date);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a LabTest from stored props', () => {
      const fullProps = {
        ...mockProps,
        created_at: new Date('2026-07-29T10:00:00Z')
      };
      
      const labTest = LabTest.reconstitute(fullProps);

      expect(labTest).toBeInstanceOf(LabTest);
      expect(labTest.id).toBe(fullProps.id);
      expect(labTest.visit_id).toBe(fullProps.visit_id);
      expect(labTest.name).toBe(fullProps.name);
      expect(labTest.result).toBe(fullProps.result);
      expect(labTest.normal_range).toBe(fullProps.normal_range);
      expect(labTest.date).toBe(fullProps.date);
      expect(labTest.notes).toBe(fullProps.notes);
      expect(labTest.created_at).toBe(fullProps.created_at);
    });

    it('should reconstitute LabTest with minimal props', () => {
      const minimalProps = {
        id: '123',
        visit_id: 'vis-456',
        name: 'Glucosa',
        created_at: new Date()
      };

      const labTest = LabTest.reconstitute(minimalProps);
      expect(labTest).toBeInstanceOf(LabTest);
      expect(labTest.id).toBe('123');
      expect(labTest.visit_id).toBe('vis-456');
      expect(labTest.name).toBe('Glucosa');
      expect(labTest.result).toBeUndefined();
    });
  });

  describe('Getters', () => {
    it('should return all properties correctly', () => {
      const props = {
        ...mockProps,
        created_at: new Date()
      };
      
      const labTest = LabTest.reconstitute(props);

      expect(labTest.id).toBe(props.id);
      expect(labTest.visit_id).toBe(props.visit_id);
      expect(labTest.name).toBe(props.name);
      expect(labTest.result).toBe(props.result);
      expect(labTest.normal_range).toBe(props.normal_range);
      expect(labTest.date).toBe(props.date);
      expect(labTest.notes).toBe(props.notes);
      expect(labTest.created_at).toBe(props.created_at);
    });
  });
});