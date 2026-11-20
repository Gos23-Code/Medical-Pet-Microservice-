import { describe, it, expect } from '@jest/globals';
import { attachCorrectedValues, collectIds, correctionsByRecord } from '../corrected-values';

describe('correcciones en las lecturas', () => {
  it('fusiona las versiones en orden y cuenta las correcciones por acto', () => {
    const map = correctionsByRecord([
      { recordId: 'a', version: 2, values: { notes: 'segunda' } },
      { recordId: 'a', version: 1, values: { lotNumber: 'L-1', notes: 'primera' } },
      { recordId: 'b', version: 1, values: { name: 'Nueva' } },
    ]);
    expect(map.get('a')).toEqual({ correctedValues: { lotNumber: 'L-1', notes: 'segunda' }, correctionCount: 2 });
    expect(map.get('b')).toEqual({ correctedValues: { name: 'Nueva' }, correctionCount: 1 });
  });

  it('un acto sin versiones recibe correctedValues vacío y correctionCount 0', () => {
    const payload = attachCorrectedValues({ id: 'x', name: 'Original' }, new Map());
    expect(payload).toEqual({ id: 'x', name: 'Original', correctedValues: {}, correctionCount: 0 });
  });

  it('la fila original no cambia: solo se agregan los campos nuevos', () => {
    const original = { id: 'a', name: 'Original' };
    const map = correctionsByRecord([{ recordId: 'a', version: 1, values: { name: 'Corregido' } }]);
    const payload = attachCorrectedValues(original, map);
    expect(original).toEqual({ id: 'a', name: 'Original' });
    expect(payload).toMatchObject({ name: 'Original', correctedValues: { name: 'Corregido' }, correctionCount: 1 });
  });

  it('funciona con listas y con respuestas { success, data }', () => {
    const map = correctionsByRecord([{ recordId: '2', version: 1, values: { notes: 'x' } }]);
    const list = attachCorrectedValues([{ id: '1' }, { id: '2' }], map) as Array<Record<string, unknown>>;
    expect(list[1]).toMatchObject({ correctionCount: 1 });
    expect(list[0]).toMatchObject({ correctionCount: 0 });

    const wrapped = attachCorrectedValues({ success: true, data: { id: '2' } }, map) as { data: Record<string, unknown> };
    expect(wrapped.data).toMatchObject({ correctedValues: { notes: 'x' } });
  });

  it('un elemento sin id no se modifica', () => {
    const item = { name: 'sin id' };
    expect(attachCorrectedValues(item, new Map())).toEqual({ name: 'sin id' });
    expect(collectIds([{ name: 'sin id' }, { id: 'ok' }])).toEqual(['ok']);
  });
});
