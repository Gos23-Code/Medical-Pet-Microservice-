import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';
import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';

export interface AddSurgeryCommand {
  petId: string;
  veterinaryVisitId: string;
  title: string;
  description: string;
  surgeryDate: Date;
  durationMinutes: number;
  anesthesiaUsed?: string;
  postOpInstructions?: string;
}

export class AddSurgeryUseCase {
  constructor(private readonly repository: PetSurgeryRepository) {}

  async execute(command: AddSurgeryCommand): Promise<PetSurgery> {
    // Validaciones
    this.validateCommand(command);

    // Crear la entidad
    const surgery = PetSurgery.create({
      petId: command.petId,
      veterinaryVisitId: command.veterinaryVisitId,
      title: command.title,
      description: command.description,
      surgeryDate: command.surgeryDate,
      durationMinutes: command.durationMinutes,
      anesthesiaUsed: command.anesthesiaUsed,
      postOpInstructions: command.postOpInstructions,
      status: 'SCHEDULED',
    });

    // Guardar en repositorio
    await this.repository.save(surgery);
    
    return surgery;
  }

  private validateCommand(command: AddSurgeryCommand): void {
    if (!command.petId) {
      throw new Error('Pet ID is required');
    }
    if (!command.veterinaryVisitId) {
      throw new Error('Veterinary visit ID is required');
    }
    if (!command.title || command.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (!command.description || command.description.trim().length === 0) {
      throw new Error('Description is required');
    }
    if (!command.surgeryDate) {
      throw new Error('Surgery date is required');
    }
    if (!command.durationMinutes || command.durationMinutes <= 0) {
      throw new Error('Duration must be greater than 0');
    }
    if (command.durationMinutes > 480) {
      throw new Error('Duration cannot exceed 480 minutes (8 hours)');
    }
  }
}