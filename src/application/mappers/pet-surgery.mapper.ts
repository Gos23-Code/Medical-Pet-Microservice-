import { 
  PetSurgery, 
  PetSurgeryStatus, 
  PetSurgeryOutcome 
} from '@/src/domain/entities/pet-surgery.entity';

// Constantes centralizadas para validación
const VALID_STATUSES: PetSurgeryStatus[] = [
  'SCHEDULED', 
  'IN_PROGRESS', 
  'COMPLETED', 
  'COMPLICATED', 
  'CANCELLED'
];

const VALID_OUTCOMES: PetSurgeryOutcome[] = [
  'SUCCESSFUL', 
  'COMPLICATIONS', 
  'DECEASED'
];

export interface PetSurgeryRow {
  id: string;
  pet_id: string;
  veterinary_visit_id: string;
  title: string;
  description: string;
  surgery_date: string;
  duration_minutes: number;
  anesthesia_used?: string | null;
  complications?: string | null;
  post_op_instructions?: string | null;
  outcome?: string | null;
  status: string;
  next_checkup_date?: string | null;
  created_at: string;
  updated_at: string;
}

export class PetSurgeryMapper {
  private static isValidStatus(status: string): status is PetSurgeryStatus {
    return VALID_STATUSES.includes(status as PetSurgeryStatus);
  }

  private static isValidOutcome(outcome: string | null | undefined): outcome is PetSurgeryOutcome {
    if (!outcome) return false;
    return VALID_OUTCOMES.includes(outcome as PetSurgeryOutcome);
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  static toDomain(row: PetSurgeryRow): PetSurgery {
    if (!this.isValidStatus(row.status)) {
      throw new Error(`Invalid status value: ${row.status}. Expected one of: ${VALID_STATUSES.join(', ')}`);
    }

    return PetSurgery.reconstitute({
      id: row.id,
      petId: row.pet_id,
      veterinaryVisitId: row.veterinary_visit_id,
      title: row.title,
      description: row.description,
      surgeryDate: new Date(row.surgery_date),
      durationMinutes: row.duration_minutes,
      anesthesiaUsed: row.anesthesia_used ?? null,
      complications: row.complications ?? null,
      postOpInstructions: row.post_op_instructions ?? null,
      outcome: this.isValidOutcome(row.outcome) ? row.outcome : null,
      status: row.status as PetSurgeryStatus,
      nextCheckupDate: row.next_checkup_date ? new Date(row.next_checkup_date) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  static toPersistence(surgery: PetSurgery): PetSurgeryRow {
    const props = surgery.toJSON();
    return {
      id: props.id,
      pet_id: props.petId,
      veterinary_visit_id: props.veterinaryVisitId,
      title: props.title,
      description: props.description,
      surgery_date: this.formatDate(props.surgeryDate),
      duration_minutes: props.durationMinutes,
      anesthesia_used: props.anesthesiaUsed ?? null,
      complications: props.complications ?? null,
      post_op_instructions: props.postOpInstructions ?? null,
      outcome: props.outcome ?? null,
      status: props.status,
      next_checkup_date: props.nextCheckupDate ? this.formatDate(props.nextCheckupDate) : null,
      created_at: props.createdAt.toISOString(),
      updated_at: props.updatedAt.toISOString(),
    };
  }

  // Método para actualización parcial (solo campos que cambiaron)
  static toPartialPersistence(surgery: PetSurgery): Partial<PetSurgeryRow> {
    const props = surgery.toJSON();
    const partial: Partial<PetSurgeryRow> = {
      updated_at: new Date().toISOString(), // Siempre actualizar el timestamp
    };
    
    // Solo incluir campos que tienen valor (no son undefined)
    if (props.title !== undefined) partial.title = props.title;
    if (props.description !== undefined) partial.description = props.description;
    if (props.surgeryDate !== undefined) partial.surgery_date = this.formatDate(props.surgeryDate);
    if (props.durationMinutes !== undefined) partial.duration_minutes = props.durationMinutes;
    if (props.anesthesiaUsed !== undefined) partial.anesthesia_used = props.anesthesiaUsed ?? null;
    if (props.complications !== undefined) partial.complications = props.complications ?? null;
    if (props.postOpInstructions !== undefined) partial.post_op_instructions = props.postOpInstructions ?? null;
    if (props.outcome !== undefined) partial.outcome = props.outcome ?? null;
    if (props.status !== undefined) partial.status = props.status;
    if (props.nextCheckupDate !== undefined) {
      partial.next_checkup_date = props.nextCheckupDate ? this.formatDate(props.nextCheckupDate) : null;
    }
    
    return partial;
  }
}