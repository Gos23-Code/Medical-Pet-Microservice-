export interface UpdateMedicationDTO {
  dosage?: string;
  frequency?: string;
  userId: string;
  petId: string;
}

export interface MedicationResponseDTO {
  id: string;
  treatmentId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  createdAt: string;
  updatedAt: string;
}