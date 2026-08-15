// src/domain/value-objects/next-dose.vo.ts
export class NextDoseDate {
  private constructor(private readonly _value: Date | null) {}

  get value(): Date | null {
    return this._value ? new Date(this._value) : null;
  }

  static create(
    nextDoseDate: Date | string | null | undefined,
    applicationDate: Date
  ): NextDoseDate {
    if (nextDoseDate === null || nextDoseDate === undefined) {
      return new NextDoseDate(null);
    }

    const parsedDate = typeof nextDoseDate === 'string' 
      ? new Date(nextDoseDate) 
      : nextDoseDate;

    if (isNaN(parsedDate.getTime())) {
      throw new Error('La fecha de la próxima dosis no es válida');
    }

    // Validación: debe ser posterior a la fecha de aplicación
    parsedDate.setHours(0, 0, 0, 0);
    const appDate = new Date(applicationDate);
    appDate.setHours(0, 0, 0, 0);

    if (parsedDate <= appDate) {
      throw new Error('La próxima dosis debe ser posterior a la fecha de aplicación');
    }

    return new NextDoseDate(parsedDate);
  }

  isDue(): boolean {
    if (!this._value) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(this._value);
    date.setHours(0, 0, 0, 0);
    return date <= today;
  }

  daysUntilDue(): number | null {
    if (!this._value) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(this._value);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // ✅ Agregar método equals
  equals(other: NextDoseDate): boolean {
    if (this._value === null && other._value === null) return true;
    if (this._value === null || other._value === null) return false;
    
    const thisDate = new Date(this._value);
    const otherDate = new Date(other._value);
    thisDate.setHours(0, 0, 0, 0);
    otherDate.setHours(0, 0, 0, 0);
    
    return thisDate.getTime() === otherDate.getTime();
  }

  toDate(): Date | null {
    return this._value ? new Date(this._value) : null;
  }

  toString(): string {
    return this._value ? this._value.toISOString().split('T')[0] : '';
  }
}