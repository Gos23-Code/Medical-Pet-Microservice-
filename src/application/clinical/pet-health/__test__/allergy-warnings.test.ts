import { describe, it, expect } from '@jest/globals';
import { allergyWarningsFor } from '../allergy-warnings';

const allergies = [
  { id: 'a1', allergen: 'Penicilina', severity: 'SEVERE' },
  { id: 'a2', allergen: 'Pollo', severity: 'MILD' },
  { id: 'a3', allergen: 'Ya', severity: 'MILD' },
];

describe('aviso de alergia al agregar medicación', () => {
  it('positivo: avisa cuando el nombre de la medicación contiene el alérgeno (sin tildes ni mayúsculas)', () => {
    expect(allergyWarningsFor('PENICILINA G procaína', allergies)).toEqual([
      { allergyId: 'a1', allergen: 'Penicilina', severity: 'SEVERE' },
    ]);
  });

  it('positivo: también avisa si el alérgeno contiene el nombre de la medicación', () => {
    expect(allergyWarningsFor('Pollo', [{ id: 'a2', allergen: 'Pollo asado', severity: 'MILD' }])).toHaveLength(1);
  });

  it('negativo: sin coincidencia no hay avisos', () => {
    expect(allergyWarningsFor('Meloxicam', allergies)).toEqual([]);
  });

  it('negativo: textos muy cortos no generan avisos falsos', () => {
    expect(allergyWarningsFor('Ya', allergies)).toEqual([]);
    expect(allergyWarningsFor('Ibu', [{ id: 'x', allergen: 'Ibuprofeno', severity: 'MILD' }])).toEqual([]);
  });
});
