// src/application/dtos/vaccine.dto.ts
export interface CreateVaccineDTO {
  petId: string;
  name: string;
  lotNumber?: string;
  applicationDate: Date;
  nextDoseDate?: Date | null;
  veterinarian?: string;
  notes?: string;
}

export interface UpdateVaccineDTO {
  id: string;
  petId?: string;
  name?: string;
  lotNumber?: string | null;
  applicationDate?: Date;
  nextDoseDate?: Date | null;
  veterinarian?: string | null;
  notes?: string | null;
}

export interface UpdateNextDoseDTO {
  id: string;
  nextDoseDate: Date | null;
}

export interface VaccineResponseDTO {
  id: string;
  petId: string;
  name: string;
  lotNumber: string | null;
  applicationDate: Date;
  nextDoseDate: Date | null;
  veterinarian: string | null;
  notes: string | null;
  createdAt: Date;
  isDue: boolean;
  daysUntilDue: number | null;
}