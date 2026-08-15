import { PetSurgeryOutcome, PetSurgeryStatus } from '@/src/domain/entities/pet-surgery.entity';

export interface UpdateSurgeryDTO {
  title?: string;
  description?: string;
  surgeryDate?: string;
  durationMinutes?: number;
  anesthesiaUsed?: string;
  complications?: string;
  postOpInstructions?: string;
  outcome?: PetSurgeryOutcome;
  status?: PetSurgeryStatus;
  nextCheckupDate?: string;
}