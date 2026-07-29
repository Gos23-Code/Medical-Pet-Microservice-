import { Dosage } from '../value-objects/dosage.vo';
import { Frequency } from '../value-objects/frequency.vo';

export interface MedicationProps {
  id: string;
  treatmentId: string;
  name: string;
  dosage: Dosage;
  frequency: Frequency;
  duration: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Medication {
  private constructor(private props: MedicationProps) {}

  static reconstitute(props: MedicationProps): Medication {
    return new Medication(props);
  }

  get id(): string { return this.props.id; }
  get treatmentId(): string { return this.props.treatmentId; }
  get name(): string { return this.props.name; }
  get dosage(): Dosage { return this.props.dosage; }
  get frequency(): Frequency { return this.props.frequency; }
  get duration(): string { return this.props.duration; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Métodos de negocio
  updateDosage(newDosage: string): void {
    this.props.dosage = new Dosage(newDosage);
    this.props.updatedAt = new Date();
  }

  updateFrequency(newFrequency: string): void {
    this.props.frequency = new Frequency(newFrequency);
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      treatmentId: this.treatmentId,
      name: this.name,
      dosage: this.dosage.value,
      frequency: this.frequency.value,
      duration: this.duration,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}