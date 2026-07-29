import { Weight } from '../value-objects/weight.vo';
import { Temperature } from '../value-objects/temperature.vo';

export interface VeterinaryVisitProps {
  id: string;
  petId: string;
  date: Date;
  reason: string;
  diagnosis?: string;
  veterinarian: string;
  notes?: string;
  weight?: Weight;
  temperature?: Temperature;
  createdAt: Date;
  updatedAt: Date;
}

export class VeterinaryVisit {
  private constructor(private props: VeterinaryVisitProps) {}

  static create(props: Omit<VeterinaryVisitProps, 'createdAt' | 'updatedAt'>): VeterinaryVisit {
    return new VeterinaryVisit({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: VeterinaryVisitProps): VeterinaryVisit {
    return new VeterinaryVisit(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get petId(): string { return this.props.petId; }
  get date(): Date { return this.props.date; }
  get reason(): string { return this.props.reason; }
  get diagnosis(): string | undefined { return this.props.diagnosis; }
  get veterinarian(): string { return this.props.veterinarian; }
  get notes(): string | undefined { return this.props.notes; }
  get weight(): Weight | undefined { return this.props.weight; }
  get temperature(): Temperature | undefined { return this.props.temperature; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Métodos de negocio
  updateDiagnosis(diagnosis: string): void {
    if (!diagnosis || diagnosis.trim().length === 0) {
      throw new Error('El diagnóstico no puede estar vacío');
    }
    this.props.diagnosis = diagnosis;
    this.props.updatedAt = new Date();
  }

  updateNotes(notes: string): void {
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      petId: this.petId,
      date: this.date.toISOString().split('T')[0],
      reason: this.reason,
      diagnosis: this.diagnosis,
      veterinarian: this.veterinarian,
      notes: this.notes,
      weight: this.weight?.value,
      temperature: this.temperature?.value,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}