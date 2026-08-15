export interface CreateVisitDTO {
  petId: string;
  date: string;
  reason: string;
  diagnosis?: string;
  veterinarian: string;
  notes?: string;
  weight?: number;
  temperature?: number;
}

export interface UpdateVisitDTO {
  diagnosis?: string;
  notes?: string;
}

export interface VisitResponseDTO {
  id: string;
  petId: string;
  date: string;
  reason: string;
  diagnosis?: string;
  veterinarian: string;
  notes?: string;
  weight?: number;
  temperature?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentResponse {
  id: string;
  visitId: string;
  description: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  activeStatus: 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED' | null;
}