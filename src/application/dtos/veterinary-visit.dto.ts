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