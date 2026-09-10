// src/domain/entities/vaccine.entity.ts
import { VaccineName } from '../value-objects/vaccine-name.vo';
import { NextDoseDate } from '../value-objects/next-dosage.vo';

// ✅ Definir enum de estados
export enum VaccineStatus {
  PENDING = 'PENDIENTE',
  APPLIED = 'APLICADO',
  DELAYED = 'RETRASADO'
}

export class Vaccine {
  constructor(
    public readonly id: string,
    public readonly petId: string,
    public readonly userId: string, // ✅ Se mantiene para lógica de negocio
    public readonly name: VaccineName,
    public readonly lotNumber: string | null,
    public readonly applicationDate: Date,
    public readonly nextDoseDate: NextDoseDate,
    public readonly veterinarian: string | null,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly status: VaccineStatus,
    public readonly reminderCount: number,
    public readonly lastReminderSentAt: Date | null,
  ) {}

  // Factory method para creación
  static create(
    id: string,
    petId: string,
    userId: string,
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
    const status = Vaccine.calculateStatus(nextDose);

    return new Vaccine(
      id,
      petId,
      userId,
      vaccineName,
      lotNumber ?? null,
      applicationDate,
      nextDose,
      veterinarian ?? null,
      notes ?? null,
      createdAt,
      createdAt,
      status,
      0,
      null,
    );
  }

  // ✅ Calcular estado basado en la próxima dosis
  private static calculateStatus(nextDoseDate: NextDoseDate): VaccineStatus {
    if (nextDoseDate.isDue()) {
      return VaccineStatus.DELAYED;
    }
    return VaccineStatus.PENDING;
  }

  isDue(): boolean {
    return this.nextDoseDate.isDue();
  }

  daysUntilDue(): number | null {
    return this.nextDoseDate.daysUntilDue();
  }

  // ✅ Marcar como aplicada
  markAsApplied(): Vaccine {
    if (this.status === VaccineStatus.APPLIED) {
      return this;
    }

    const newNextDoseDate = new Date(this.applicationDate);
    newNextDoseDate.setMonth(newNextDoseDate.getMonth() + 12);
    const newNextDose = NextDoseDate.create(newNextDoseDate, this.applicationDate);

    return new Vaccine(
      this.id,
      this.petId,
      this.userId,
      this.name,
      this.lotNumber,
      this.applicationDate,
      newNextDose,
      this.veterinarian,
      this.notes,
      this.createdAt,
      new Date(),
      VaccineStatus.APPLIED,
      this.reminderCount,
      this.lastReminderSentAt,
    );
  }

  // ✅ Incrementar contador de recordatorios
  incrementReminderCount(): Vaccine {
    return new Vaccine(
      this.id,
      this.petId,
      this.userId,
      this.name,
      this.lotNumber,
      this.applicationDate,
      this.nextDoseDate,
      this.veterinarian,
      this.notes,
      this.createdAt,
      new Date(),
      this.status,
      this.reminderCount + 1,
      new Date(),
    );
  }

  // ✅ Marcar como retrasado (OVERDUE)
  markAsOverdue(): Vaccine {
    if (this.status === VaccineStatus.DELAYED) {
      return this;
    }

    return new Vaccine(
      this.id,
      this.petId,
      this.userId,
      this.name,
      this.lotNumber,
      this.applicationDate,
      this.nextDoseDate,
      this.veterinarian,
      this.notes,
      this.createdAt,
      new Date(),
      VaccineStatus.DELAYED,
      this.reminderCount,
      this.lastReminderSentAt,
    );
  }

  updateNextDose(newNextDoseDate: Date | string | null): Vaccine {
    const updatedNextDose = NextDoseDate.create(newNextDoseDate, this.applicationDate);
    
    const newStatus = this.status === VaccineStatus.APPLIED 
      ? VaccineStatus.PENDING
      : Vaccine.calculateStatus(updatedNextDose);

    return new Vaccine(
      this.id,
      this.petId,
      this.userId,
      this.name,
      this.lotNumber,
      this.applicationDate,
      updatedNextDose,
      this.veterinarian,
      this.notes,
      this.createdAt,
      new Date(),
      newStatus,
      this.reminderCount,
      this.lastReminderSentAt,
    );
  }

  updateInfo(data: {
    name?: string;
    lotNumber?: string | null;
    applicationDate?: Date;
    nextDoseDate?: Date | string | null;
    veterinarian?: string | null;
    notes?: string | null;
    status?: VaccineStatus;
  }): Vaccine {
    const newName = data.name ? VaccineName.create(data.name) : this.name;
    const newLotNumber = data.lotNumber !== undefined ? data.lotNumber : this.lotNumber;
    const newAppDate = data.applicationDate ?? this.applicationDate;
    
    const newNextDose = data.nextDoseDate !== undefined 
      ? NextDoseDate.create(data.nextDoseDate, newAppDate) 
      : this.nextDoseDate;
    
    const newVet = data.veterinarian !== undefined ? data.veterinarian : this.veterinarian;
    const newNotes = data.notes !== undefined ? data.notes : this.notes;
    
    let newStatus = data.status;
    if (!newStatus) {
      newStatus = this.status === VaccineStatus.APPLIED 
        ? VaccineStatus.APPLIED 
        : Vaccine.calculateStatus(newNextDose);
    }

    return new Vaccine(
      this.id,
      this.petId,
      this.userId,
      newName,
      newLotNumber,
      newAppDate,
      newNextDose,
      newVet,
      newNotes,
      this.createdAt,
      new Date(),
      newStatus,
      this.reminderCount,
      this.lastReminderSentAt,
    );
  }

  // ✅ Getters adicionales para el estado
  get statusValue(): VaccineStatus {
    return this.status;
  }

  get isDelayed(): boolean {
    return this.status === VaccineStatus.DELAYED;
  }

  get isApplied(): boolean {
    return this.status === VaccineStatus.APPLIED;
  }

  get isPending(): boolean {
    return this.status === VaccineStatus.PENDING;
  }

  // ✅ Getters para recordatorios
  get canSendReminder(): boolean {
    return this.reminderCount < 3 && this.status !== VaccineStatus.APPLIED;
  }

  get hasMaxReminders(): boolean {
    return this.reminderCount >= 3;
  }

  // Getters existentes
  get nameValue(): string {
    return this.name.value;
  }

  get nextDoseDateValue(): Date | null {
    return this.nextDoseDate.toDate();
  }
}

// ✅ CreateVaccineData SIN userId (no se guarda en BD)
export interface CreateVaccineData {
  petId: string;
  // ❌ userId: string;  // ELIMINADO - NO SE GUARDA EN BD
  name: string;
  lotNumber: string | null;
  applicationDate: Date;
  nextDoseDate: Date | null;
  veterinarian: string | null;
  notes: string | null;
}

export type UpdateVaccineData = Partial<CreateVaccineData>;