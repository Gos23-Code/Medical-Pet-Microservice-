// src/domain/entities/vaccine.entity.ts
import { VaccineName } from '../value-objects/vaccine-name.vo';
import { NextDoseDate } from '../value-objects/next-dosage.vo';

export class Vaccine {
  constructor(
    public readonly id: string,
    public readonly petId: string,
    public readonly name: VaccineName,
    public readonly lotNumber: string | null, // Simple string, sin VO
    public readonly applicationDate: Date, // Simple Date, sin VO
    public readonly nextDoseDate: NextDoseDate, // Con VO por su lógica
    public readonly veterinarian: string | null, // Simple string
    public readonly notes: string | null, // Simple string
    public readonly createdAt: Date
  ) {}

  // Factory method para creación
  static create(
    id: string,
    petId: string,
    name: string,
    lotNumber: string | null | undefined,
    applicationDate: Date,
    nextDoseDate: Date | string | null | undefined,
    veterinarian: string | null | undefined,
    notes: string | null | undefined,
    createdAt: Date
  ): Vaccine {
    const vaccineName = VaccineName.create(name);
    const nextDose = NextDoseDate.create(nextDoseDate, applicationDate);

    return new Vaccine(
      id,
      petId,
      vaccineName,
      lotNumber ?? null,
      applicationDate,
      nextDose,
      veterinarian ?? null,
      notes ?? null,
      createdAt
    );
  }

  isDue(): boolean {
    return this.nextDoseDate.isDue();
  }

  daysUntilDue(): number | null {
    return this.nextDoseDate.daysUntilDue();
  }

  updateNextDose(newNextDoseDate: Date | string | null): Vaccine {
    const updatedNextDose = NextDoseDate.create(newNextDoseDate, this.applicationDate);
    
    return new Vaccine(
      this.id,
      this.petId,
      this.name,
      this.lotNumber,
      this.applicationDate,
      updatedNextDose,
      this.veterinarian,
      this.notes,
      this.createdAt
    );
  }

  updateInfo(data: {
    name?: string;
    lotNumber?: string | null;
    applicationDate?: Date;
    nextDoseDate?: Date | string | null;
    veterinarian?: string | null;
    notes?: string | null;
  }): Vaccine {
    const newName = data.name ? VaccineName.create(data.name) : this.name;
    const newLotNumber = data.lotNumber !== undefined ? data.lotNumber : this.lotNumber;
    const newAppDate = data.applicationDate ?? this.applicationDate;
    
    const newNextDose = data.nextDoseDate !== undefined 
      ? NextDoseDate.create(data.nextDoseDate, newAppDate) 
      : this.nextDoseDate;
    
    const newVet = data.veterinarian !== undefined ? data.veterinarian : this.veterinarian;
    const newNotes = data.notes !== undefined ? data.notes : this.notes;

    return new Vaccine(
      this.id,
      this.petId,
      newName,
      newLotNumber,
      newAppDate,
      newNextDose,
      newVet,
      newNotes,
      this.createdAt
    );
  }

  // Getters para acceder a valores primitivos
  get nameValue(): string {
    return this.name.value;
  }

  get nextDoseDateValue(): Date | null {
    return this.nextDoseDate.toDate();
  }
}

// Tipos para datos
export interface CreateVaccineData {
  petId: string;
  name: string;
  lotNumber: string | null;
  applicationDate: Date;
  nextDoseDate: Date | null;
  veterinarian: string | null;
  notes: string | null;
}

export type UpdateVaccineData = Partial<CreateVaccineData>;