// src/domain/value-objects/vaccine-name.vo.ts
export class VaccineName {
  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value;
  }

  static create(name: string): VaccineName {
    if (!name || name.trim().length === 0) {
      throw new Error('El nombre de la vacuna es requerido');
    }

    if (name.length > 100) {
      throw new Error('El nombre de la vacuna no puede exceder los 100 caracteres');
    }

    const normalizedName = name.trim().replace(/\s+/g, ' ');
    return new VaccineName(normalizedName);
  }

  equals(other: VaccineName): boolean {
    return this._value === other._value;
  }
}