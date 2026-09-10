export interface CreateTreatmentDTO {
  visitId: string;
  description: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export interface UpdateTreatmentDTO {
  userId: string;          
  petId: string;   
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
   progress: number;
  status: 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED' | 'COMPLETED';
  daysRemaining: number | null;
  totalDays: number | null;
  elapsedDays: number;
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
  status: 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED' | 'COMPLETED';
  message: string;
  progress: number;   
  checkedAt: string;
}