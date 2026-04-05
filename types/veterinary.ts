export interface VeterinaryVisit {
  id: string;
  pet_id: string;
  date: string;
  reason: string;
  diagnosis?: string;
  veterinarian: string;
  notes?: string;
  weight?: number;
  temperature?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVisitDTO {
  pet_id: string;
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