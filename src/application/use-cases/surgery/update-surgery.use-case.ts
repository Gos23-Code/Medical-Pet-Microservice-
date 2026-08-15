import { 
  PetSurgery, 
  PetSurgeryOutcome, 
  PetSurgeryStatus 
} from '@/src/domain/entities/pet-surgery.entity';
import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';

export interface UpdateSurgeryCommand {
  id: string;
  title?: string;
  description?: string;
  surgeryDate?: Date;
  durationMinutes?: number;
  anesthesiaUsed?: string;
  complications?: string;
  postOpInstructions?: string;
  outcome?: PetSurgeryOutcome;
  status?: PetSurgeryStatus;
  nextCheckupDate?: Date;
}

export interface UpdateStatusCommand {
  id: string;
  status: PetSurgeryStatus;
  outcome?: PetSurgeryOutcome;
}

export class UpdateSurgeryUseCase {
  constructor(private readonly repository: PetSurgeryRepository) {}

  // Método principal para actualizar cualquier campo
  async execute(command: UpdateSurgeryCommand): Promise<PetSurgery> {
    // Validar ID
    if (!command.id || command.id.trim().length === 0) {
      throw new Error('Surgery ID is required');
    }

    // Buscar la cirugía existente
    const surgery = await this.repository.findById(command.id);
    
    if (!surgery) {
      throw new Error(`Surgery with id ${command.id} not found`);
    }
    
    // Validar los campos a actualizar
    this.validateUpdate(command, surgery);
    
    // Validar transiciones de estado específicamente
    if (command.status) {
      this.validateStatusTransition(surgery.status, command.status, command.outcome);
    }
    
    // Actualizar la entidad
    surgery.update({
      title: command.title,
      description: command.description,
      surgeryDate: command.surgeryDate,
      durationMinutes: command.durationMinutes,
      anesthesiaUsed: command.anesthesiaUsed,
      complications: command.complications,
      postOpInstructions: command.postOpInstructions,
      outcome: command.outcome,
      status: command.status,
      nextCheckupDate: command.nextCheckupDate,
    });
    
    // Guardar cambios
    await this.repository.update(surgery);
    
    return surgery;
  }

  // Método específico para actualizar solo el estado (más conveniente)
  async updateStatus(command: UpdateStatusCommand): Promise<PetSurgery> {
    // Validar ID
    if (!command.id || command.id.trim().length === 0) {
      throw new Error('Surgery ID is required');
    }

    // Validar estado
    if (!command.status) {
      throw new Error('Status is required');
    }

    // Buscar la cirugía existente
    const surgery = await this.repository.findById(command.id);
    
    if (!surgery) {
      throw new Error(`Surgery with id ${command.id} not found`);
    }
    
    // Validar transición de estado
    this.validateStatusTransition(surgery.status, command.status, command.outcome);
    
    // Si se está completando, validar que tenga outcome
    if (command.status === 'COMPLETED' && !command.outcome && !surgery.outcome) {
      throw new Error('Cannot complete surgery without specifying outcome');
    }
    
    // Actualizar solo el estado y opcionalmente el outcome
    surgery.update({ 
      status: command.status,
      outcome: command.outcome || surgery.outcome
    });
    
    // Guardar cambios
    await this.repository.update(surgery);
    
    return surgery;
  }

  // Método para iniciar una cirugía (SCHEDULED -> IN_PROGRESS)
  async startSurgery(id: string): Promise<PetSurgery> {
    return this.updateStatus({
      id,
      status: 'IN_PROGRESS'
    });
  }

  // Método para completar una cirugía exitosamente
  async completeSurgerySuccessfully(id: string): Promise<PetSurgery> {
    return this.updateStatus({
      id,
      status: 'COMPLETED',
      outcome: 'SUCCESSFUL'
    });
  }

  // Método para completar una cirugía con complicaciones
  async completeSurgeryWithComplications(id: string, complications: string): Promise<PetSurgery> {
    // Primero marcar como complicada
    const surgery = await this.updateStatus({
      id,
      status: 'COMPLICATED'
    });
    
    // Luego actualizar las complicaciones
    surgery.update({ complications });
    await this.repository.update(surgery);
    
    // Finalmente completar
    return this.updateStatus({
      id,
      status: 'COMPLETED',
      outcome: 'COMPLICATIONS'
    });
  }

  // Método para cancelar una cirugía
  async cancelSurgery(id: string, reason?: string): Promise<PetSurgery> {
    const surgery = await this.updateStatus({
      id,
      status: 'CANCELLED'
    });
    
    if (reason) {
      surgery.update({ complications: reason });
      await this.repository.update(surgery);
    }
    
    return surgery;
  }

  // Validación general de campos
  private validateUpdate(command: UpdateSurgeryCommand, currentSurgery: PetSurgery): void {
    // Validar título
    if (command.title !== undefined && command.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    
    // Validar descripción
    if (command.description !== undefined && command.description.trim().length === 0) {
      throw new Error('Description cannot be empty');
    }
    
    // Validar duración
    if (command.durationMinutes !== undefined) {
      if (command.durationMinutes <= 0) {
        throw new Error('Duration must be greater than 0');
      }
      if (command.durationMinutes > 480) {
        throw new Error('Duration cannot exceed 480 minutes (8 hours)');
      }
    }
    
    // Validar fecha de cirugía
    if (command.surgeryDate !== undefined && command.surgeryDate < new Date()) {
      throw new Error('Surgery date cannot be in the past');
    }
    
    // Validar que si se actualiza el estado, no haya conflictos
    if (command.status && command.status === 'COMPLETED' && !command.outcome && !currentSurgery.outcome) {
      throw new Error('Cannot update to COMPLETED without specifying outcome');
    }
  }

  // Validación de transiciones de estado
  private validateStatusTransition(
    currentStatus: PetSurgeryStatus, 
    newStatus: PetSurgeryStatus,
    outcome?: PetSurgeryOutcome
  ): void {
    // Definir transiciones válidas
    const validTransitions: Record<PetSurgeryStatus, PetSurgeryStatus[]> = {
      'SCHEDULED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'COMPLICATED', 'CANCELLED'],
      'COMPLETED': [],
      'COMPLICATED': ['COMPLETED'],
      'CANCELLED': []
    };

    // Verificar si la transición es válida
    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Validaciones específicas por estado
    switch (newStatus) {
      case 'COMPLETED':
        if (!outcome) {
          throw new Error('Outcome is required when completing a surgery');
        }
        break;
      case 'IN_PROGRESS':
        if (currentStatus !== 'SCHEDULED') {
          throw new Error('Only scheduled surgeries can be started');
        }
        break;
      case 'CANCELLED':
        if (currentStatus === 'COMPLETED') {
          throw new Error('Cannot cancel a completed surgery');
        }
        break;
    }
  }
}