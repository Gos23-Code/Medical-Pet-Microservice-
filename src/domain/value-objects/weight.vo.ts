export class Weight {
  private readonly _value: number;

  constructor(value: number | undefined | null) {
    // Si no hay peso, no hay validación
    if (value === undefined || value === null) {
      this._value = value as never;
      return;
    }
    
    if (value <= 0 || value >= 200) {
      throw new Error('El peso debe estar entre 0 y 200 kg');
    }
    this._value = value;
  }

  get value(): number | undefined | null {
    return this._value;
  }

  equals(other: Weight): boolean {
    return this._value === other.value;
  }
}