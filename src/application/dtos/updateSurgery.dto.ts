import { PetSurgeryOutcome, PetSurgeryStatus } from '../../domain/entities/petSurgery.entity';

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