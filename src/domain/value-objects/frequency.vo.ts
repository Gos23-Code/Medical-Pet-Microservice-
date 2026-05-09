export class Frequency {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('La frecuencia no puede estar vacía');
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }

  equals(other: Frequency): boolean {
    if (!other) return false;
    return this._value === other.value;
  }
}