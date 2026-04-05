export interface VeterinaryVisitProps {
  id: string;
  petId: string;
  date: Date;
  reason: string;
  diagnosis?: string;
  veterinarian: string;
  notes?: string;
  weight?: number;
  temperature?: number;
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
  get id() { return this.props.id; }
  get petId() { return this.props.petId; }
  get date() { return this.props.date; }
  get reason() { return this.props.reason; }
  get diagnosis() { return this.props.diagnosis; }
  get veterinarian() { return this.props.veterinarian; }
  get notes() { return this.props.notes; }
  get weight() { return this.props.weight; }
  get temperature() { return this.props.temperature; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

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
      weight: this.weight,
      temperature: this.temperature,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}