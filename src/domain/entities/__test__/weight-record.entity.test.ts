import { weightRecord } from '@/src/domain/entities/weight-record.entity';

describe('weightRecord Entity', () => {

  //Crea un registro
  it('Debe crear un weightRecord con los datos correctos', () => {
    const record = weightRecord.create({
      weight: 4.5,
      date: new Date('2025-05-01'),
      note: 'Control mensual',
    });

    expect(record.weight).toBe(4.5);
    expect(record.note).toBe('Control mensual');
    expect(record.createdAt).toBeInstanceOf(Date);
  });

  //Crear sin campos opcionales
  it('Debe crear un weightRecord sin date ni note', () => {
    const record = weightRecord.create({
      weight: 3.2,
    });

    expect(record.weight).toBe(3.2);
    expect(record.date).toBeUndefined();
    expect(record.note).toBeUndefined();
  });

  //"CreatedAt" se genera automáticamente
  it('Debe asignar createdAt automáticamente', () => {
    const antes = new Date();
    const record = weightRecord.create({ weight: 5.0 });
    const despues = new Date();

    expect(record.createdAt?.getTime()).toBeGreaterThanOrEqual(antes.getTime());
    expect(record.createdAt?.getTime()).toBeLessThanOrEqual(despues.getTime());
  });

});