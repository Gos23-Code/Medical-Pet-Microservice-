export interface AddMedicationDTO {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface MedicationResponseDTO {
  id: string;
  treatmentId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  createdAt: string;
}