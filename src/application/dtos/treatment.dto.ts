export interface CreateTreatmentDTO {
  visitId: string;
  description: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface TreatmentResponseDTO {
  id: string;
  visitId: string;
  description: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}