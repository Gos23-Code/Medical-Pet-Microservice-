export class Dosage {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('La dosis no puede estar vacía');
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }
}