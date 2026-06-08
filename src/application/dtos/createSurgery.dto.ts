export interface CreateSurgeryDTO {
  petId: string;
  veterinaryVisitId: string;
  title: string;
  description: string;
  surgeryDate: string;
  durationMinutes: number;
  anesthesiaUsed?: string;
  postOpInstructions?: string;
}