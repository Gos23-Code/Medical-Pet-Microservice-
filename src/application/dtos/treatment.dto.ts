export interface CreateTreatmentDTO {
  visitId: string;
  description: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export interface UpdateTreatmentDTO {
  startDate?: string;
  endDate?: string | null;
  notes?: string;
}

export interface TreatmentResponseDTO {
  id: string;
  visitId: string;
  description: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationFromService {
  id: string;
  treatmentId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  createdAt: string;
}

export interface IsActiveResponseDTO {
  treatmentId: string;
  isActive: boolean;
  status: 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED';
  message: string;
  checkedAt: string;
}