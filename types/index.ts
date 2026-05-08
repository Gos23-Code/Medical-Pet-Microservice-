export interface Treatment {
  id: string;
  visitId: string;
  description: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTreatmentDTO {
  visitId: string;
  description: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateTreatmentDTO {
  startDate?: string;
  endDate?: string | null;
  notes?: string;
}

// Para addMedication
export interface AddMedicationDTO {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface MedicationResponse {
  id: string;
  treatmentId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  createdAt: string;
}