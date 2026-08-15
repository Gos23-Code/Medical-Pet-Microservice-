export class Temperature {
  private readonly _value: number;

  constructor(value: number | undefined | null) {
    // Si no hay temperatura, no hay validación
    if (value === undefined || value === null) {
      this._value = value as never;
      return;
    }
    
    if (value < 35 || value > 42) {
      throw new Error('La temperatura debe estar entre 35°C y 42°C');
    }
    this._value = value;
  }

  get value(): number | undefined | null {
    return this._value;
  }

  equals(other: Temperature): boolean {
    return this._value === other.value;
  }
}